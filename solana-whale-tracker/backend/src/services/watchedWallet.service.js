// =============================================================
// watchedWallet.service.js
// -------------------------------------------------------------
// LAYER: SERVICE
// Logika bisnis untuk mengelola daftar wallet yang dipantau.
// Sebagian besar di sini hampir langsung meneruskan ke model,
// tapi tetap dipisah supaya konsisten dengan pola arsitektur di
// seluruh proyek, dan supaya validasi/aturan tambahan (seperti
// import CSV di bawah) punya tempat yang jelas.
// =============================================================

import {
  insertWatchedWallet,
  findAllWatchedWallets,
  deleteWatchedWallet,
} from '../models/watchedWallet.model.js';
import { parseCsv } from '../utils/csv.js';

/**
 * Mendaftarkan satu wallet baru ke daftar pantauan.
 */
export const addWatchedWallet = async (walletAddress, label) => {
  return await insertWatchedWallet(walletAddress, label);
};

/**
 * Mengambil semua wallet yang sedang dipantau.
 */
export const getWatchedWallets = async () => {
  return await findAllWatchedWallets();
};

/**
 * Menghapus satu wallet dari daftar pantauan.
 */
export const removeWatchedWallet = async (walletAddress) => {
  return await deleteWatchedWallet(walletAddress);
};

/**
 * Mengimpor banyak wallet sekaligus dari teks CSV.
 *
 * Format CSV yang diharapkan (baris pertama = header):
 *   wallet_address,label
 *   3ADzk5...EFib,Whale 1
 *   9WzDXw...WWM,Binance Hot Wallet 2
 *
 * Setiap baris diproses satu per satu dan TIDAK saling
 * menghentikan — kalau satu baris gagal (misal wallet_address
 * kosong), baris itu dicatat sebagai error dan proses lanjut ke
 * baris berikutnya, supaya satu baris rusak tidak menggagalkan
 * seluruh file.
 *
 * @param {string} csvText - isi mentah file CSV
 * @returns {{ imported: number, skipped: number, errors: Array<{row: number, message: string}> }}
 */
export const importWatchedWalletsFromCsv = async (csvText) => {
  const rows = parseCsv(csvText);

  let imported = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const walletAddress = row.wallet_address?.trim();
    const label = row.label?.trim() || null;

    if (!walletAddress) {
      errors.push({ row: i + 2, message: 'wallet_address kosong' }); // +2: baris 1 = header, index 0-based
      continue;
    }

    try {
      const inserted = await insertWatchedWallet(walletAddress, label);
      if (inserted) {
        imported++;
      } else {
        // insertWatchedWallet mengembalikan undefined/null kalau
        // wallet sudah terdaftar sebelumnya (ON CONFLICT DO NOTHING)
        skipped++;
      }
    } catch (error) {
      errors.push({ row: i + 2, message: error.message });
    }
  }

  return { imported, skipped, errors };
};
