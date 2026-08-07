// =============================================================
// app.js
// -------------------------------------------------------------
// File ini mengonfigurasi APLIKASI Express itu sendiri:
// middleware apa saja yang dipakai, dan route apa saja yang
// didaftarkan.
//
// Sengaja TIDAK menjalankan server.listen() di sini (itu tugas
// server.js). Kenapa? Supaya `app` bisa diimpor untuk testing
// otomatis tanpa harus benar-benar membuka koneksi jaringan.
// =============================================================

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Mengizinkan frontend (yang berjalan di port berbeda, misal Vite:5173)
// untuk melakukan request ke backend ini.
app.use(cors());

// Mem-parsing body request berformat JSON menjadi object JavaScript
// yang bisa diakses lewat req.body.
app.use(express.json());

// Menyajikan dashboard.html (dan file statis lain di folder backend/)
// supaya bisa dibuka langsung lewat http://localhost:5000/dashboard.html
// tanpa perlu membuka file secara manual dari file explorer.
app.use(express.static(path.join(__dirname, '..')));

// Semua route API diawali dengan prefix /api
// Contoh hasil akhir: /api/transactions
app.use('/api', routes);

// HARUS diletakkan PALING TERAKHIR — middleware ini menangkap
// error yang dilempar (next(error)) dari route mana pun di atasnya.
app.use(errorHandler);

export default app;
