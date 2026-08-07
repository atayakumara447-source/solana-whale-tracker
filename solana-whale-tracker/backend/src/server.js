// =============================================================
// server.js
// -------------------------------------------------------------
// Titik masuk (entry point) sebenarnya dari aplikasi.
// Satu-satunya tugasnya: menyalakan server dan "mendengarkan"
// (listen) di port tertentu.
//
// Dipisah dari app.js supaya konfigurasi aplikasi (app.js) tetap
// bersih dan bisa dites tanpa membuka koneksi jaringan sungguhan.
// =============================================================

import app from './app.js';
import { env } from './config/env.js';

app.listen(env.port, () => {
  console.log(`🚀 Server berjalan di http://localhost:${env.port}`);
});
