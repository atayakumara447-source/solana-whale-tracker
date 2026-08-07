// =============================================================
// errorHandler.js
// -------------------------------------------------------------
// Middleware ERROR HANDLING global. Express mengenali middleware
// ini sebagai "error handler" karena memiliki 4 parameter
// (err, req, res, next) — bukan 3 seperti middleware biasa.
//
// Kenapa penting?
// Tanpa ini, setiap controller harus menulis try/catch dengan
// format response error masing-masing (tidak konsisten). Dengan
// pola ini, controller cukup panggil next(error) dan semua error
// akan diformat SAMA di satu tempat.
// =============================================================

export const errorHandler = (err, req, res, next) => {
  console.error('🔥 Error:', err.message);

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Terjadi kesalahan pada server',
  });
};
