import FastImage from '@d11/react-native-fast-image';
import { userService } from './userService';
import { supabase } from './supabase';

/**
 * Image Prefetch Service
 * 
 * Prefetches profile images in background to ensure they're cached
 * before users navigate to screens showing them.
 * 
 * Uses FastImage.preload() which downloads images to disk cache
 * without blocking the UI.
 */

const PREFETCH_DELAY_MS = 5000; // Wait 5 seconds after trigger before prefetching

/**
 * Prefetch the current user's profile picture and their friends' avatars.
 * Should be called after successful login/app launch.
 * 
 * Runs in background and does NOT block app startup.
 */
export async function prefetchProfileImages(currentUserId: string): Promise<void> {
    // Delay prefetch to avoid competing with critical app startup operations
    setTimeout(async () => {
        try {
            const imagesToPrefetch: { uri: string }[] = [];

            // Get current user's avatar
            const { data: currentUserProfile } = await supabase
                .from('user_profiles')
                .select('avatar_url')
                .eq('id', currentUserId)
                .single();

            if (currentUserProfile?.avatar_url) {
                imagesToPrefetch.push({ uri: currentUserProfile.avatar_url });
            }

            // Get friend avatars (users the current user is following)
            const following = await userService.getUserFollowing(currentUserId);

            // Assuming userService.getUserFollowing returns an array of objects that might have an avatar_url
            // We explicitly type 'friend' to ensure 'avatar_url' is recognized,
            // assuming it's a string or null/undefined.
            for (const friend of following as Array<{ avatar_url?: string | null }>) {
                if (friend.avatar_url) {
                    imagesToPrefetch.push({ uri: friend.avatar_url });
                }
            }

            // Limit to first 20 to avoid excessive network usage
            const limitedImages = imagesToPrefetch.slice(0, 20);

            if (limitedImages.length > 0) {
                console.log(`[ImagePrefetch] Prefetching ${limitedImages.length} profile images...`);
                FastImage.preload(limitedImages);
            }
        } catch (error) {
            // Silently fail - prefetching is an optimization, not critical
            console.warn('[ImagePrefetch] Failed to prefetch images:', error);
        }
    }, PREFETCH_DELAY_MS);
}

/**
 * Clear all cached images.
 * Useful when user logs out to free up disk space.
 */
export async function clearImageCache(): Promise<void> {
    try {
        await FastImage.clearDiskCache();
        await FastImage.clearMemoryCache();
        console.log('[ImagePrefetch] Image cache cleared');
    } catch (error) {
        console.warn('[ImagePrefetch] Failed to clear cache:', error);
    }
}
