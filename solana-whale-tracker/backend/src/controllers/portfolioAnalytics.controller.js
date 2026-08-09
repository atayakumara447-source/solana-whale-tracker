// =============================================================
// portfolioAnalytics.controller.js
// -------------------------------------------------------------
// LAYER: CONTROLLER
// Menangani request/response HTTP untuk halaman analytics.html —
// data GABUNGAN dari seluruh wallet yang dipantau (KPI cards,
// equity curve, distribusi PnL, win/loss, top tokens, holding
// time, dan trade history).
//
// Sengaja dipisah dari walletAnalytics.controller.js (yang
// menangani data PER-wallet untuk dashboard.html dan
// wallet-detail.html) supaya kedua domain tetap jelas batasnya.
// =============================================================

import {
  getPortfolioKpis,
  getEquityCurve,
  getPnlDistribution,
  getWinLossRatio,
  getTopTokens,
  getHoldingTimeDistribution,
  getTradeHistory,
} from '../services/walletAnalytics.service.js';

/** GET /api/portfolio/kpis */
export const getPortfolioKpisHandler = async (req, res, next) => {
  try {
    const data = await getPortfolioKpis();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/** GET /api/portfolio/equity-curve */
export const getEquityCurveHandler = async (req, res, next) => {
  try {
    const data = await getEquityCurve();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/** GET /api/portfolio/pnl-distribution */
export const getPnlDistributionHandler = async (req, res, next) => {
  try {
    const data = await getPnlDistribution();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/** GET /api/portfolio/win-loss */
export const getWinLossRatioHandler = async (req, res, next) => {
  try {
    const data = await getWinLossRatio();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/** GET /api/portfolio/top-tokens?limit=10 */
export const getTopTokensHandler = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const data = await getTopTokens(limit);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/** GET /api/portfolio/holding-time */
export const getHoldingTimeDistributionHandler = async (req, res, next) => {
  try {
    const data = await getHoldingTimeDistribution();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/** GET /api/portfolio/trade-history?limit=100 */
export const getTradeHistoryHandler = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;
    const data = await getTradeHistory(limit);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
