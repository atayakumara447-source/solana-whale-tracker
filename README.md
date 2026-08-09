# Solana Whale Tracker

Aplikasi web untuk memantau transaksi *whale* (transaksi besar) di blockchain Solana, menghitung metrik trading (ROI, win rate, holding time) per wallet, dan menyajikan laporan analitik gabungan lewat dashboard maupun BI report.

**Live demo:** [soltrace-whale-dashboard.netlify.app](https://soltrace-whale-dashboard.netlify.app)
**Laporan BI (Tableau Public):** [Wallet Analytics Report](https://public.tableau.com/app/profile/kiriyama.ikuto/viz/SolanaWhaleTracker-WalletAnalytics/Sheet2)
**API backend:** [solana-whale-tracker-production-b9dc.up.railway.app](https://solana-whale-tracker-production-b9dc.up.railway.app)

---

## Ringkasan proyek

Proyek ini melacak wallet-wallet Solana yang dipantau, mengambil riwayat transaksinya dari blockchain, mengklasifikasikan transaksi sebagai *buy*/*sell*/*transfer*, lalu menghitung metrik performa trading per wallet maupun gabungan (portfolio-level). Hasilnya ditampilkan lewat dashboard interaktif dan laporan BI, dengan fitur export/import data untuk analisis lebih lanjut.

## Fitur utama

- **Sinkronisasi transaksi on-chain** — mengambil data transaksi wallet secara real-time dari Helius Enhanced Transactions API
- **Deteksi whale transaction** — filter transaksi bernilai besar (≥1000 SOL)
- **Klasifikasi buy/sell** — deteksi swap token dengan harga USD real-time dari Jupiter Price API
- **Wallet Analytics per-wallet** — ROI, win rate, rata-rata waktu holding, riwayat profit kumulatif, dihitung dengan metode FIFO (First In First Out)
- **Portfolio Analytics gabungan** — KPI, equity curve, distribusi profit/rugi, win/loss ratio, top tokens, distribusi holding time, dan riwayat trading lengkap dari seluruh wallet yang dipantau
- **Heatmap token × jam** — visualisasi kapan token tertentu paling sering ditransaksikan
- **Import/Export CSV** — impor daftar wallet baru untuk dipantau, ekspor data transaksi dan analytics
- **Laporan BI di Tableau Public** — laporan terpisah untuk eksplorasi data lebih mendalam

## Arsitektur

```
solana-whale-tracker/
├── backend/                    # Node.js + Express (clean architecture / MVC)
│   └── src/
│       ├── controllers/        # menangani request/response HTTP
│       ├── services/           # logika bisnis & kalkulasi metrik
│       ├── models/             # query ke database (Supabase/PostgreSQL)
│       ├── routes/             # definisi endpoint API
│       └── utils/              # logger, helper CSV, dll
├── dashboard.html               # dashboard utama (transaksi, heatmap, wallet analytics)
├── wallet-detail.html           # detail metrik per satu wallet
├── analytics.html               # laporan portfolio gabungan (equity curve, top tokens, dst)
└── index.html                   # redirect ke dashboard.html
```

## Tech stack

| Layer | Teknologi |
|---|---|
| Backend | Node.js, Express.js |
| Database | PostgreSQL (Supabase) |
| Data blockchain | Helius Enhanced Transactions API |
| Data harga token | Jupiter Price API |
| Frontend | HTML, CSS, JavaScript (vanilla) |
| Hosting backend | Railway |
| Hosting frontend | Netlify |
| BI / reporting | Tableau Public |

## Metodologi perhitungan metrik

Metrik trading dihitung menggunakan metode **FIFO (First In First Out)**: token yang paling dulu dibeli dianggap paling dulu dijual. Setiap kali ada transaksi *sell*, sistem "memakan" dari antrian *buy* paling lama untuk token tersebut, lalu menghitung profit dari selisih harga jual dan rata-rata tertimbang harga beli.

**ROI (%)** dihitung sebagai total profit realized dibagi total modal (cost basis) yang benar-benar terpakai dalam closed trade — bukan terhadap hasil jual (proceeds).

**Keterbatasan yang disadari:** token yang diperoleh dari airdrop/transfer (bukan dari sync sebelumnya) tidak memiliki cost basis, sehingga penjualannya tidak dihitung sebagai closed trade yang valid. Harga USD berasal dari harga real-time saat sinkronisasi, bukan harga historis persis pada saat transaksi terjadi.

## API endpoints

**Per-wallet:**
```
GET  /api/transactions
GET  /api/wallets/analytics
GET  /api/wallets/:address/detail
GET  /api/wallets/import      (POST)
GET  /api/transactions/export
GET  /api/wallets/analytics/export
```

**Portfolio gabungan (semua wallet):**
```
GET  /api/portfolio/kpis
GET  /api/portfolio/equity-curve
GET  /api/portfolio/pnl-distribution
GET  /api/portfolio/win-loss
GET  /api/portfolio/top-tokens
GET  /api/portfolio/holding-time
GET  /api/portfolio/trade-history
```

## Menjalankan secara lokal

```bash
cd backend
npm install
npm start
```

Buka `http://localhost:5000/dashboard.html` di browser. Pastikan file `.env` sudah terisi kredensial Supabase.

## Laporan BI (Tableau Public)

Selain dashboard web, data wallet analytics juga diekspor dan dianalisis lewat Tableau Public — menunjukkan kemampuan mengolah data dari sumber yang sama untuk dua kebutuhan berbeda: dashboard operasional real-time (web app) dan laporan analitik mendalam (BI tool).

🔗 [Lihat laporan di Tableau Public](https://public.tableau.com/app/profile/kiriyama.ikuto/viz/SolanaWhaleTracker-WalletAnalytics/Sheet2)

## Roadmap

- [ ] Export CSV untuk data portfolio (equity curve, trade history) dari `analytics.html`
- [ ] Masking sebagian alamat wallet di laporan publik
- [ ] Custom domain untuk frontend
