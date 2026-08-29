/**
 * Plesk Node.js / Passenger startup dosyasi.
 * Application Startup File: server.js (veya dist/main.js)
 */
/* global PhusionPassenger */
if (typeof PhusionPassenger !== 'undefined') {
  PhusionPassenger.configure({ autoInstall: false });
}

require('./dist/main.js');
