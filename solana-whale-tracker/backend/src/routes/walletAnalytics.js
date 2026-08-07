/**
 * routes/walletAnalytics.js
 * ============================================================
 * Endpoint: GET /api/wallets/analytics
 *
 * CARA PASANG (di app.js / server.js kamu, dekat route lain):
 *   const walletAnalyticsRoutes = require('./routes/walletAnalytics');
 *   app.use('/api', walletAnalyticsRoutes);
 *
 * SESUAIKAN:
 *   - path require('../db') di bawah -> ganti sesuai file koneksi
 *     database kamu yang sudah dipakai endpoint /api/stats/*.
 *   - Kalau pakai mysql2 (bukan pg), lihat catatan MYSQL di bawah.
 * ============================================================
 */

const express = require('express');
const router = express.Router();

// --- PostgreSQL (pg) ---
// Ganti path ini sesuai file koneksi pool kamu yang sudah ada.
const db = require('../db');

const {
  computeWalletMetrics,
  buildProfitHistory
} = require('../services/walletAnalyticsService');

router.get('/wallets/analytics', async (req, res) => {
  try {
    // 1. Ambil semua wallet unik yang punya transaksi
    const walletsResult = await db.query(
      'SELECT DISTINCT wallet_address FROM transactions'
    );
    const wallets = walletsResult.rows.map((r) => r.wallet_address);

    // --- Kalau pakai mysql2/promise, ganti dua baris di atas jadi:
    // const [walletsRows] = await db.query('SELECT DISTINCT wallet_address FROM transactions');
    // const wallets = walletsRows.map((r) => r.wallet_address);

    const data = [];

    for (const address of wallets) {
      const txResult = await db.query(
        `SELECT wallet_address, token, amount, type, price_usd, block_time
         FROM transactions
         WHERE wallet_address = $1
         ORDER BY block_time ASC`,
        [address]
      );
      const transactions = txResult.rows;

      // --- versi mysql2:
      // const [transactions] = await db.query(
      //   `SELECT wallet_address, token, amount, type, price_usd, block_time
      //    FROM transactions WHERE wallet_address = ? ORDER BY block_time ASC`,
      //   [address]
      // );

      const metrics = computeWalletMetrics(transactions);
      const profitHistory = buildProfitHistory(metrics.closedTrades);

      data.push({
        wallet_address: address,
        roi_percent: Number(metrics.roi.toFixed(2)),
        win_rate_percent: Number(metrics.winRate.toFixed(2)),
        avg_holding_hours: Number(metrics.avgHoldingHours.toFixed(1)),
        top_token: metrics.topToken,
        total_realized_profit_usd: Number(metrics.totalRealizedProfit.toFixed(2)),
        total_invested_usd: Number(metrics.totalInvested.toFixed(2)),
        closed_trades: metrics.closedTrades.length,
        profit_history: profitHistory
      });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('[wallet-analytics] error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal menghitung wallet analytics'
    });
  }
});

module.exports = router;
