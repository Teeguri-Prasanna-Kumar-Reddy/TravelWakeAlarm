export const COLORS = {
  background: '#0b0f19', // Midnight blue/black
  surface: 'rgba(255, 255, 255, 0.03)', // Glassmorphism surface
  surfaceHighlight: 'rgba(255, 255, 255, 0.08)',
  primary: '#00f2fe', // Bioluminescent Cyan
  primaryGradientEnd: '#4facfe', // Ocean Blue
  danger: '#ff0844', // Vibrant Coral
  success: '#10B981', // Neon Green
  text: '#ffffff',
  textMuted: 'rgba(255, 255, 255, 0.6)',
  border: 'rgba(255, 255, 255, 0.1)',
  overlay: 'rgba(11, 15, 25, 0.85)',
};

export const SIZES = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FONTS = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  bold: 'Inter_700Bold',
};

// Reusable glassmorphism styles
export const GLASS_STYLE = {
  backgroundColor: COLORS.surface,
  borderWidth: 1,
  borderColor: COLORS.border,
  backdropFilter: 'blur(10px)', // Note: backdropFilter doesn't work out of the box in RN, but we simulate it with colors
};
