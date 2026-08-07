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
 * Dari daftar closed trades (terurut kronologis), bangun riwayat
 * profit KUMULATIF — dipakai frontend untuk menggambar sparkline.
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
