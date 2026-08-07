// =============================================================
// solscan.service.js
// -------------------------------------------------------------
// LAYER: SERVICE
// CATATAN: nama file ini tetap "solscan.service.js" untuk
// konsistensi struktur proyek, TAPI isinya sekarang memanggil
// Helius API (bukan Solscan). Ini terjadi karena Solscan Pro API
// berbayar, sedangkan Helius punya free tier yang cukup untuk
// kebutuhan portofolio ini.
//
// Tugas file ini KHUSUS untuk komunikasi dengan provider data
// blockchain (Helius). Tidak ada logika bisnis "whale" di sini —
// itu urusan transaction.service.js. File ini hanya urusan
// "bagaimana cara mengambil data transaksi mentah dari Helius".
//
// Kenapa dipisah dari transaction.service.js?
// Supaya kalau kita ganti provider lagi di masa depan, kita HANYA
// mengubah file ini — logika bisnis di tempat lain tidak perlu disentuh.
// Ini sudah terbukti berguna: kita baru saja pindah dari Solscan ke
// Helius tanpa mengubah controller atau model sama sekali.
// =============================================================

import axios from 'axios';
import { env } from '../config/env.js';

// Base URL resmi Helius untuk endpoint "Enhanced Transactions"
// (mengambil riwayat transaksi yang sudah di-parse/human-readable
// berdasarkan alamat wallet).
const HELIUS_BASE_URL = 'https://api.helius.xyz/v0';

/**
 * Mengambil riwayat transaksi untuk SATU alamat wallet dari Helius.
 * Ini menggantikan konsep "ambil semua transaksi network" (yang
 * butuh paket berbayar) dengan "ambil transaksi milik wallet
 * tertentu yang diinput user" — cukup dengan free tier Helius.
 *
 * @param {string} walletAddress - Alamat wallet Solana yang ingin dilacak
 * @param {number} limit - Jumlah transaksi terbaru yang diambil (default 50)
 */
export const fetchTransactionsByAddress = async (walletAddress, limit = 50) => {
  try {
    const response = await axios.get(
      `${HELIUS_BASE_URL}/addresses/${walletAddress}/transactions`,
      {
        params: {
          'api-key': env.solscanApiKey, // nama variabel env tetap solscanApiKey, isinya Helius key
          limit,
        },
      }
    );
    return response.data;
  } catch (error) {
    // Melempar ulang error dengan pesan yang lebih jelas,
    // supaya layer di atasnya (service/controller) tahu ini
    // masalah dari pihak eksternal (Helius), bukan bug internal.
    console.error('❌ Gagal mengambil data dari Helius:', error.message);
    throw new Error('Gagal terhubung ke Helius API');
  }
};