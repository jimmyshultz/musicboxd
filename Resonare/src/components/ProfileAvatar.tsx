import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import { useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/FontAwesome';

interface ProfileAvatarProps {
  uri?: string | null;
  size: number;
  style?: object;
}

/**
 * ProfileAvatar - A FastImage-based avatar component with caching
 *
 * Replaces Avatar.Image from react-native-paper for profile pictures.
 * Uses FastImage for disk caching and shows a proper loading state
 * instead of falling back to a purple icon.
 */
export default function ProfileAvatar({
  uri,
  size,
  style,
}: ProfileAvatarProps) {
  const theme = useTheme();
  const [hasError, setHasError] = useState(false);

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    overflow: 'hidden' as const,
    backgroundColor: theme.colors.surfaceVariant,
  };

  // Show placeholder if no URI or if there was a loading error
  if (!uri || hasError) {
    return (
      <View style={[containerStyle, styles.placeholder, style]}>
        <Icon
          name="user"
          size={size * 0.5}
          color={theme.colors.onSurfaceVariant}
        />
      </View>
    );
  }

  return (
    <View style={[containerStyle, style]}>
      <FastImage
        source={{
          uri,
          priority: FastImage.priority.normal,
          cache: FastImage.cacheControl.immutable,
        }}
        style={styles.image}
        resizeMode={FastImage.resizeMode.cover}
        onError={() => setHasError(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
