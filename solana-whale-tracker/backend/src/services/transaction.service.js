// =============================================================
// transaction.service.js
// -------------------------------------------------------------
// LAYER: SERVICE
// Ini adalah OTAK bisnis dari aplikasi. File ini yang memutuskan:
// "Apa itu transaksi whale?", "Data mana yang disimpan?", dst.
//
// File ini TIDAK tahu apa-apa tentang req/res (HTTP) — itu tugas
// controller. Service hanya menerima input sederhana dan
// mengembalikan output sederhana (array, object, dll).
//
// PERUBAHAN DARI VERSI SEBELUMNYA:
// Sebelumnya file ini HANYA menangkap nativeTransfers (transfer
// SOL polos antar wallet). Itu tidak cukup untuk Wallet Analytics
// (ROI, win rate, dst.) karena konsep "buy/sell" hanya masuk akal
// dalam konteks SWAP (tukar token), bukan transfer biasa.
//
// Sekarang file ini JUGA menangkap transaksi bertipe "SWAP" dari
// Helius, menentukan arah (buy/sell) dari sudut pandang wallet,
// lalu mengambilkan harga USD saat itu dari priceService supaya
// kolom `type` dan `price_usd` (lihat migrations/add_wallet_
// analytics_columns.sql) terisi otomatis setiap kali sync jalan.
// =============================================================

import { env } from '../config/env.js';
import { fetchTransactionsByAddress } from './solscan.service.js';
import { getTokenPriceUsd, JUPITER_SOL_MINT } from './priceService.js';
import { insertTransaction, findAllTransactions, findTransactionById } from '../models/transaction.model.js';
import { findAllWatchedWallets } from '../models/watchedWallet.model.js';

// Solana menyimpan jumlah SOL dalam satuan "lamports" (unit terkecil),
// BUKAN dalam angka SOL langsung. 1 SOL = 1.000.000.000 lamports.
// Konstanta ini dipakai untuk konversi sebelum dibandingkan dengan threshold.
const LAMPORTS_PER_SOL = 1_000_000_000;

/**
 * Dari SATU transaksi Helius bertipe SWAP, tentukan token apa yang
 * MASUK ke wallet ini dan token apa yang KELUAR dari wallet ini.
 *
 * Kenapa perlu fungsi terpisah? Karena satu transaksi SWAP di
 * Helius bisa berisi campuran nativeTransfers (kalau salah satu
 * sisi swap-nya SOL) DAN tokenTransfers (untuk SPL token). Wallet
 * bisa jadi mengirim SOL dan menerima token (= buy token itu),
 * atau mengirim token dan menerima SOL (= sell token itu).
 *
 * @param {object} tx - satu transaksi mentah dari Helius (type === 'SWAP')
 * @param {string} walletAddress - alamat wallet yang sedang kita proses
 * @returns {{ incoming: object|null, outgoing: object|null }}
 *   incoming/outgoing berbentuk { mint, amount } atau null kalau tidak ada
 */
function getSwapDirection(tx, walletAddress) {
  let incoming = null;
  let outgoing = null;

  // --- Sisi SOL (native transfer) ---
  for (const transfer of tx.nativeTransfers || []) {
    const amountInSol = transfer.amount / LAMPORTS_PER_SOL;
    if (transfer.toUserAccount === walletAddress) {
      incoming = { mint: JUPITER_SOL_MINT, symbol: 'SOL', amount: amountInSol };
    } else if (transfer.fromUserAccount === walletAddress) {
      outgoing = { mint: JUPITER_SOL_MINT, symbol: 'SOL', amount: amountInSol };
    }
  }

  // --- Sisi SPL token (tokenTransfers) ---
  for (const transfer of tx.tokenTransfers || []) {
    const amount = parseFloat(transfer.tokenAmount) || 0;
    const symbol = transfer.tokenSymbol || transfer.mint?.slice(0, 4) || 'UNKNOWN';

    if (transfer.toUserAccount === walletAddress) {
      incoming = { mint: transfer.mint, symbol, amount };
    } else if (transfer.fromUserAccount === walletAddress) {
      outgoing = { mint: transfer.mint, symbol, amount };
    }
  }

  return { incoming, outgoing };
}

/**
 * Mengambil riwayat transaksi untuk SATU alamat wallet dari Helius,
 * MENYARING transaksi yang termasuk kategori "whale" (di atas
 * threshold), lalu menyimpannya ke database. Ini adalah proses
 * utama aplikasi ("sync" data) untuk wallet yang diinput user.
 *
 * Sekarang menangani DUA jenis transaksi:
 *   1. Transfer SOL native polos (seperti sebelumnya) -> disimpan
 *      TANPA type/price_usd (bukan trading, tidak relevan untuk
 *      Wallet Analytics, tapi tetap berguna untuk heatmap/summary).
 *   2. Swap (type === 'SWAP' dari Helius) -> disimpan DENGAN
 *      type ('buy'/'sell') dan price_usd, supaya Wallet Analytics
 *      punya cost basis untuk menghitung ROI/win rate/dst.
 *
 * @param {string} walletAddress - Alamat wallet Solana yang dilacak
 */
