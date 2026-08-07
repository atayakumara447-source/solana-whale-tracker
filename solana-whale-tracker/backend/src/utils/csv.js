// =============================================================
// csv.js
// -------------------------------------------------------------
// LAYER: UTILITY
// Fungsi sederhana untuk mengubah array of objects menjadi teks
// CSV, dan sebaliknya (parsing teks CSV menjadi array of objects).
//
// SENGAJA ditulis manual tanpa library (misal json2csv, csv-parse)
// karena kebutuhan kita sederhana: kolom-kolom rata (flat), tidak
// ada nested object, dan datanya tidak akan mengandung karakter
// aneh dalam jumlah besar. Untuk kasus yang lebih kompleks (CSV
// dengan koma di dalam teks, quote bersarang, dsb.), sebaiknya
// pakai library khusus — tapi untuk belajar, versi manual ini
// lebih mudah dipahami alurnya.
// =============================================================

/**
 * Membungkus satu nilai sel CSV dengan tanda kutip kalau nilainya
 * mengandung koma, kutip, atau baris baru — supaya tidak merusak
 * struktur kolom saat dibuka di Excel/Google Sheets.
 */
function escapeCsvValue(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  const needsQuoting = str.includes(',') || str.includes('"') || str.includes('\n');
  if (!needsQuoting) return str;
  // Tanda kutip ganda di dalam nilai harus di-escape jadi dua kutip ganda ("")
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Mengubah array of objects menjadi teks CSV.
 *
 * @param {Array<object>} rows - data yang mau diekspor
 * @param {Array<{key: string, header: string}>} columns - urutan & nama kolom
 * @returns {string} teks CSV lengkap (termasuk baris header)
 */
export function toCsv(rows, columns) {
  const headerLine = columns.map(col => escapeCsvValue(col.header)).join(',');

  const dataLines = rows.map(row =>
    columns.map(col => escapeCsvValue(row[col.key])).join(',')
  );

  // CRLF (\r\n) dipakai karena itu standar CSV yang paling kompatibel
  // dengan Excel di Windows, meskipun \n saja biasanya juga jalan.
  return [headerLine, ...dataLines].join('\r\n');
}

/**
 * Mengubah teks CSV menjadi array of objects, memakai baris
 * pertama sebagai nama kolom (header). Setiap baris berikutnya
 * jadi satu object dengan key sesuai header.
 *
 * CATATAN KETERBATASAN: parser ini TIDAK menangani koma di dalam
 * nilai yang di-quote (misal `"Jakarta, Indonesia"`). Untuk file
 * import wallet kita (cuma wallet_address & label sederhana), ini
 * cukup. Kalau butuh parsing CSV yang lebih robust, pakai library
 * seperti csv-parse.
 *
 * @param {string} csvText - isi file CSV mentah
 * @returns {Array<object>}
 */
export function parseCsv(csvText) {
  const lines = csvText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0); // buang baris kosong (termasuk baris kosong di akhir file)

  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    rows.push(row);
  }

  return rows;
}
