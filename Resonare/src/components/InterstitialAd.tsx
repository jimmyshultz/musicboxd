import { useEffect, useState } from 'react';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { AdUnitIds } from '../services/adMobService';

/**
 * Hook to manage interstitial ads
 * 
 * @example
 * ```tsx
 * const { showAd, isLoaded } = useInterstitialAd();
 * 
 * // Show ad when needed
 * if (isLoaded) {
 *   showAd();
 * }
 * ```
 */
export const useInterstitialAd = (adUnitId?: string) => {
  const [interstitial, setInterstitial] = useState<InterstitialAd | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Use provided ad unit ID or default from service
    const unitId = adUnitId || AdUnitIds.interstitial || TestIds.INTERSTITIAL;
    
    // Create interstitial ad instance
    const ad = InterstitialAd.createForAdRequest(unitId, {
      requestNonPersonalizedAdsOnly: false,
    });

    // Set up event listeners
    const unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      setIsLoaded(true);
      setIsLoading(false);
      if (__DEV__) {
        console.log('Interstitial ad loaded');
      }
    });

    const unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
      setIsLoading(false);
      if (__DEV__) {
        console.warn('Interstitial ad error:', error);
      }
    });

    const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      setIsLoaded(false);
      // Automatically load the next ad
      ad.load();
      setIsLoading(true);
    });

    setInterstitial(ad);
    
    // Load the ad
    ad.load();
    setIsLoading(true);

    // Cleanup
    return () => {
      unsubscribeLoaded();
      unsubscribeError();
      unsubscribeClosed();
    };
  }, [adUnitId]);

  const showAd = () => {
    if (isLoaded && interstitial) {
      interstitial.show();
    } else {
      if (__DEV__) {
        console.warn('Interstitial ad not loaded yet');
      }
    }
  };

  return {
    showAd,
    isLoaded,
    isLoading,
  };
};

