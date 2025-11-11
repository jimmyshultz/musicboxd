import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { AdUnitIds } from '../services/adMobService';

interface BannerAdComponentProps {
  /**
   * Size of the banner ad
   * Options: BANNER, LARGE_BANNER, MEDIUM_RECTANGLE, FULL_BANNER, LEADERBOARD
   */
  size?: BannerAdSize;
  
  /**
   * Optional: Override the ad unit ID
   */
  adUnitId?: string;
}

/**
 * Banner Ad Component
 * 
 * Displays a banner advertisement using Google AdMob
 * Automatically uses test ads in development and real ads in production
 * 
 * @example
 * ```tsx
 * <BannerAdComponent />
 * <BannerAdComponent size={BannerAdSize.MEDIUM_RECTANGLE} />
 * ```
 */
const BannerAdComponent: React.FC<BannerAdComponentProps> = ({
  size = BannerAdSize.BANNER,
  adUnitId,
}) => {
  // Use provided ad unit ID or default from service
  const unitId = adUnitId || AdUnitIds.banner || TestIds.BANNER;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={unitId}
        size={size}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => {
          if (__DEV__) {
            console.log('Banner ad loaded');
          }
        }}
        onAdFailedToLoad={(error) => {
          if (__DEV__) {
            console.warn('Banner ad failed to load:', error);
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});

export default BannerAdComponent;

