import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeColors } from '../providers/ThemeProvider';
import Icon from 'react-native-vector-icons/FontAwesome';

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
  const colors = useThemeColors();

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 16;
      case 'large':
        return 28;
      default:
        return 20;
    }
  };

  const iconSize = getIconSize();

  const handleStarPress = (starNumber: number, event: any) => {
    if (disabled) return;

    // Get touch position relative to the star
    const { locationX } = event.nativeEvent;
    const starWidth = iconSize + 4; // Icon size + paddingHorizontal (2px * 2 sides = 4px total)
    const isLeftSide = locationX < starWidth / 2;
    
    const newRating = isLeftSide ? starNumber - 0.5 : starNumber;
    
    // If clicking on the currently selected rating, remove it
    if (newRating === rating) {
      onRatingChange(0);
    } else {
      onRatingChange(newRating);
    }
  };

  const getStarIcon = (starNumber: number) => {
    const fullStarThreshold = starNumber;
    const halfStarThreshold = starNumber - 0.5;

    if (rating >= fullStarThreshold) {
      return 'star'; // Full star
    } else if (rating >= halfStarThreshold) {
      return 'star-half-o'; // Half star
    } else {
      return 'star-o'; // Empty star
    }
  };

  const getStarColor = (starNumber: number) => {
    const halfStarThreshold = starNumber - 0.5;
    
    if (rating >= halfStarThreshold) {
      return colors.primary;
    } else {
      return '#ddd';
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
          <Icon
            name={getStarIcon(starNumber)}
            size={iconSize}
            color={getStarColor(starNumber)}
          />
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
  const colors = useThemeColors();

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 16;
      case 'large':
        return 28;
      default:
        return 20;
    }
  };

  const iconSize = getIconSize();

  const getStarIcon = (starNumber: number) => {
    const fullStarThreshold = starNumber;
    const halfStarThreshold = starNumber - 0.5;

    if (rating >= fullStarThreshold) {
      return 'star'; // Full star
    } else if (rating >= halfStarThreshold) {
      return 'star-half-o'; // Half star
    } else {
      return 'star-o'; // Empty star
    }
  };

  const getStarColor = (starNumber: number) => {
    const halfStarThreshold = starNumber - 0.5;
    
    if (rating >= halfStarThreshold) {
      return colors.primary;
    } else {
      return '#ddd';
    }
  };

  return (
    <View style={styles.displayContainer}>
      {[1, 2, 3, 4, 5].map((starNumber) => (
        <Icon
          key={starNumber}
          name={getStarIcon(starNumber)}
          size={iconSize}
          color={getStarColor(starNumber)}
          style={styles.starIcon}
        />
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
  starIcon: {
    marginHorizontal: 1,
  },
  starDisabled: {
    opacity: 0.5,
  },
});