// =============================================================
// walletAnalytics.service.js
// -------------------------------------------------------------
// LAYER: SERVICE
// Menghitung metrik trading per wallet (ROI, win rate, rata-rata
// waktu holding, riwayat profit kumulatif) dari transaksi buy/sell
// yang tersimpan di tabel transactions.
//
// METODE PENCOCOKAN BUY <-> SELL: FIFO (First In First Out)
// Kenapa FIFO? Karena ini metode paling umum & paling mudah
// dijelaskan untuk akuntansi trading: token yang paling DULU
// dibeli dianggap yang paling DULU dijual. Setiap kali ada sell,
// kita "makan" dari antrian buy paling lama untuk token tersebut.
//
// SATU "closed trade" = satu kali sell berhasil mencocokkan
// dengan satu atau lebih buy sebelumnya. Profit dihitung dari
// selisih harga jual dan harga beli (rata-rata tertimbang kalau
// sell memakan lebih dari satu buy).
//
// KETERBATASAN YANG PERLU DIKETAHUI (bukan bug, tapi trade-off
// desain untuk proyek belajar):
// - Kalau wallet menjual LEBIH BANYAK token daripada yang tercatat
//   dibeli (misal token diperoleh dari airdrop atau transfer,
//   bukan dari sync sebelumnya), sisa jual itu diabaikan dari
//   perhitungan karena tidak ada cost basis untuk dibandingkan.
// - Harga USD berasal dari harga real-time saat sync (lihat
//   priceService.js), bukan harga historis persis pada saat itu.
// =============================================================

import { findTradingTransactionsByWallet, findAllTransactionsByWallet } from '../models/transaction.model.js';
import { findAllWatchedWallets, findWatchedWalletByAddress } from '../models/watchedWallet.model.js';

/**
 * Dari daftar transaksi trading SATU wallet (sudah terurut
 * kronologis ASC), hitung seluruh closed trades per token
 * memakai metode FIFO.
 *
 * @param {Array} transactions - hasil findTradingTransactionsByWallet
 * @returns {Array<{ token, profitUsd, blockTime }>} daftar closed trade
 */
function computeClosedTrades(transactions) {
  // Antrian buy per token: token -> array of { amount, priceUsd }
  const buyQueues = {};
  const closedTrades = [];

  for (const tx of transactions) {
    const token = tx.token;
    const amount = parseFloat(tx.amount);
    const price = parseFloat(tx.price_usd);

    if (tx.type === 'buy') {
      if (!buyQueues[token]) buyQueues[token] = [];
      buyQueues[token].push({ amount, priceUsd: price });
      continue;
    }

    if (tx.type === 'sell') {
      const queue = buyQueues[token];
      if (!queue || queue.length === 0) {
        // Menjual token yang tidak ada cost basis-nya (lihat
        // catatan keterbatasan di atas) -> lewati, tidak bisa
        // dihitung sebagai closed trade yang valid.
        continue;
      }

      let remainingToSell = amount;
      let costBasisTotal = 0;
      let amountMatched = 0;

      // Makan dari antrian buy paling lama (FIFO) sampai jumlah
      // yang dijual terpenuhi, atau antrian buy habis.
      while (remainingToSell > 0 && queue.length > 0) {
        const oldestBuy = queue[0];
        const amountFromThisBuy = Math.min(oldestBuy.amount, remainingToSell);

        costBasisTotal += amountFromThisBuy * oldestBuy.priceUsd;
        amountMatched += amountFromThisBuy;
        remainingToSell -= amountFromThisBuy;
        oldestBuy.amount -= amountFromThisBuy;

        if (oldestBuy.amount <= 0) {
          queue.shift(); // buy ini sudah habis terpakai, buang dari antrian
        }
      }

      if (amountMatched <= 0) continue;

      const proceedsTotal = amountMatched * price;
      const profitUsd = proceedsTotal - costBasisTotal;

      closedTrades.push({
        token,
        profitUsd,
        costBasis: costBasisTotal,
        blockTime: tx.block_time,
      });
    }
  }

  return closedTrades;
}

/**
 * Menghitung rata-rata waktu holding (dalam jam) dari seluruh
 * closed trade. Untuk kesederhanaan, "holding time" di sini
 * dihitung sebagai jarak waktu antara transaksi BUY pertama dan
 * transaksi SELL pertama untuk tiap token (bukan per-lot FIFO
 * yang presisi) — cukup akurat untuk gambaran umum tanpa
 * kompleksitas berlebihan.
 */
