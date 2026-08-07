// =============================================================
// stats.routes.js
// -------------------------------------------------------------
// LAYER: ROUTE
// Mendeklarasikan endpoint untuk statistik dashboard.
// =============================================================

import express from 'express';
import {
  getHeatmapHandler,
  getSummaryHandler,
  getRecentTransactionsHandler,
} from '../controllers/stats.controller.js';

const router = express.Router();

router.get('/heatmap', getHeatmapHandler);
router.get('/summary', getSummaryHandler);
router.get('/recent', getRecentTransactionsHandler);

export default router;