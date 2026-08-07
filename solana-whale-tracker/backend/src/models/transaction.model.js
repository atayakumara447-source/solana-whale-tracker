// =============================================================
// transaction.model.js
// -------------------------------------------------------------
// LAYER: MODEL
// Tugas file ini HANYA satu: berbicara dengan database (PostgreSQL).
// Tidak ada logika bisnis di sini (misalnya "apa itu whale?"),
// itu urusan SERVICE. Model hanya tahu cara SIMPAN dan AMBIL data.
// =============================================================

import { pool } from '../config/db.js';

/**
 * Menyimpan satu transaksi ke database.
 * Menggunakan "ON CONFLICT DO NOTHING" supaya jika signature yang
 * sama sudah ada (duplikat), tidak terjadi error — cukup dilewati.
 *
 * Menerima type & priceUsd (bisa null) supaya kolom itu terisi
 * untuk transaksi SWAP (dipakai Wallet Analytics), dan tetap null
 * untuk transfer SOL native polos yang bukan trading.
 */
export const insertTransaction = async (transaction) => {
  const { signature, walletAddress, amount, token, blockTime, type, priceUsd } = transaction;

  const query = `
    INSERT INTO transactions (signature, wallet_address, amount, token, block_time, type, price_usd)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (signature) DO NOTHING
    RETURNING *;
  `;

  const values = [signature, walletAddress, amount, token, blockTime, type ?? null, priceUsd ?? null];

  try {
    const result = await pool.query(query, values);
    return result.rows[0] || null; // null jika tidak ada baris baru (karena duplikat)
  } catch (error) {
    console.error('❌ Gagal insert transaction:', error.message);
    throw error;
  }
};

/**
 * Mengambil daftar transaksi whale dari database,
 * diurutkan dari yang terbaru, dengan limit jumlah data.
 */
export const findAllTransactions = async (limit = 50) => {
  const query = `
    SELECT * FROM transactions
    ORDER BY block_time DESC
    LIMIT $1;
  `;
  const result = await pool.query(query, [limit]);
  return result.rows;
};

/**
 * Mengambil satu transaksi berdasarkan ID (primary key).
 */
export const findTransactionById = async (id) => {
  const query = `SELECT * FROM transactions WHERE id = $1;`;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null; // null jika tidak ditemukan
};

/**
 * Mengambil semua transaksi TRADING (type = 'buy' atau 'sell')
 * milik SATU wallet, diurutkan dari yang paling lama ke terbaru
 * (ASC) — urutan ini penting karena logika FIFO (First In First
 * Out) di walletAnalytics.service.js butuh transaksi berurutan
 * secara kronologis untuk mencocokkan buy dengan sell-nya.
 *
 * Transaksi transfer SOL native polos (type IS NULL) SENGAJA
 * tidak diikutkan karena tidak punya cost basis untuk dihitung
 * sebagai posisi trading.
 */
export const findTradingTransactionsByWallet = async (walletAddress) => {
  const query = `
    SELECT * FROM transactions
    WHERE wallet_address = $1
      AND type IS NOT NULL
      AND price_usd IS NOT NULL
    ORDER BY block_time ASC;
  `;
  const result = await pool.query(query, [walletAddress]);
  return result.rows;
};

/**
 * Mengambil SEMUA transaksi milik SATU wallet (termasuk transfer
 * non-trading yang type-nya NULL), diurutkan dari yang TERBARU
 * dulu (DESC) — dipakai untuk menampilkan riwayat aktivitas di
 * halaman Wallet Detail, bukan untuk kalkulasi FIFO.
 */
export const findAllTransactionsByWallet = async (walletAddress, limit = 100) => {
  const query = `
    SELECT * FROM transactions
    WHERE wallet_address = $1
    ORDER BY block_time DESC
    LIMIT $2;
  `;
  const result = await pool.query(query, [walletAddress, limit]);
  return result.rows;
};
