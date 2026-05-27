import { Platform, StyleSheet } from 'react-native'

export const colors = {
  bg: '#0a0f1e',
  surface: '#0d1526',
  surface2: '#111b33',
  surface3: '#162040',
  border: 'rgba(255,255,255,0.08)',
  borderLight: 'rgba(255,255,255,0.05)',
  primary: '#3b82f6',
  primaryDark: '#1d4ed8',
  primaryLight: '#60a5fa',
  primaryBg: 'rgba(59,130,246,0.12)',
  primaryBorder: 'rgba(59,130,246,0.3)',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  textDim: '#475569',
  success: '#22c55e',
  successBg: 'rgba(34,197,94,0.12)',
  error: '#ef4444',
  errorBg: 'rgba(239,68,68,0.12)',
  warning: '#f59e0b',
  warningBg: 'rgba(245,158,11,0.12)',
  violet: '#8b5cf6',
  violetBg: 'rgba(139,92,246,0.12)',
  cyan: '#06b6d4',
  cyanBg: 'rgba(6,182,212,0.12)',
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
}

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
}

export const typography = StyleSheet.create({
  heading1: { fontSize: 24, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  heading2: { fontSize: 18, fontWeight: '600', color: colors.text },
  heading3: { fontSize: 15, fontWeight: '600', color: colors.text },
  body: { fontSize: 14, color: colors.text, lineHeight: 21 },
  bodyMuted: { fontSize: 14, color: colors.textMuted, lineHeight: 21 },
  caption: { fontSize: 12, color: colors.textDim },
  mono: { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', color: colors.textMuted },
})

export const shadows = StyleSheet.create({
  glow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
})
