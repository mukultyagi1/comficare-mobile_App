import { MD3LightTheme } from 'react-native-paper';

// Mirrors comficare-frontend/src/styles/tokens.css's light-theme values, so
// the app reads as the same product on both platforms.
export const colors = {
  primary: '#4338CA',
  primaryTint: '#EEE9FB',
  canvas: '#F3F4F6',
  white: '#FFFFFF',
  border: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#374151',
  textMuted: '#6B7280',
  textPlaceholder: '#9CA3AF',
  success: '#22C55E',
  successTint: '#DCFCE7',
  warning: '#F97316',
  warningTint: '#FFEDD5',
  error: '#EF4444',
  errorTint: '#FEE2E2',
};

export const radius = { md: 6, lg: 8 };

// Shared status → tint/text color mapping, matching web's badge colors
// (e.g. DashboardPage.jsx's `statusMeta`) — used anywhere a leave/timesheet/
// swap status renders as a Chip (Dashboard, Leave, Timesheet screens).
export function statusColors(status) {
  if (status === 'APPROVED' || status === 'ACTIVE') return { backgroundColor: colors.successTint, color: colors.success };
  if (status === 'REJECTED') return { backgroundColor: colors.errorTint, color: colors.error };
  if (status === 'CANCELLED') return { backgroundColor: colors.canvas, color: colors.textMuted };
  return { backgroundColor: colors.warningTint, color: colors.warning }; // PENDING and anything else
}

export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    background: colors.canvas,
    surface: colors.white,
    outline: colors.border,
  },
};
