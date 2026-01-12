import { useEffect, useState } from 'react';
import {
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import { AdUnitIds } from '../services/adMobService';

/**
 * Hook to manage rewarded ads
 *
 * @example
 * ```tsx
 * const { showAd, isLoaded, reward } = useRewardedAd();
 *
 * // Show ad when user wants reward
 * const handleWatchAd = () => {
 *   if (isLoaded) {
 *     showAd();
 *   }
 * };
 *
 * // Check if user earned reward
 * useEffect(() => {
 *   if (reward) {
 *     console.log('User earned:', reward.amount, reward.type);
 *     // Grant reward to user
 *   }
 * }, [reward]);
 * ```
 */
export const useRewardedAd = (adUnitId?: string) => {
  const [rewarded, setRewarded] = useState<RewardedAd | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [reward, setReward] = useState<{ type: string; amount: number } | null>(
    null,
  );

  useEffect(() => {
    // Use provided ad unit ID or default from service
    const unitId = adUnitId || AdUnitIds.rewarded || TestIds.REWARDED;

    // Create rewarded ad instance
    const ad = RewardedAd.createForAdRequest(unitId, {
      requestNonPersonalizedAdsOnly: false,
    });

    // Set up event listeners
    const unsubscribeLoaded = ad.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        setIsLoaded(true);
        setIsLoading(false);
        if (__DEV__) {
          console.log('Rewarded ad loaded');
        }
      },
    );

    const unsubscribeError = ad.addAdEventListener(
      RewardedAdEventType.ERROR,
      error => {
        setIsLoading(false);
        if (__DEV__) {
          console.warn('Rewarded ad error:', error);
        }
      },
    );

    const unsubscribeEarned = ad.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      rewardEvent => {
        setReward(rewardEvent);
        if (__DEV__) {
          console.log('User earned reward:', rewardEvent);
        }
      },
    );

    const unsubscribeClosed = ad.addAdEventListener(
      RewardedAdEventType.CLOSED,
      () => {
        setIsLoaded(false);
        // Automatically load the next ad
        ad.load();
        setIsLoading(true);
      },
    );

    setRewarded(ad);

    // Load the ad
    ad.load();
    setIsLoading(true);

    // Cleanup
    return () => {
      unsubscribeLoaded();
      unsubscribeError();
      unsubscribeEarned();
      unsubscribeClosed();
    };
  }, [adUnitId]);

  const showAd = () => {
    if (isLoaded && rewarded) {
      setReward(null); // Reset reward before showing
      rewarded.show();
    } else {
      if (__DEV__) {
        console.warn('Rewarded ad not loaded yet');
      }
    }
  };

  return {
    showAd,
    isLoaded,
    isLoading,
    reward,
  };
};
