// =============================================================
// watchedWallet.controller.js
// -------------------------------------------------------------
// LAYER: CONTROLLER
// Menangani request/response HTTP untuk fitur daftar wallet
// yang dipantau (watched wallets).
// =============================================================

import {
  addWatchedWallet,
  getWatchedWallets,
  removeWatchedWallet,
  importWatchedWalletsFromCsv,
} from '../services/watchedWallet.service.js';
import { syncAllWatchedWallets } from '../services/transaction.service.js';

/**
 * POST /api/wallets
 * Menambahkan satu wallet baru ke daftar pantauan.
 * Body request: { "walletAddress": "...", "label": "..." (opsional) }
 */
export const createWatchedWallet = async (req, res, next) => {
  try {
    const { walletAddress, label } = req.body;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'walletAddress wajib diisi di body request',
      });
    }

    const wallet = await addWatchedWallet(walletAddress, label);

    if (!wallet) {
      // insertWatchedWallet mengembalikan undefined kalau wallet
      // sudah terdaftar sebelumnya (karena ON CONFLICT DO NOTHING)
      return res.status(409).json({
        success: false,
        message: 'Wallet ini sudah terdaftar di daftar pantauan',
      });
    }

    res.status(201).json({
      success: true,
      data: wallet,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/wallets
 * Mengambil semua wallet yang sedang dipantau.
 */
export const listWatchedWallets = async (req, res, next) => {
  try {
    const wallets = await getWatchedWallets();

    res.status(200).json({
      success: true,
      data: wallets,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/wallets/:walletAddress
 * Menghapus satu wallet dari daftar pantauan.
 */
export const deleteWatchedWalletHandler = async (req, res, next) => {
  try {
    const { walletAddress } = req.params;
    const deleted = await removeWatchedWallet(walletAddress);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Wallet tidak ditemukan di daftar pantauan',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Wallet berhasil dihapus dari daftar pantauan',
      data: deleted,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/wallets/import
 * Mengimpor banyak wallet sekaligus dari isi file CSV.
 *
 * Body request yang diharapkan: { "csvText": "wallet_address,label\n..." }
 *
 * Kenapa csvText (bukan file upload biasa)? Supaya tidak perlu
 * dependency tambahan seperti multer — frontend cukup membaca isi
 * file lewat FileReader di browser, lalu mengirim ISI TEKSNYA
 * (bukan file mentahnya) sebagai string biasa dalam JSON.
 */
export const importWatchedWalletsHandler = async (req, res, next) => {
  try {
    const { csvText } = req.body;

    if (!csvText || typeof csvText !== 'string' || csvText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'csvText wajib diisi di body request dan tidak boleh kosong',
      });
    }

    const result = await importWatchedWalletsFromCsv(csvText);

    res.status(200).json({
      success: true,
      message: `${result.imported} wallet berhasil diimpor, ${result.skipped} dilewati (sudah terdaftar), ${result.errors.length} baris gagal`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/wallets/sync-all
 * Menjalankan proses sync untuk SEMUA wallet di daftar pantauan
 * sekaligus, satu per satu, lalu mengembalikan ringkasan hasilnya
 * per wallet.
 */
export const syncAllWatchedWalletsHandler = async (req, res, next) => {
  try {
    const results = await syncAllWatchedWallets();

    res.status(200).json({
      success: true,
      message: `Sync selesai untuk ${results.length} wallet`,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};