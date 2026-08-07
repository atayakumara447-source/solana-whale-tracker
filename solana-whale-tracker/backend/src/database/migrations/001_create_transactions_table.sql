-- =============================================================
-- 001_create_transactions_table.sql
-- -------------------------------------------------------------
-- Skema awal untuk menyimpan transaksi whale yang diambil dari
-- Solscan. Sengaja ditulis sebagai file SQL murni (bukan lewat
-- ORM) agar transparan — siapa pun bisa melihat langsung
-- struktur database tanpa perlu membaca kode ORM.
-- =============================================================

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  signature VARCHAR(128) UNIQUE NOT NULL,   -- Signature transaksi Solana (identifier unik)
  wallet_address VARCHAR(64) NOT NULL,      -- Alamat wallet yang melakukan transaksi
  amount NUMERIC(20, 9) NOT NULL,           -- Jumlah SOL (9 desimal, sesuai presisi Solana)
  token VARCHAR(20) DEFAULT 'SOL',          -- Simbol token (SOL, USDC, dll.)
  block_time TIMESTAMP NOT NULL,            -- Waktu transaksi terjadi di on-chain
  created_at TIMESTAMP DEFAULT NOW()        -- Waktu data ini tersimpan di database kita
);

CREATE INDEX IF NOT EXISTS idx_transactions_amount ON transactions(amount);
CREATE INDEX IF NOT EXISTS idx_transactions_block_time ON transactions(block_time);