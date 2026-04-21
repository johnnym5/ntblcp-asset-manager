let config: any;

try {
  // Guard against missing @capacitor/cli in production builds
  const capacitorConfig = require('@capacitor/cli');
  config = {
    appId: 'com.assetain.app',
    appName: 'assetain',
    webDir: 'out'
  } as any;
} catch (e) {
  // Fallback for App Hosting builds where Capacitor is not needed
  config = {
    appId: 'com.assetain.app',
    appName: 'assetain',
    webDir: 'out'
  };
}

export default config;