export const syncWhaleTransactions = async (walletAddress) => {
  const rawTransactions = await fetchTransactionsByAddress(walletAddress);

  const savedResults = [];

  for (const tx of rawTransactions) {
    if (tx.type === 'SWAP') {
      // --- Kasus 1: transaksi SWAP ---
      const { incoming, outgoing } = getSwapDirection(tx, walletAddress);

      // Kalau salah satu sisi tidak terdeteksi, kita tidak bisa
      // menyimpulkan arah buy/sell dengan yakin -> lewati transaksi ini
      // daripada menyimpan data yang salah.
      if (!incoming || !outgoing) continue;

      // Definisi "whale" untuk swap: jumlah SOL yang terlibat di
      // salah satu sisi swap >= threshold. Kalau tidak ada sisi SOL
      // sama sekali (swap token-ke-token), kita pakai nilai token
      // yang masuk sebagai jumlah yang dicatat, tapi threshold whale
      // tetap berbasis SOL sesuai desain awal aplikasi ini.
      const solSide = incoming.mint === JUPITER_SOL_MINT ? incoming : outgoing;
      const isSolInvolved = solSide.mint === JUPITER_SOL_MINT;
      if (isSolInvolved && solSide.amount < env.whaleThresholdSol) continue;
      if (!isSolInvolved) continue; // untuk sekarang, hanya proses swap yang salah satu sisinya SOL

      // "Buy" = wallet menerima token NON-SOL (mengeluarkan SOL untuk itu).
      // "Sell" = wallet mengeluarkan token NON-SOL (menerima SOL untuk itu).
      const isBuy = incoming.mint !== JUPITER_SOL_MINT;
      const tradedToken = isBuy ? incoming : outgoing;
      const type = isBuy ? 'buy' : 'sell';

      const priceUsd = await getTokenPriceUsd(tradedToken.mint);

      const saved = await insertTransaction({
        signature: tx.signature,
        walletAddress,
        amount: tradedToken.amount,
        token: tradedToken.symbol,
        type,
        priceUsd,
        // Helius memberi timestamp dalam Unix seconds; PostgreSQL
        // TIMESTAMP butuh format tanggal JavaScript Date.
        blockTime: new Date(tx.timestamp * 1000),
      });
      if (saved) savedResults.push(saved);
    } else {
      // --- Kasus 2: transfer SOL native polos (perilaku lama) ---
      const nativeTransfers = tx.nativeTransfers || [];

      for (const transfer of nativeTransfers) {
        const amountInSol = transfer.amount / LAMPORTS_PER_SOL;

        if (amountInSol >= env.whaleThresholdSol) {
          const saved = await insertTransaction({
            signature: tx.signature,
            walletAddress: transfer.fromUserAccount,
            amount: amountInSol,
            token: 'SOL',
            // type & priceUsd sengaja tidak diisi (null) -> ini bukan
            // trading, jadi tidak punya cost basis untuk dihitung.
            type: null,
            priceUsd: null,
            blockTime: new Date(tx.timestamp * 1000),
          });
          if (saved) savedResults.push(saved);
        }
      }
    }
  }

  return savedResults;
};

/**
 * Mengambil SEMUA wallet yang terdaftar di daftar pantauan
 * (watched_wallets), lalu menjalankan syncWhaleTransactions untuk
 * SETIAP wallet tersebut satu per satu. Ini fungsi utama di balik
 * endpoint /sync-all — cukup panggil sekali, semua wallet ter-update.
 *
 * Fungsi ini SENGAJA memakai syncWhaleTransactions yang sudah ada
 * (bukan menulis ulang logikanya) — prinsip "jangan ulangi kode
 * yang sudah benar" (DRY: Don't Repeat Yourself).
 */
export const syncAllWatchedWallets = async () => {
  const wallets = await findAllWatchedWallets();

  // Hasil akhirnya dikelompokkan PER WALLET, supaya pemanggil
  // (controller) bisa tahu wallet mana yang menghasilkan berapa
  // transaksi whale — bukan cuma gabungan semua tanpa konteks.
  const resultsPerWallet = [];

  for (const wallet of wallets) {
    try {
      const savedTransactions = await syncWhaleTransactions(wallet.wallet_address);
      resultsPerWallet.push({
        walletAddress: wallet.wallet_address,
        label: wallet.label,
        newWhaleTransactions: savedTransactions.length,
      });
    } catch (error) {
      // Kalau SATU wallet gagal (misal alamat tidak valid), jangan
      // sampai menghentikan proses sync untuk wallet-wallet lainnya.
      // Catat sebagai error untuk wallet itu saja, lalu lanjut ke wallet berikutnya.
      resultsPerWallet.push({
        walletAddress: wallet.wallet_address,
        label: wallet.label,
        error: error.message,
      });
    }
  }

  return resultsPerWallet;
};

/**
 * Mengambil daftar transaksi whale yang SUDAH tersimpan di database
 * (dipakai oleh endpoint GET /api/transactions).
 */
export const getStoredWhaleTransactions = async (limit) => {
  return await findAllTransactions(limit);
};

/**
 * Mengambil satu transaksi berdasarkan ID.
 */
export const getWhaleTransactionById = async (id) => {
  return await findTransactionById(id);
};