function computeAvgHoldingHours(transactions) {
  const firstBuyByToken = {};
  const holdingDurationsHours = [];

  for (const tx of transactions) {
    const token = tx.token;

    if (tx.type === 'buy' && !(token in firstBuyByToken)) {
      firstBuyByToken[token] = new Date(tx.block_time);
    }

    if (tx.type === 'sell' && firstBuyByToken[token]) {
      const sellTime = new Date(tx.block_time);
      const diffMs = sellTime - firstBuyByToken[token];
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours >= 0) holdingDurationsHours.push(diffHours);
      delete firstBuyByToken[token]; // reset supaya token yang dibeli lagi dihitung ulang
    }
  }

  if (holdingDurationsHours.length === 0) return 0;
  const sum = holdingDurationsHours.reduce((a, b) => a + b, 0);
  return sum / holdingDurationsHours.length;
}

/**
 * Sama seperti computeAvgHoldingHours, tapi mengembalikan SEMUA
 * durasi holding individual (bukan cuma rata-ratanya) — dipakai
 * untuk histogram distribusi holding time di halaman portfolio.
 */
function computeHoldingDurationsHours(transactions) {
  const firstBuyByToken = {};
  const holdingDurationsHours = [];

  for (const tx of transactions) {
    const token = tx.token;

    if (tx.type === 'buy' && !(token in firstBuyByToken)) {
      firstBuyByToken[token] = new Date(tx.block_time);
    }

    if (tx.type === 'sell' && firstBuyByToken[token]) {
      const sellTime = new Date(tx.block_time);
      const diffMs = sellTime - firstBuyByToken[token];
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours >= 0) holdingDurationsHours.push(diffHours);
      delete firstBuyByToken[token];
    }
  }

  return holdingDurationsHours;
}

/**
 * Dari daftar closed trades (terurut kronologis), bangun riwayat
 * profit KUMULATIF — dipakai frontend untuk menggambar sparkline
 * atau equity curve.
 */
function buildProfitHistory(closedTrades) {
  let cumulative = 0;
  return closedTrades.map(trade => {
    cumulative += trade.profitUsd;
    return {
      blockTime: trade.blockTime,
      cumulative_profit: Number(cumulative.toFixed(2)),
    };
  });
}

/**
 * Menghitung seluruh metrik analytics untuk SATU wallet.
 * Mengembalikan null kalau wallet ini belum punya trading
 * transaction sama sekali (tidak ada yang bisa dihitung).
 */
async function computeWalletAnalytics(wallet) {
  const transactions = await findTradingTransactionsByWallet(wallet.wallet_address);

  if (transactions.length === 0) return null;

  const closedTrades = computeClosedTrades(transactions);
  if (closedTrades.length === 0) return null;

  const totalRealizedProfitUsd = closedTrades.reduce((sum, t) => sum + t.profitUsd, 0);
  const winningTrades = closedTrades.filter(t => t.profitUsd > 0);
  const winRatePercent = (winningTrades.length / closedTrades.length) * 100;

  // ROI% = total profit realized / total modal (cost basis) yang
  // benar-benar terpakai dalam closed trades. Ini definisi ROI
  // yang standar: profit relatif terhadap modal, bukan terhadap
  // hasil jual (proceeds).
  const totalCostBasis = closedTrades.reduce((sum, t) => sum + t.costBasis, 0);
  const roiPercent = totalCostBasis > 0
    ? (totalRealizedProfitUsd / totalCostBasis) * 100
    : 0;

  const avgHoldingHours = computeAvgHoldingHours(transactions);
  const profitHistory = buildProfitHistory(closedTrades);

  // Token yang paling sering diperdagangkan (jumlah closed trade terbanyak)
  const tokenCounts = {};
  closedTrades.forEach(t => {
    tokenCounts[t.token] = (tokenCounts[t.token] || 0) + 1;
  });
  const topToken = Object.entries(tokenCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    wallet_address: wallet.wallet_address,
    label: wallet.label,
    top_token: topToken,
    roi_percent: Number(roiPercent.toFixed(2)),
    win_rate_percent: Number(winRatePercent.toFixed(2)),
    avg_holding_hours: Number(avgHoldingHours.toFixed(2)),
    profit_history: profitHistory,
    closed_trades: closedTrades.length,
    total_realized_profit_usd: Number(totalRealizedProfitUsd.toFixed(2)),
  };
}

