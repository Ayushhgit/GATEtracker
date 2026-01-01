import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
  icon,
  iconPosition = 'left',
}: ButtonProps) {
  const getStyles = () => {
    const isDisabled = disabled || loading;

    switch (variant) {
      case 'primary':
        return {
          bg: isDisabled ? Colors.surfaceElevated : Colors.primary,
          text: isDisabled ? Colors.textTertiary : Colors.text,
          border: 'transparent',
        };
      case 'secondary':
        return {
          bg: isDisabled ? Colors.surfaceElevated : Colors.surface,
          text: isDisabled ? Colors.textTertiary : Colors.text,
          border: Colors.border,
        };
      case 'outline':
        return {
          bg: 'transparent',
          text: isDisabled ? Colors.textTertiary : Colors.primary,
          border: isDisabled ? Colors.border : Colors.primary,
        };
      case 'ghost':
        return {
          bg: 'transparent',
          text: isDisabled ? Colors.textTertiary : Colors.textSecondary,
          border: 'transparent',
        };
      case 'danger':
        return {
          bg: isDisabled ? Colors.surfaceElevated : Colors.error,
          text: isDisabled ? Colors.textTertiary : Colors.text,
          border: 'transparent',
        };
      default:
        return {
          bg: Colors.primary,
          text: Colors.text,
          border: 'transparent',
        };
    }
  };

  const getSizeStyles = (): ViewStyle => {
    switch (size) {
      case 'small':
        return { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md };
      case 'large':
        return { paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl };
      default:
        return { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg };
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small': return FontSizes.sm;
      case 'large': return FontSizes.lg;
      default: return FontSizes.md;
    }
  };

  const colors = getStyles();
  const iconSize = size === 'small' ? 16 : size === 'large' ? 22 : 18;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getSizeStyles(),
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          borderWidth: variant === 'outline' || variant === 'secondary' ? 1 : 0,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.text} />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <Ionicons name={icon} size={iconSize} color={colors.text} style={styles.iconLeft} />
          )}
          <Text style={[styles.text, { color: colors.text, fontSize: getTextSize() }, textStyle]}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Ionicons name={icon} size={iconSize} color={colors.text} style={styles.iconRight} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontWeight: '600',
  },
  iconLeft: {
    marginRight: Spacing.sm,
  },
  iconRight: {
    marginLeft: Spacing.sm,
  },
});
