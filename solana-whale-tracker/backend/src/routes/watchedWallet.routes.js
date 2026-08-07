// =============================================================
// watchedWallet.routes.js
// -------------------------------------------------------------
// LAYER: ROUTE
// Mendeklarasikan endpoint untuk fitur daftar wallet yang dipantau.
// =============================================================

import express from 'express';
import {
  createWatchedWallet,
  listWatchedWallets,
  deleteWatchedWalletHandler,
  syncAllWatchedWalletsHandler,
  importWatchedWalletsHandler,
} from '../controllers/watchedWallet.controller.js';
import {
  getWalletAnalyticsHandler,
  exportWalletAnalyticsCsv,
  getWalletDetailHandler,
} from '../controllers/walletAnalytics.controller.js';

const router = express.Router();

router.get('/', listWatchedWallets);                          // GET    /api/wallets
router.post('/', createWatchedWallet);                        // POST   /api/wallets
router.post('/sync-all', syncAllWatchedWalletsHandler);        // POST   /api/wallets/sync-all
router.post('/import', importWatchedWalletsHandler);           // POST   /api/wallets/import
router.get('/analytics/export', exportWalletAnalyticsCsv);     // GET    /api/wallets/analytics/export
router.get('/analytics', getWalletAnalyticsHandler);           // GET    /api/wallets/analytics
router.get('/:walletAddress/detail', getWalletDetailHandler);  // GET    /api/wallets/:walletAddress/detail
router.delete('/:walletAddress', deleteWatchedWalletHandler);  // DELETE /api/wallets/:walletAddress

export default router;
