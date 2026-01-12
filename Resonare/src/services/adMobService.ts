import mobileAds, { MaxAdContentRating } from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';
import { Environment } from '../config/environment';

/**
 * AdMob Ad Unit IDs
 * Use test IDs for development, real IDs for production
 */
export const AdUnitIds = {
  banner: Platform.select({
    ios: Environment.isProduction
      ? 'ca-app-pub-5443760017915120/2921056271' // iOS banner ad unit ID
      : 'ca-app-pub-3940256099942544/2934735716', // Test ID
    android: Environment.isProduction
      ? 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY' // Replace with your real Android banner ad unit ID
      : 'ca-app-pub-3940256099942544/6300978111', // Test ID
  }),
  interstitial: Platform.select({
    ios: Environment.isProduction
      ? 'ca-app-pub-5443760017915120/2817663232' // iOS interstitial ad unit ID
      : 'ca-app-pub-3940256099942544/4411468910', // Test ID
    android: Environment.isProduction
      ? 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY' // Replace with your real Android interstitial ad unit ID
      : 'ca-app-pub-3940256099942544/1033173712', // Test ID
  }),
  rewarded: Platform.select({
    ios: Environment.isProduction
      ? 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY' // Replace with your real iOS rewarded ad unit ID
      : 'ca-app-pub-3940256099942544/1712485313', // Test ID
    android: Environment.isProduction
      ? 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY' // Replace with your real Android rewarded ad unit ID
      : 'ca-app-pub-3940256099942544/5224354917', // Test ID
  }),
};

/**
 * Initialize AdMob
 * Should be called once when the app starts
 */
export const initializeAdMob = async (): Promise<void> => {
  try {
    // Initialize the Google Mobile Ads SDK
    await mobileAds().initialize();

    // Optional: Configure settings
    await mobileAds().setRequestConfiguration({
      // Set maximum ad content rating (G, PG, T, MA)
      maxAdContentRating: MaxAdContentRating.PG,

      // Tag for child-directed treatment (true/false/null for unspecified)
      tagForChildDirectedTreatment: false,

      // Tag for under age of consent
      tagForUnderAgeOfConsent: false,

      // Add test device IDs for development
      // testDeviceIdentifiers: ['EMULATOR'], // Add your device ID here for testing
    });

    if (Environment.isDevelopment) {
      console.log('✅ AdMob initialized successfully');
    }
  } catch (error) {
    console.error('Failed to initialize AdMob:', error);
    throw error;
  }
};

/**
 * Check if AdMob is initialized
 */
export const isAdMobInitialized = async (): Promise<boolean> => {
  try {
    await mobileAds().initialize();
    return true;
  } catch {
    return false;
  }
};
