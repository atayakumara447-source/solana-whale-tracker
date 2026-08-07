// =============================================================
// stats.controller.js
// -------------------------------------------------------------
// LAYER: CONTROLLER
// Menangani request HTTP untuk statistik dashboard.
// =============================================================

import { getTokenHeatmap, getSummaryStats, getRecentTransactions } from '../services/stats.service.js';

export const getHeatmapHandler = async (req, res) => {
  try {
    const data = await getTokenHeatmap();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getHeatmapHandler:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data heatmap' });
  }
};

export const getSummaryHandler = async (req, res) => {
  try {
    const data = await getSummaryStats();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getSummaryHandler:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil ringkasan statistik' });
  }
};

export const getRecentTransactionsHandler = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const data = await getRecentTransactions(limit);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getRecentTransactionsHandler:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil transaksi terbaru' });
  }
};
