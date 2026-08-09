// =============================================================
// watchedWallet.model.js
// -------------------------------------------------------------
// LAYER: MODEL
// Sama seperti transaction.model.js, file ini HANYA bertugas
// berbicara dengan database untuk tabel watched_wallets. Tidak
// ada logika bisnis di sini — hanya operasi SIMPAN dan AMBIL data.
// =============================================================

import { pool } from '../config/db.js';

/**
 * Menambahkan satu alamat wallet ke daftar pantauan.
 * Menggunakan "ON CONFLICT DO NOTHING" supaya kalau wallet yang
 * sama sudah terdaftar, tidak terjadi error — cukup dilewati.
 */
export const insertWatchedWallet = async (walletAddress, label) => {
  const query = `
    INSERT INTO watched_wallets (wallet_address, label)
    VALUES ($1, $2)
    ON CONFLICT (wallet_address) DO NOTHING
    RETURNING *;
  `;
  const result = await pool.query(query, [walletAddress, label || null]);
  return result.rows[0]; // undefined jika wallet sudah ada sebelumnya
};

/**
 * Mengambil SEMUA alamat wallet yang sedang dipantau.
 * Dipakai oleh endpoint /sync-all untuk tahu wallet mana saja
 * yang perlu di-sync.
 */
export const findAllWatchedWallets = async () => {
  const query = `SELECT * FROM watched_wallets ORDER BY created_at ASC;`;
  const result = await pool.query(query);
  return result.rows;
};

/**
 * Menghapus satu wallet dari daftar pantauan berdasarkan alamatnya.
 */
export const deleteWatchedWallet = async (walletAddress) => {
  const query = `DELETE FROM watched_wallets WHERE wallet_address = $1 RETURNING *;`;
  const result = await pool.query(query, [walletAddress]);
  return result.rows[0]; // undefined jika wallet tidak ditemukan
};