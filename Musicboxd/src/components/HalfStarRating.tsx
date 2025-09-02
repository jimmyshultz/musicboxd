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
      // Half star - show filled left half and empty right half
      return (
        <View style={styles.halfStarContainer}>
          <Text style={[styles.star, sizeStyles, { color: theme.colors.primary }]}>
            ★
          </Text>
          <View style={[styles.halfStarOverlay, { width: sizeStyles.fontSize / 2 }]}>
            <Text style={[styles.star, sizeStyles, { color: '#ccc' }]}>
              ★
            </Text>
          </View>
        </View>
      );
    } else {
      // Empty star
      return (
        <Text style={[styles.star, sizeStyles, { color: '#ccc' }]}>
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
      // Half star - show filled left half and empty right half
      return (
        <View style={styles.halfStarContainer}>
          <Text style={[styles.star, sizeStyles, { color: theme.colors.primary }]}>
            ★
          </Text>
          <View style={[styles.halfStarOverlay, { width: sizeStyles.fontSize / 2 }]}>
            <Text style={[styles.star, sizeStyles, { color: '#ccc' }]}>
              ★
            </Text>
          </View>
        </View>
      );
    } else {
      // Empty star
      return (
        <Text style={[styles.star, sizeStyles, { color: '#ccc' }]}>
          ☆
        </Text>
      );
    }
  };

  return (
    <View style={styles.displayContainer}>
      {[1, 2, 3, 4, 5].map((starNumber) => (
        <View key={starNumber}>
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
  },
  star: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
  starDisabled: {
    opacity: 0.5,
  },
  halfStarContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  halfStarOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
});