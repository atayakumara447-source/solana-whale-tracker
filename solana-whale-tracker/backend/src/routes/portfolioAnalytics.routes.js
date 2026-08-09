// =============================================================
// portfolioAnalytics.routes.js
// -------------------------------------------------------------
// LAYER: ROUTE
// Mendeklarasikan endpoint untuk data portfolio gabungan (dipakai
// halaman analytics.html).
// =============================================================

import express from 'express';
import {
  getPortfolioKpisHandler,
  getEquityCurveHandler,
  getPnlDistributionHandler,
  getWinLossRatioHandler,
  getTopTokensHandler,
  getHoldingTimeDistributionHandler,
  getTradeHistoryHandler,
} from '../controllers/portfolioAnalytics.controller.js';

const router = express.Router();

router.get('/kpis', getPortfolioKpisHandler);                       // GET /api/portfolio/kpis
router.get('/equity-curve', getEquityCurveHandler);                  // GET /api/portfolio/equity-curve
router.get('/pnl-distribution', getPnlDistributionHandler);          // GET /api/portfolio/pnl-distribution
router.get('/win-loss', getWinLossRatioHandler);                     // GET /api/portfolio/win-loss
router.get('/top-tokens', getTopTokensHandler);                      // GET /api/portfolio/top-tokens
router.get('/holding-time', getHoldingTimeDistributionHandler);      // GET /api/portfolio/holding-time
router.get('/trade-history', getTradeHistoryHandler);                // GET /api/portfolio/trade-history

export default router;
