// =============================================================
// priceService.js
// -------------------------------------------------------------
// LAYER: SERVICE
// Tugas file ini KHUSUS untuk satu hal: "berapa harga token X
// dalam USD saat ini?" — dipanggil oleh transaction.service.js
// setiap kali ada swap yang perlu diberi price_usd.
//
// CATATAN UNTUK BELAJAR (baca ini kalau bingung kenapa harganya
// kadang "kurang pas" dibanding harga asli saat transaksi lama):
// Jupiter Price API memberi harga TERKINI (real-time), bukan
// harga historis persis pada block_time transaksi. Untuk whale
// tracker yang sync secara berkala (dekat real-time), ini cukup
// akurat. Tapi kalau sync transaksi yang sudah berumur hari/minggu,
// harga yang tersimpan akan meleset dari harga asli saat itu.
// Ini trade-off yang wajar untuk proyek belajar — bukan bug.
// Kalau nanti mau harga historis yang benar-benar akurat, itu
// butuh provider berbayar (Birdeye historical price, dsb).
// =============================================================

import axios from 'axios';

// Endpoint publik Jupiter Price API v2. Tidak butuh API key.
const JUPITER_PRICE_URL = 'https://api.jup.ag/price/v2';

// Mint address SOL "native" versi wrapped — dipakai Jupiter sebagai
// representasi SOL di semua endpoint yang minta "token mint".
const SOL_MINT = 'So11111111111111111111111111111111111111112';

// Cache sangat sederhana di memori (bertahan selama proses Node
// hidup) supaya kalau banyak transaksi dalam satu sync memakai
// token yang sama, kita tidak memanggil Jupiter berkali-kali untuk
// mint yang sama dalam rentang waktu singkat.
const priceCache = new Map(); // mint -> { price, cachedAt }
const CACHE_TTL_MS = 30_000; // 30 detik

/**
 * Ambil harga USD terkini untuk SATU mint token dari Jupiter.
 * Mengembalikan 0 kalau gagal/tidak ditemukan (SENGAJA tidak
 * melempar error) — supaya satu token yang harganya tidak
 * ditemukan tidak menggagalkan seluruh proses sync.
 *
 * @param {string} mint - Alamat mint token (pakai SOL_MINT untuk SOL)
 * @returns {Promise<number>} harga per unit token dalam USD
 */
export const getTokenPriceUsd = async (mint) => {
  const cached = priceCache.get(mint);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const response = await axios.get(JUPITER_PRICE_URL, {
      params: { ids: mint },
    });

    // Bentuk response Jupiter v2: { data: { [mint]: { price: "123.45" } } }
    const priceStr = response.data?.data?.[mint]?.price;
    const price = priceStr ? parseFloat(priceStr) : 0;

    priceCache.set(mint, { price, cachedAt: Date.now() });
    return price;
  } catch (error) {
    console.error(`⚠️ Gagal ambil harga untuk mint ${mint}:`, error.message);
    return 0;
  }
};

export const JUPITER_SOL_MINT = SOL_MINT;
