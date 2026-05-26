import React from 'react'
import { StyleSheet, View, ViewProps } from 'react-native'
import { colors, radius, spacing } from '../theme'

interface CardProps extends ViewProps {
  children: React.ReactNode
  accent?: string
}

export function Card({ children, style, accent, ...props }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        accent && { borderLeftWidth: 3, borderLeftColor: accent },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
})
