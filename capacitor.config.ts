import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'il.gov.court.mobile',
  appName: 'נט המשפט',
  webDir: 'www',
  server: {
    androidScheme: 'http',
    hostname: 'bamadevws112',
    // allowNavigation: [
    //   'http://bamarcws112/*',
    //   'http://10.55.14.17/*',
    //   'http://*.bama.ngcs.net/*',
    //   'https://bamarcws112/*',
    //   'https://10.55.14.17/*',
    //   'https://Mngcs.court.gov.il/*',
    //   'https://*.bama.ngcs.net/*',
    // ],
    cleartext: true,
  },
  android: {
    minWebViewVersion: 100,
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true, // Disable in production
    loggingBehavior: 'debug', // Change to 'none' in production
    path: 'android',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'default',
      backgroundColor: '#ffffff',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    App: {
      launchUrl: 'https://mngcs.court.gov.il',
    },
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