/**
 * Menghitung analytics untuk SEMUA wallet yang dipantau.
 * Wallet yang belum punya closed trade (belum ada riwayat
 * buy+sell yang cukup) TIDAK diikutkan dalam hasil, bukan
 * ditampilkan dengan angka 0/null yang menyesatkan.
 */
export const getAllWalletAnalytics = async () => {
  const wallets = await findAllWatchedWallets();

  const results = [];
  for (const wallet of wallets) {
    const analytics = await computeWalletAnalytics(wallet);
    if (analytics) results.push(analytics);
  }

  return results;
};

/**
 * Mengambil detail lengkap SATU wallet: info dasar, seluruh
 * riwayat transaksi (termasuk transfer non-trading), seluruh
 * closed trades (bukan cuma ringkasan jumlahnya), dan metrik
 * analytics yang sama seperti computeWalletAnalytics.
 *
 * Mengembalikan null kalau wallet tidak ditemukan di daftar
 * pantauan (watched_wallets) — supaya controller bisa membalas
 * 404 yang jelas.
 */
export const getWalletDetail = async (walletAddress) => {
  const wallet = await findWatchedWalletByAddress(walletAddress);
  if (!wallet) return null;

  // Riwayat transaksi LENGKAP (termasuk transfer non-trading),
  // untuk ditampilkan sebagai daftar aktivitas di halaman detail.
  const allTransactions = await findAllTransactionsByWallet(walletAddress, 100);

  // Transaksi trading saja (buy/sell dengan harga), untuk hitung
  // metrik analytics — sama seperti yang dipakai computeWalletAnalytics.
  const tradingTransactions = await findTradingTransactionsByWallet(walletAddress);

  const closedTrades = computeClosedTrades(tradingTransactions);
  const avgHoldingHours = computeAvgHoldingHours(tradingTransactions);
  const profitHistory = buildProfitHistory(closedTrades);

  const totalRealizedProfitUsd = closedTrades.reduce((sum, t) => sum + t.profitUsd, 0);
  const totalCostBasis = closedTrades.reduce((sum, t) => sum + t.costBasis, 0);
  const winningTrades = closedTrades.filter(t => t.profitUsd > 0);
  const winRatePercent = closedTrades.length > 0
    ? (winningTrades.length / closedTrades.length) * 100
    : 0;
  const roiPercent = totalCostBasis > 0
    ? (totalRealizedProfitUsd / totalCostBasis) * 100
    : 0;

  const tokenCounts = {};
  closedTrades.forEach(t => {
    tokenCounts[t.token] = (tokenCounts[t.token] || 0) + 1;
  });
  const topToken = Object.entries(tokenCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    wallet_address: wallet.wallet_address,
    label: wallet.label,
    watched_since: wallet.created_at,
    top_token: topToken,
    roi_percent: Number(roiPercent.toFixed(2)),
    win_rate_percent: Number(winRatePercent.toFixed(2)),
    avg_holding_hours: Number(avgHoldingHours.toFixed(2)),
    total_realized_profit_usd: Number(totalRealizedProfitUsd.toFixed(2)),
    total_invested_usd: Number(totalCostBasis.toFixed(2)),
    profit_history: profitHistory,
    closed_trades: closedTrades.map(t => ({
      token: t.token,
      profit_usd: Number(t.profitUsd.toFixed(2)),
      cost_basis_usd: Number(t.costBasis.toFixed(2)),
      block_time: t.blockTime,
    })),
    transactions: allTransactions,
  };
};

/**
 * =============================================================
 * FUNGSI BARU DI BAWAH INI — untuk halaman analytics.html
 * (data GABUNGAN dari seluruh wallet yang dipantau, bukan
 * per-wallet seperti fungsi-fungsi di atas)
 * =============================================================
 */

/**
 * Mengambil SELURUH closed trades dari SEMUA wallet yang
 * dipantau, digabung jadi satu daftar terurut kronologis. Ini
 * fondasi untuk semua metrik portfolio-level (KPI cards, equity
 * curve, PnL distribution, dst).
 *
 * Setiap closed trade diberi tambahan field wallet_address dan
 * label supaya masih bisa ditelusuri asalnya kalau perlu (misal
 * untuk trade history yang menampilkan wallet mana yang trading).
 */
