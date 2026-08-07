// =============================================================
// env.js
// -------------------------------------------------------------
// File ini bertugas MEMUSATKAN semua akses ke environment variable
// (process.env) di satu tempat.
//
// Kenapa penting?
// Jika process.env.SESUATU dipanggil di 10 file berbeda, ketika
// kamu perlu mengganti nama variabel atau menambah validasi,
// kamu harus mengubah di banyak tempat. Dengan pola ini, cukup
// ubah di SATU file: env.js.
// =============================================================

import dotenv from 'dotenv';

// Membaca isi file .env dan memasukkannya ke process.env
dotenv.config();

export const env = {
  // Port tempat server Express akan berjalan
  port: process.env.PORT || 5000,

  // Kredensial untuk mengakses Solscan API
  solscanApiKey: process.env.SOLSCAN_API_KEY,
  solscanBaseUrl: process.env.SOLSCAN_BASE_URL || 'https://pro-api.solscan.io/v2.0',

  // Ambang batas (threshold) SOL untuk dianggap "transaksi whale"
  // Disimpan sebagai env var supaya bisa diubah tanpa mengubah kode (fleksibel)
  whaleThresholdSol: parseFloat(process.env.WHALE_THRESHOLD_SOL) || 1000,

  // Konfigurasi koneksi PostgreSQL
  db: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
};
