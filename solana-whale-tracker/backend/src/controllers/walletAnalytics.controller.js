// =============================================================
// walletAnalytics.controller.js
// -------------------------------------------------------------
// LAYER: CONTROLLER
// Menangani request/response HTTP untuk endpoint Wallet Analytics.
// Sengaja dipisah dari watchedWallet.controller.js karena ini
// adalah domain berbeda (analisis performa trading), bukan
// pengelolaan daftar wallet pantauan (CRUD).
// =============================================================

import { getAllWalletAnalytics, getWalletDetail } from '../services/walletAnalytics.service.js';
import { toCsv } from '../utils/csv.js';

/**
 * GET /api/wallets/analytics
 * Mengembalikan metrik trading (ROI, win rate, avg holding,
 * profit history) untuk setiap wallet yang dipantau dan sudah
 * punya riwayat closed trade.
 */
export const getWalletAnalyticsHandler = async (req, res, next) => {
  try {
    const analytics = await getAllWalletAnalytics();

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/wallets/analytics/export
 * Mengunduh ringkasan Wallet Analytics sebagai file CSV.
 *
 * PENTING: route ini harus didaftarkan SEBELUM route DELETE
 * /:walletAddress di watchedWallet.routes.js kalau suatu saat ada
 * GET /:walletAddress juga — untuk sekarang aman karena tidak ada
 * bentrok method, tapi kebiasaan ini penting diingat.
 *
 * Kolom profit_history SENGAJA tidak diikutkan di CSV karena
 * isinya array bersarang (tidak cocok jadi satu sel CSV) — kalau
 * butuh riwayat lengkap, gunakan endpoint JSON biasa.
 */
export const exportWalletAnalyticsCsv = async (req, res, next) => {
  try {
    const analytics = await getAllWalletAnalytics();

    const csv = toCsv(analytics, [
      { key: 'wallet_address', header: 'Wallet Address' },
      { key: 'label', header: 'Label' },
      { key: 'top_token', header: 'Top Token' },
      { key: 'roi_percent', header: 'ROI (%)' },
      { key: 'win_rate_percent', header: 'Win Rate (%)' },
      { key: 'avg_holding_hours', header: 'Avg Holding (jam)' },
      { key: 'closed_trades', header: 'Closed Trades' },
      { key: 'total_realized_profit_usd', header: 'Total Profit (USD)' },
    ]);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="wallet_analytics.csv"');
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/wallets/:walletAddress/detail
 * Mengembalikan detail lengkap satu wallet: info dasar, seluruh
 * riwayat transaksi, seluruh closed trades, dan metrik analytics.
 * Membalas 404 kalau wallet tidak ada di daftar pantauan.
 */
export const getWalletDetailHandler = async (req, res, next) => {
  try {
    const { walletAddress } = req.params;
    const detail = await getWalletDetail(walletAddress);

    if (!detail) {
      return res.status(404).json({
        success: false,
        message: 'Wallet tidak ditemukan di daftar pantauan',
      });
    }

    res.status(200).json({
      success: true,
      data: detail,
    });
  } catch (error) {
    next(error);
  }
};
