// Mirrors comficare-frontend/src/components/layout/AppLayout.jsx's navItems
// array — same section → permission map, so a signed-in user sees the same
// set of sections on mobile as on the web. `permissions: null` means
// "visible to any signed-in user" (see useSession().hasAnyPermission).
// `name` is the entry screen's route name in navigation/AppNavigator.js.
export const navItems = [
  { name: 'Dashboard', label: 'Self Service', icon: 'view-dashboard-outline', permissions: ['SELF_SERVICE_VIEW'] },
  { name: 'LocationList', label: 'Team Location', icon: 'map-marker-outline', permissions: ['LOCATION_VIEW'] },
  {
    name: 'DirectoryList',
    label: 'Directory',
    icon: 'domain',
    permissions: ['MASTER_DATA_MANAGE', 'DEPARTMENT_VIEW', 'EMPLOYEE_CREATE', 'EMPLOYEE_EDIT', 'EMPLOYEE_DELETE'],
  },
  { name: 'Roster', label: 'Roster', icon: 'calendar-month-outline', permissions: ['ROSTER_VIEW'] },
  { name: 'Leave', label: 'Leave Management', icon: 'calendar-check-outline', permissions: null },
  { name: 'Timesheet', label: 'Timesheet', icon: 'clock-outline', permissions: ['TIMESHEET_VIEW'] },
  { name: 'Settings', label: 'Settings', icon: 'cog-outline', permissions: ['MASTER_DATA_MANAGE'] },
];
