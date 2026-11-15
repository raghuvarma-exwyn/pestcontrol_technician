import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ae.rak.pestcontrol.technician.app',
  appName: 'Pest Control Technician App',
  webDir: 'dist',
  server: {
    // Local WebView origin only. Remote APIs stay HTTPS.
    // androidScheme https makes Chromium TLS-handshake localhost and logs net_error -202.
    androidScheme: "http",
    cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
