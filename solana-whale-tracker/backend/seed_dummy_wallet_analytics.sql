-- =============================================================
-- seed_dummy_wallet_analytics.sql
-- -------------------------------------------------------------
-- HANYA UNTUK TESTING. Memasukkan data dummy trading (buy/sell)
-- supaya endpoint /api/wallets/analytics punya sesuatu untuk
-- dihitung, tanpa perlu menurunkan WHALE_THRESHOLD_SOL di .env.
--
-- Skenario yang dibuat untuk wallet 3ADzk5YDP9sgorvPSs9YPxigJiSqhgddpwHwwPwmEFib
-- (wallet yang sudah ada di watched_wallets kamu):
--
--   Trade 1 (BONK) - PROFIT:
--     buy  1,000,000 BONK @ $0.00002  = modal $20
--     sell 1,000,000 BONK @ $0.00003  = hasil $30  -> profit +$10
--
--   Trade 2 (WIF) - RUGI:
--     buy  100 WIF @ $2.50  = modal $250
--     sell 100 WIF @ $2.10  = hasil $210  -> profit -$40
--
-- Hasil akhir yang diharapkan setelah insert ini:
--   closed_trades: 2
--   win_rate_percent: 50 (1 dari 2 trade profit)
--   total_realized_profit_usd: -30 (10 - 40)
--   roi_percent: (-30 / 270) * 100 = -11.11%
--
-- Jalankan dengan:
--   psql -U postgres -d solana_whale_tracker -f seed_dummy_wallet_analytics.sql
--
-- Aman dijalankan berkali-kali karena signature dibuat unik
-- dengan random suffix tiap kali (lihat md5(random())).
-- =============================================================

-- Pastikan wallet ini terdaftar di watched_wallets (kalau belum ada, tambahkan)
INSERT INTO watched_wallets (wallet_address, label)
VALUES ('3ADzk5YDP9sgorvPSs9YPxigJiSqhgddpwHwwPwmEFib', 'Wallet Dummy Testing')
ON CONFLICT (wallet_address) DO NOTHING;

-- Trade 1: BONK - buy lalu sell dengan profit
INSERT INTO transactions (signature, wallet_address, amount, token, block_time, type, price_usd)
VALUES
  ('DUMMY_BUY_BONK_' || substr(md5(random()::text), 1, 12), '3ADzk5YDP9sgorvPSs9YPxigJiSqhgddpwHwwPwmEFib', 1000000, 'BONK', NOW() - INTERVAL '3 days', 'buy', 0.00002),
  ('DUMMY_SELL_BONK_' || substr(md5(random()::text), 1, 12), '3ADzk5YDP9sgorvPSs9YPxigJiSqhgddpwHwwPwmEFib', 1000000, 'BONK', NOW() - INTERVAL '2 days', 'sell', 0.00003);

-- Trade 2: WIF - buy lalu sell dengan rugi
INSERT INTO transactions (signature, wallet_address, amount, token, block_time, type, price_usd)
VALUES
  ('DUMMY_BUY_WIF_' || substr(md5(random()::text), 1, 12), '3ADzk5YDP9sgorvPSs9YPxigJiSqhgddpwHwwPwmEFib', 100, 'WIF', NOW() - INTERVAL '1 day 12 hours', 'buy', 2.50),
  ('DUMMY_SELL_WIF_' || substr(md5(random()::text), 1, 12), '3ADzk5YDP9sgorvPSs9YPxigJiSqhgddpwHwwPwmEFib', 100, 'WIF', NOW() - INTERVAL '6 hours', 'sell', 2.10);