async function getAllClosedTradesAcrossWallets() {
  const wallets = await findAllWatchedWallets();

  const allClosedTrades = [];
  for (const wallet of wallets) {
    const transactions = await findTradingTransactionsByWallet(wallet.wallet_address);
    const closedTrades = computeClosedTrades(transactions);

    closedTrades.forEach(t => {
      allClosedTrades.push({
        ...t,
        walletAddress: wallet.wallet_address,
        walletLabel: wallet.label,
      });
    });
  }

  // Urutkan gabungan dari semua wallet secara kronologis, supaya
  // equity curve portfolio masuk akal (bukan tercampur per wallet).
  allClosedTrades.sort((a, b) => new Date(a.blockTime) - new Date(b.blockTime));

  return allClosedTrades;
}

/**
 * KPI CARDS: ringkasan angka-angka utama portfolio (gabungan
 * semua wallet). Dipakai untuk kartu-kartu di bagian atas
 * analytics.html.
 */
export const getPortfolioKpis = async () => {
  const allClosedTrades = await getAllClosedTradesAcrossWallets();

  if (allClosedTrades.length === 0) {
    return {
      totalRealizedProfitUsd: 0,
      totalInvestedUsd: 0,
      roiPercent: 0,
      winRatePercent: 0,
      totalClosedTrades: 0,
      activeWallets: 0,
    };
  }

  const totalRealizedProfitUsd = allClosedTrades.reduce((sum, t) => sum + t.profitUsd, 0);
  const totalCostBasis = allClosedTrades.reduce((sum, t) => sum + t.costBasis, 0);
  const winningTrades = allClosedTrades.filter(t => t.profitUsd > 0);
  const winRatePercent = (winningTrades.length / allClosedTrades.length) * 100;
  const roiPercent = totalCostBasis > 0
    ? (totalRealizedProfitUsd / totalCostBasis) * 100
    : 0;

  // Hitung wallet unik yang punya minimal 1 closed trade (bukan
  // sekadar terdaftar di watched_wallets tapi belum trading).
  const uniqueWallets = new Set(allClosedTrades.map(t => t.walletAddress));

  return {
    totalRealizedProfitUsd: Number(totalRealizedProfitUsd.toFixed(2)),
    totalInvestedUsd: Number(totalCostBasis.toFixed(2)),
    roiPercent: Number(roiPercent.toFixed(2)),
    winRatePercent: Number(winRatePercent.toFixed(2)),
    totalClosedTrades: allClosedTrades.length,
    activeWallets: uniqueWallets.size,
  };
};

/**
 * EQUITY CURVE: profit kumulatif GABUNGAN semua wallet dari
 * waktu ke waktu. Beda dengan profit_history per-wallet di
 * getWalletDetail — ini menggabungkan seluruh closed trade dari
 * semua wallet, diurutkan kronologis, baru dihitung kumulatifnya.
 */
export const getEquityCurve = async () => {
  const allClosedTrades = await getAllClosedTradesAcrossWallets();
  return buildProfitHistory(allClosedTrades);
};

/**
 * PNL DISTRIBUTION: sebaran profit/rugi per closed trade, dalam
 * bentuk siap-histogram. Frontend tinggal menggambar bar chart
 * dari bucket ini, tidak perlu hitung ulang.
 *
 * Bucket dirancang dalam USD dengan lebar tetap supaya mudah
 * dibaca: <-100, -100 s.d. -10, -10 s.d. 0, 0 s.d. 10, 10 s.d.
 * 100, >100. Ini bukan skema baku, tapi cukup masuk akal untuk
 * data trading skala kecil-menengah seperti proyek ini.
 */
export const getPnlDistribution = async () => {
  const allClosedTrades = await getAllClosedTradesAcrossWallets();

  const buckets = [
    { label: '< -100', min: -Infinity, max: -100, count: 0 },
    { label: '-100 s.d -10', min: -100, max: -10, count: 0 },
    { label: '-10 s.d 0', min: -10, max: 0, count: 0 },
    { label: '0 s.d 10', min: 0, max: 10, count: 0 },
    { label: '10 s.d 100', min: 10, max: 100, count: 0 },
    { label: '> 100', min: 100, max: Infinity, count: 0 },
  ];

  allClosedTrades.forEach(t => {
    const bucket = buckets.find(b => t.profitUsd >= b.min && t.profitUsd < b.max)
      || buckets[buckets.length - 1]; // fallback untuk nilai persis di batas atas
    bucket.count++;
  });

  return buckets.map(b => ({ label: b.label, count: b.count }));
};

