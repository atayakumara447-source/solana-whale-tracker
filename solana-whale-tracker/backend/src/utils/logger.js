// =============================================================
// logger.js
// -------------------------------------------------------------
// Utility logging sederhana. Dipusatkan di satu file supaya
// kalau nanti mau ganti ke library logging yang lebih canggih
// (misal Winston atau Pino), cukup ubah di sini saja — bagian
// lain aplikasi yang memanggil logger.info() dsb tidak perlu diubah.
// =============================================================

export const logger = {
  info: (message) => console.log(`ℹ️  [INFO] ${message}`),
  error: (message) => console.error(`❌ [ERROR] ${message}`),
  warn: (message) => console.warn(`⚠️  [WARN] ${message}`),
};
