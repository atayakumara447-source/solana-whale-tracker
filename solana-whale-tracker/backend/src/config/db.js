// =============================================================
// db.js
// -------------------------------------------------------------
// File ini membuat SATU "connection pool" ke PostgreSQL yang
// dipakai bersama oleh seluruh aplikasi.
//
// Kenapa pakai "pool" bukan koneksi tunggal?
// Express menangani banyak request secara bersamaan (concurrent).
// Dengan pool, beberapa query bisa dijalankan tanpa harus saling
// menunggu satu koneksi yang sama selesai dan ditutup dulu.
// =============================================================

import { Pool } from 'pg';
import { env } from './env.js';

export const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
ssl: {
    rejectUnauthorized: false,
  },
});

// Menangkap error tak terduga dari pool (misalnya koneksi terputus)
// supaya tidak membuat seluruh aplikasi crash secara diam-diam.
pool.on('error', (err) => {
  console.error('❌ Terjadi error tak terduga pada PostgreSQL pool:', err);
});
