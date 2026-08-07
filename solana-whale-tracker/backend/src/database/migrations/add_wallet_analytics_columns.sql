-- ============================================================
-- Migration: kolom tambahan untuk Wallet Analytics
-- ============================================================
-- Wallet Analytics (ROI, Win Rate, Avg Holding, Top Token,
-- Profit History) butuh tahu ARAH transaksi (beli/jual) dan
-- HARGA saat transaksi terjadi. Tanpa dua ini, sistem hanya
-- tahu "wallet X memindahkan Y token" tapi tidak tahu untung/rugi.
--
-- Jalankan sesuai database kamu (pilih salah satu blok di bawah).
-- Kalau tabel/kolom kamu sudah beda nama, sesuaikan dulu.
-- ============================================================

-- ---------- PostgreSQL ----------
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS type VARCHAR(4);        -- 'buy' | 'sell'
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS price_usd NUMERIC(20,8); -- harga token per unit saat tx (USD)

-- ---------- MySQL (8.0.29+) ----------
-- ALTER TABLE transactions ADD COLUMN IF NOT EXISTS type VARCHAR(4);
-- ALTER TABLE transactions ADD COLUMN IF NOT EXISTS price_usd DECIMAL(20,8);

-- ---------- MySQL versi lama (tidak dukung IF NOT EXISTS di ALTER COLUMN) ----------
-- Cek dulu manual apakah kolom sudah ada, baru jalankan:
-- ALTER TABLE transactions ADD COLUMN type VARCHAR(4);
-- ALTER TABLE transactions ADD COLUMN price_usd DECIMAL(20,8);

-- ============================================================
-- PENTING: kolom price_usd ini harus DIISI saat kamu insert
-- transaksi baru (di proses sync-all / listener Solana kamu).
-- Kalau belum ada sumber harga, kamu bisa ambil dari:
--   - Jupiter Price API: https://price.jup.ag/v6/price?ids=<mint>
--   - CoinGecko API (untuk SOL & token populer)
-- Simpan harga per-unit token (dalam USD) di saat block_time
-- transaksi tersebut terjadi.
--
-- Kolom `type` juga harus diisi berdasarkan arah swap:
--   - 'buy'  = wallet MENERIMA token ini
--   - 'sell' = wallet MENGIRIM/MENJUAL token ini
-- ============================================================
