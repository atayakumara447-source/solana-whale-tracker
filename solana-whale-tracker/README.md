# Solana Whale Tracker

Aplikasi web untuk melacak transaksi besar ("whale") di blockchain Solana menggunakan Solscan API.

## Status Proyek

✅ **Tahap 1 (selesai):** Struktur proyek & arsitektur backend (Node.js + Express + PostgreSQL, pola MVC)
⏳ **Tahap 2 (menyusul):** Frontend React + Vite
⏳ **Tahap 3 (menyusul):** Integrasi penuh + deployment

## Arsitektur Backend

Backend mengikuti pola **MVC + Service Layer** dengan pemisahan tanggung jawab yang jelas:

```
backend/src/
├── config/         # Setup koneksi DB & environment variable
├── routes/         # Definisi endpoint (URL -> Controller)
├── controllers/    # Menangani req/res HTTP
├── services/       # Logika bisnis inti (termasuk komunikasi ke Solscan)
├── models/         # Query ke PostgreSQL
├── middlewares/     # Error handler, validasi, dll.
├── utils/          # Fungsi bantu (logger, dll.)
├── database/       # File migrasi SQL
├── app.js          # Konfigurasi aplikasi Express
└── server.js       # Entry point (menjalankan server)
```

### Alur Request (contoh: GET /api/transactions)

```
Client → routes/transaction.routes.js
       → controllers/transaction.controller.js  (parsing req, panggil service)
       → services/transaction.service.js        (logika bisnis)
       → models/transaction.model.js             (query ke PostgreSQL)
       ← data dikembalikan ke atas → controller → response JSON ke client
```

## Cara Menjalankan (Backend)

```bash
cd backend
npm install
cp .env.example .env    # lalu isi kredensial kamu
# Jalankan migrasi SQL (src/database/migrations/001_create_transactions_table.sql) di PostgreSQL kamu
npm run dev
```

## Endpoint yang Tersedia

| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/transactions` | Ambil daftar transaksi whale yang tersimpan |
| GET | `/api/transactions/:id` | Ambil satu transaksi berdasarkan ID |
| POST | `/api/transactions/sync` | Ambil data terbaru dari Solscan & simpan yang termasuk whale |

## Tech Stack

- **Backend:** Node.js, Express
- **Database:** PostgreSQL
- **Data Source:** Solscan API
- **Frontend (menyusul):** React + Vite
