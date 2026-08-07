-- =============================================================
-- 003_add_wallet_analytics_columns.sql
-- -------------------------------------------------------------
-- Menambahkan kolom yang dibutuhkan untuk menghitung Wallet
-- Analytics (ROI, win rate, profit history, dsb).
--
--   type      : apakah transaksi ini 'buy' atau 'sell'. Tanpa ini
--               kita tidak bisa tahu kapan sebuah "posisi" pada
--               satu token dibuka/ditutup.
--   price_usd : harga per unit token (USD) saat transaksi terjadi.
--               Tanpa ini kita tidak bisa menghitung profit/loss
--               nyata dalam USD, hanya jumlah token.
--
-- Kolom dibuat NULLABLE dengan default NULL supaya transaksi lama
-- (transfer SOL native polos, bukan swap) tetap valid — mereka
-- memang tidak punya cost basis untuk dihitung sebagai trade,
-- dan akan otomatis dilewati saat menghitung analytics wallet.
-- =============================================================

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS type VARCHAR(10) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_usd NUMERIC(20, 8) DEFAULT NULL;

ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS chk_transaction_type;

ALTER TABLE transactions
  ADD CONSTRAINT chk_transaction_type
  CHECK (type IS NULL OR type IN ('buy', 'sell'));

CREATE INDEX IF NOT EXISTS idx_transactions_wallet_type
  ON transactions(wallet_address, type, block_time);
