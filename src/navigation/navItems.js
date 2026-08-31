// Mirrors comficare-frontend/src/components/layout/AppLayout.jsx's navItems
// array — same section → permission map, so a signed-in user sees the same
// set of sections on mobile as on the web. `permissions: null` means
// "visible to any signed-in user" (see useSession().hasAnyPermission).
// `name` is the entry screen's route name in navigation/AppNavigator.js.
// Team Location, Directory, and Roster are deliberately left off mobile's
// menu (not needed on-the-go) — the web app still carries them.
export const navItems = [
  { name: 'Dashboard', label: 'Self Service', icon: 'view-dashboard-outline', permissions: ['SELF_SERVICE_VIEW'] },
  { name: 'Leave', label: 'Leave Management', icon: 'calendar-check-outline', permissions: null },
  { name: 'Timesheet', label: 'Timesheet', icon: 'clock-outline', permissions: ['TIMESHEET_VIEW'] },
  { name: 'Profile', label: 'My Profile', icon: 'account-circle-outline', permissions: null },
  { name: 'Settings', label: 'Settings', icon: 'cog-outline', permissions: ['MASTER_DATA_MANAGE'] },
];
