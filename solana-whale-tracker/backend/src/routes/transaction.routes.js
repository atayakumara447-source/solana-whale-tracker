// =============================================================
// transaction.routes.js
// -------------------------------------------------------------
// LAYER: ROUTE
// File ini HANYA mendeklarasikan "URL apa memicu fungsi controller
// apa". Tidak ada logika di sini sama sekali — tujuannya supaya
// siapa pun bisa membaca file ini dan langsung tahu seluruh
// endpoint yang tersedia tanpa perlu membaca logika di dalamnya.
// =============================================================

import express from 'express';
import {
  getWhaleTransactions,
  getTransactionById,
  syncTransactions,
  exportTransactionsCsv,
} from '../controllers/transaction.controller.js';

const router = express.Router();

// PENTING: /export harus didaftarkan SEBELUM /:id — kalau tidak,
// Express akan mengira "export" adalah nilai parameter :id.
router.get('/export', exportTransactionsCsv); // GET  /api/transactions/export
router.get('/', getWhaleTransactions);        // GET  /api/transactions
router.get('/:id', getTransactionById);       // GET  /api/transactions/:id
router.post('/sync', syncTransactions);       // POST /api/transactions/sync

export default router;
