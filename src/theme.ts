export const colors = {
  bg: '#0B1020',
  bgElevated: '#121833',
  card: '#161D3A',
  cardAlt: '#1C2447',
  border: '#2A3366',
  text: '#F3F4FF',
  textMuted: '#A6ACCF',
  textFaint: '#6B7299',
  cyan: '#3DD6D0',
  violet: '#7C5CFF',
  violetSoft: '#A996FF',
  orange: '#FF8A3D',
  danger: '#FF6B81',
  success: '#4ADE80',
  overlay: 'rgba(11,16,32,0.85)',
};

/** Colour per path position: baseline is cyan, alternates cycle violet → orange. */
export const pathColors = [colors.cyan, colors.violet, colors.orange, colors.violetSoft];

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 8, md: 14, lg: 20, pill: 999 };

export const font = {
  h1: { fontSize: 30, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 17, fontWeight: '700' as const },
  body: { fontSize: 15, lineHeight: 22 },
  small: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.2, textTransform: 'uppercase' as const },
};
