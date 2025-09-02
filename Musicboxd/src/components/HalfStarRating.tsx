import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';

interface HalfStarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const HalfStarRating: React.FC<HalfStarRatingProps> = ({
  rating,
  onRatingChange,
  disabled = false,
  size = 'medium'
}) => {
  const theme = useTheme();

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { fontSize: 16, marginHorizontal: 1 };
      case 'large':
        return { fontSize: 28, marginHorizontal: 3 };
      default:
        return { fontSize: 20, marginHorizontal: 2 };
    }
  };

  const sizeStyles = getSizeStyles();

  const handleStarPress = (starNumber: number, event: any) => {
    if (disabled) return;

    // Get touch position relative to the star
    const { locationX } = event.nativeEvent;
    const starWidth = sizeStyles.fontSize + (sizeStyles.marginHorizontal * 2);
    const isLeftSide = locationX < starWidth / 2;
    
    const newRating = isLeftSide ? starNumber - 0.5 : starNumber;
    
    // If clicking on the currently selected rating, remove it
    if (newRating === rating) {
      onRatingChange(0);
    } else {
      onRatingChange(newRating);
    }
  };

  const renderStar = (starNumber: number) => {
    const fullStarThreshold = starNumber;
    const halfStarThreshold = starNumber - 0.5;

    if (rating >= fullStarThreshold) {
      // Full star
      return (
        <Text style={[styles.star, sizeStyles, { color: theme.colors.primary }]}>
          ★
        </Text>
      );
    } else if (rating >= halfStarThreshold) {
      // Half star - use stacked approach for precise half-fill
      return (
        <View style={styles.starContainer}>
          {/* Background empty star */}
          <Text style={[styles.star, sizeStyles, { color: '#ddd' }]}>
            ★
          </Text>
          {/* Foreground half star - clipped to left 50% */}
          <View style={[styles.halfStarWrapper, { width: sizeStyles.fontSize * 0.5 }]}>
            <Text style={[styles.star, styles.halfStar, sizeStyles, { color: theme.colors.primary }]}>
              ★
            </Text>
          </View>
        </View>
      );
    } else {
      // Empty star
      return (
        <Text style={[styles.star, sizeStyles, { color: '#ddd' }]}>
          ☆
        </Text>
      );
    }
  };

  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((starNumber) => (
        <TouchableOpacity
          key={starNumber}
          onPress={(event) => handleStarPress(starNumber, event)}
          disabled={disabled}
          activeOpacity={0.7}
          style={[styles.starTouchable, disabled && styles.starDisabled]}
        >
          {renderStar(starNumber)}
        </TouchableOpacity>
      ))}
    </View>
  );
};

interface HalfStarDisplayProps {
  rating: number;
  size?: 'small' | 'medium' | 'large';
}

export const HalfStarDisplay: React.FC<HalfStarDisplayProps> = ({
  rating,
  size = 'medium'
}) => {
  const theme = useTheme();

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { fontSize: 16, marginHorizontal: 1 };
      case 'large':
        return { fontSize: 28, marginHorizontal: 3 };
      default:
        return { fontSize: 20, marginHorizontal: 2 };
    }
  };

  const sizeStyles = getSizeStyles();

  const renderStar = (starNumber: number) => {
    const fullStarThreshold = starNumber;
    const halfStarThreshold = starNumber - 0.5;

    if (rating >= fullStarThreshold) {
      // Full star
      return (
        <Text style={[styles.star, sizeStyles, { color: theme.colors.primary }]}>
          ★
        </Text>
      );
    } else if (rating >= halfStarThreshold) {
      // Half star - use stacked approach for precise half-fill
      return (
        <View style={styles.starContainer}>
          {/* Background empty star */}
          <Text style={[styles.star, sizeStyles, { color: '#ddd' }]}>
            ★
          </Text>
          {/* Foreground half star - clipped to left 50% */}
          <View style={[styles.halfStarWrapper, { width: sizeStyles.fontSize * 0.5 }]}>
            <Text style={[styles.star, styles.halfStar, sizeStyles, { color: theme.colors.primary }]}>
              ★
            </Text>
          </View>
        </View>
      );
    } else {
      // Empty star
      return (
        <Text style={[styles.star, sizeStyles, { color: '#ddd' }]}>
          ☆
        </Text>
      );
    }
  };

  return (
    <View style={styles.displayContainer}>
      {[1, 2, 3, 4, 5].map((starNumber) => (
        <View key={starNumber} style={styles.starTouchable}>
          {renderStar(starNumber)}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  displayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  starContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
  halfStar: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  starDisabled: {
    opacity: 0.5,
  },
  halfStarWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
    alignItems: 'flex-start',
  },
});