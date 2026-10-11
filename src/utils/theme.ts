/**
 * ClimbStack — Theme constants
 *
 * Palette "Alpine Dusk":
 * - Warm stone and charcoal for backgrounds
 * - Alpine lake teal for primary
 * - Sunset amber for progress and achievements
 */

export const Colors = {
  light: {
    background: '#F5F3EE',
    surface: '#FDFCFA',
    surfaceAlt: '#EBE8E2',
    text: '#2D3436',
    textSecondary: '#78848C',
    textTertiary: '#A0AAB2',
    border: '#DDD8D0',
    primary: '#3D7C98',
    primaryDark: '#2B5F75',
    accent: '#D4955A',
    accentLight: '#F5E6D8',
    success: '#5A9E6F',
    successLight: '#D9EADF',
    danger: '#C25B56',
    dangerLight: '#F2D7D6',
    streak: '#E8873A',
    mountain: '#C8C1B6',
    mountainFilled: '#D4955A',
    mountainPeak: '#F2C94C',
    overlay: 'rgba(45, 52, 54, 0.4)',
  },
  dark: {
    background: '#0D1117',
    surface: '#161B22',
    surfaceAlt: '#21262D',
    text: '#E6E1DC',
    textSecondary: '#8B949E',
    textTertiary: '#646D76',
    border: '#30363D',
    primary: '#58A6C7',
    primaryDark: '#3D7C98',
    accent: '#E8A954',
    accentLight: '#5C4321',
    success: '#56D364',
    successLight: '#235329',
    danger: '#F47068',
    dangerLight: '#612D29',
    streak: '#F0883E',
    mountain: '#3B4048',
    mountainFilled: '#E8A954',
    mountainPeak: '#FBD87F',
    overlay: 'rgba(13, 17, 23, 0.7)',
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  hero: 48,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;
