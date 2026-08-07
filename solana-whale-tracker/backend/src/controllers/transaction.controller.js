// =============================================================
// transaction.controller.js
// -------------------------------------------------------------
// LAYER: CONTROLLER
// Tugas controller: MENERIMA request HTTP, MEMANGGIL service yang
// sesuai, lalu MENGIRIM response. Tidak ada logika bisnis atau
// query SQL di sini — controller hanya "penghubung" antara HTTP
// dan service.
// =============================================================

import {
  syncWhaleTransactions,
  getStoredWhaleTransactions,
  getWhaleTransactionById,
} from '../services/transaction.service.js';
import { toCsv } from '../utils/csv.js';

/**
 * GET /api/transactions
 * Mengambil daftar transaksi whale yang tersimpan di database.
 */
export const getWhaleTransactions = async (req, res, next) => {
  try {
    // Query param "limit" bersifat opsional, default ditangani di service/model
    const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
    const transactions = await getStoredWhaleTransactions(limit);

    res.status(200).json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    // Melempar ke middleware errorHandler.js (bukan menangani di sini)
    // agar penanganan error konsisten di seluruh aplikasi.
    next(error);
  }
};

/**
 * GET /api/transactions/:id
 * Mengambil satu transaksi berdasarkan ID.
 */
export const getTransactionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const transaction = await getWhaleTransactionById(id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaksi tidak ditemukan',
      });
    }

    res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/transactions/export
 * Mengunduh SELURUH transaksi yang tersimpan sebagai file CSV,
 * supaya bisa dibuka di Excel/Google Sheets untuk analisis lebih
 * lanjut di luar dashboard.
 *
 * PENTING: route ini harus didaftarkan SEBELUM route GET /:id di
 * transaction.routes.js. Kalau tidak, Express akan menganggap kata
 * "export" sebagai nilai parameter :id (karena keduanya sama-sama
 * GET dan polanya cocok), lalu salah memanggil getTransactionById.
 */
export const exportTransactionsCsv = async (req, res, next) => {
  try {
    // Limit besar dipakai supaya praktis "semua data" ikut
    // terekspor, bukan cuma sejumlah kecil seperti default tampilan.
    const transactions = await getStoredWhaleTransactions(100000);

    const csv = toCsv(transactions, [
      { key: 'id', header: 'ID' },
      { key: 'signature', header: 'Signature' },
      { key: 'wallet_address', header: 'Wallet Address' },
      { key: 'amount', header: 'Amount' },
      { key: 'token', header: 'Token' },
      { key: 'type', header: 'Type' },
      { key: 'price_usd', header: 'Price USD' },
      { key: 'block_time', header: 'Block Time' },
      { key: 'created_at', header: 'Created At' },
    ]);

    // Header ini yang membuat browser otomatis MEN-DOWNLOAD file,
    // bukan menampilkan teks CSV mentah di tab baru.
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/transactions/sync
 * Menerima SATU alamat wallet dari body request, mengambil riwayat
 * transaksinya dari Helius, lalu menyimpan transfer yang termasuk
 * kategori "whale" ke database.
 *
 * Body request yang diharapkan: { "walletAddress": "..." }
 */
export const syncTransactions = async (req, res, next) => {
  try {
    const { walletAddress } = req.body;

    // Validasi input di level controller — ini tanggung jawab
    // controller (memvalidasi bentuk request HTTP), bukan service.
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'walletAddress wajib diisi di body request',
      });
    }

    const savedTransactions = await syncWhaleTransactions(walletAddress);

    res.status(200).json({
      success: true,
      message: `${savedTransactions.length} transaksi whale baru disimpan untuk wallet ${walletAddress}`,
      data: savedTransactions,
    });
  } catch (error) {
    next(error);
  }
};