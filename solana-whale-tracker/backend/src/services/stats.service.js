// =============================================================
// stats.service.js
// -------------------------------------------------------------
// LAYER: SERVICE
// Menghitung statistik ringkasan dari data transaksi yang sudah
// tersimpan di database. Dipakai untuk dashboard dan heatmap.
// =============================================================

import { pool } from '../config/db.js';

/**
 * Menghitung jumlah transaksi & volume per token PER JAM (0-23),
 * berdasarkan waktu transaksi (block_time). Dipakai untuk heatmap
 * grid token x jam di dashboard.
 *
 * Contoh hasil:
 * [
 *   { token: 'SOL', hour: 6, jumlah_transaksi: 3, total_volume: 5000 },
 *   { token: 'SOL', hour: 14, jumlah_transaksi: 1, total_volume: 200 },
 *   { token: 'USDC', hour: 9, jumlah_transaksi: 2, total_volume: 1500 },
 *   ...
 * ]
 *
 * Catatan: EXTRACT(HOUR FROM block_time) mengambil jam dalam UTC
 * (sesuai timezone kolom block_time di database). Kalau nanti perlu
 * disesuaikan ke waktu lokal (WITA/WIB), bisa dikonversi di sini
 * dengan `AT TIME ZONE`.
 */
export const getTokenHeatmap = async () => {
  const query = `
    SELECT
      token,
      EXTRACT(HOUR FROM block_time)::int AS hour,
      COUNT(*) AS jumlah_transaksi,
      SUM(amount) AS total_volume
    FROM transactions
    GROUP BY token, EXTRACT(HOUR FROM block_time)
    ORDER BY token, hour;
  `;
  const result = await pool.query(query);
  return result.rows;
};

/**
 * Ringkasan umum: total transaksi, total wallet dipantau, total volume.
 */
export const getSummaryStats = async () => {
  const totalTransaksi = await pool.query(`SELECT COUNT(*) AS total FROM transactions;`);
  const totalWallet = await pool.query(`SELECT COUNT(*) AS total FROM watched_wallets;`);
  const totalVolume = await pool.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM transactions;`);

  return {
    totalTransaksi: parseInt(totalTransaksi.rows[0].total, 10),
    totalWallet: parseInt(totalWallet.rows[0].total, 10),
    totalVolume: parseFloat(totalVolume.rows[0].total),
  };
};

/**
 * Transaksi terbaru (untuk tabel di dashboard), maksimal N baris.
 */
export const getRecentTransactions = async (limit = 20) => {
  const query = `
    SELECT wallet_address, amount, token, block_time
    FROM transactions
    ORDER BY block_time DESC
    LIMIT $1;
  `;
  const result = await pool.query(query, [limit]);
  return result.rows;
};