/**
 * WIN/LOSS RATIO: hitungan sederhana closed trade untung vs rugi
 * vs impas (profit persis 0, jarang terjadi tapi ditangani).
 */
export const getWinLossRatio = async () => {
  const allClosedTrades = await getAllClosedTradesAcrossWallets();

  const wins = allClosedTrades.filter(t => t.profitUsd > 0).length;
  const losses = allClosedTrades.filter(t => t.profitUsd < 0).length;
  const breakeven = allClosedTrades.filter(t => t.profitUsd === 0).length;

  return { wins, losses, breakeven, total: allClosedTrades.length };
};

/**
 * TOP TOKENS: token dengan profit realized terbesar (gabungan
 * semua wallet), diurutkan dari yang paling menguntungkan.
 * limit membatasi jumlah token yang dikembalikan (default 10).
 */
export const getTopTokens = async (limit = 10) => {
  const allClosedTrades = await getAllClosedTradesAcrossWallets();

  const tokenStats = {};
  allClosedTrades.forEach(t => {
    if (!tokenStats[t.token]) {
      tokenStats[t.token] = { token: t.token, totalProfitUsd: 0, tradeCount: 0 };
    }
    tokenStats[t.token].totalProfitUsd += t.profitUsd;
    tokenStats[t.token].tradeCount += 1;
  });

  return Object.values(tokenStats)
    .map(s => ({
      token: s.token,
      total_profit_usd: Number(s.totalProfitUsd.toFixed(2)),
      trade_count: s.tradeCount,
    }))
    .sort((a, b) => b.total_profit_usd - a.total_profit_usd)
    .slice(0, limit);
};

/**
 * HOLDING TIME DISTRIBUTION: sebaran durasi holding (dalam jam)
 * dari SEMUA closed trade di semua wallet, dalam bentuk
 * siap-histogram. Bucket dalam satuan jam.
 */
export const getHoldingTimeDistribution = async () => {
  const wallets = await findAllWatchedWallets();

  let allDurations = [];
  for (const wallet of wallets) {
    const transactions = await findTradingTransactionsByWallet(wallet.wallet_address);
    allDurations = allDurations.concat(computeHoldingDurationsHours(transactions));
  }

  const buckets = [
    { label: '< 1 jam', min: 0, max: 1, count: 0 },
    { label: '1-6 jam', min: 1, max: 6, count: 0 },
    { label: '6-24 jam', min: 6, max: 24, count: 0 },
    { label: '1-3 hari', min: 24, max: 72, count: 0 },
    { label: '3-7 hari', min: 72, max: 168, count: 0 },
    { label: '> 7 hari', min: 168, max: Infinity, count: 0 },
  ];

  allDurations.forEach(hours => {
    const bucket = buckets.find(b => hours >= b.min && hours < b.max)
      || buckets[buckets.length - 1];
    bucket.count++;
  });

  return buckets.map(b => ({ label: b.label, count: b.count }));
};

/**
 * TRADE HISTORY: seluruh closed trades dari semua wallet,
 * terurut dari yang PALING BARU (untuk ditampilkan sebagai tabel
 * riwayat trading lengkap). Beda dari getAllClosedTradesAcrossWallets
 * (internal, urut lama->baru untuk equity curve) — ini untuk
 * tampilan tabel, jadi diurut baru->lama dan dibatasi limit.
 */
export const getTradeHistory = async (limit = 100) => {
  const allClosedTrades = await getAllClosedTradesAcrossWallets();

  return allClosedTrades
    .slice()
    .sort((a, b) => new Date(b.blockTime) - new Date(a.blockTime))
    .slice(0, limit)
    .map(t => ({
      wallet_address: t.walletAddress,
      wallet_label: t.walletLabel,
      token: t.token,
      profit_usd: Number(t.profitUsd.toFixed(2)),
      cost_basis_usd: Number(t.costBasis.toFixed(2)),
      block_time: t.blockTime,
    }));
};
