import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Avatar, Button, Card, Chip, Text } from 'react-native-paper';
import * as Location from 'expo-location';
import { useSession } from '../../SessionContext';
import { leavesApi } from '../../api/leave';
import { timesheetsApi } from '../../api/timesheet';
import { rostersApi } from '../../api/roster';
import { swapRequestsApi } from '../../api/swapRequests';
import ApplyLeaveModal from '../../components/ApplyLeaveModal';
import { colors, radius, statusColors } from '../../theme';

// Matches comficare-frontend's DashboardPage.jsx scope: clock in/out + break,
// today's/upcoming shifts, my leave requests + apply form, my swap requests,
// and — for managers — an approval inbox. Read data comes straight from the
// same endpoints the web app uses; see src/api/{leave,timesheet,roster,swapRequests}.js.

// Matches comficare-frontend's DashboardPage.jsx `statusMeta` — same
// off/on/break tint+color mapping for the clock status pill.
const CLOCK_STATUS_META = {
  off: { tint: colors.canvas, color: colors.textMuted, label: 'Off Shift' },
  on: { tint: colors.successTint, color: colors.success, label: 'On Shift' },
  break: { tint: colors.warningTint, color: colors.warning, label: 'On Break' },
};

function TileIcon({ icon }) {
  return <Avatar.Icon size={36} icon={icon} style={styles.tileIcon} color={colors.primary} />;
}

// Local-calendar-day date string (not toISOString, which is UTC and can
// land on the wrong day near midnight) — matches comficare-frontend's
// toISODate helper.
function toLocalISODate(date) {
  const d = new Date(date);
  const offsetMs = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 10);
}

export default function DashboardScreen() {
  const { user, hasAnyPermission, locationStatus, locationServicesEnabled } = useSession();
  const employeeId = user?.employeeId;
  const canApprove = hasAnyPermission(['LEAVE_MANAGE', 'TIMESHEET_APPROVE', 'ROSTER_APPROVE']);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [openEvent, setOpenEvent] = useState(null); // latest unfinished START/BREAK event
  // True once today's shift has been clocked in AND out already — matches
  // comficare-frontend/src/pages/DashboardPage.jsx's completedShiftToday:
  // Clock in stays hidden for the rest of the day so it can't be started
  // again (the backend itself only blocks a *second concurrent* clock-in,
  // not a second full shift the same day — this is the client-side gate).
  const [completedShiftToday, setCompletedShiftToday] = useState(false);
  const [clockActionLoading, setClockActionLoading] = useState(false);

  const [myShifts, setMyShifts] = useState([]);
  const [myLeave, setMyLeave] = useState([]);
  const [mySwaps, setMySwaps] = useState([]);
  const [pendingLeave, setPendingLeave] = useState([]);
  const [pendingSwaps, setPendingSwaps] = useState([]);

  const [applyModalVisible, setApplyModalVisible] = useState(false);

  const load = useCallback(async () => {
    if (!employeeId) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const [events, leave, swaps, rosters] = await Promise.all([
        timesheetsApi.listEvents({ employeeId, dateFrom: toLocalISODate(yesterday) }),
        leavesApi.listRequests({}),
        swapRequestsApi.list({ employeeId }),
        rostersApi.list(user?.deptId ? { departmentId: user.deptId } : undefined),
      ]);

      const eventItems = events?.items ?? [];
      const openEvents = eventItems.filter((e) => !e.endTime);
      const openBreak = openEvents.find((e) => e.type === 'BREAK');
      const openStart = openEvents.find((e) => e.type === 'START');
      setOpenEvent(openBreak ?? openStart ?? null);

      const todayIso = toLocalISODate(new Date());
      setCompletedShiftToday(
        eventItems.some((e) => e.type === 'START' && e.endTime && toLocalISODate(e.startTime) === todayIso),
      );

      const allLeave = leave?.items ?? [];
      setMyLeave(allLeave.filter((item) => item.employee?.id === employeeId));
      if (canApprove) setPendingLeave(allLeave.filter((item) => item.status === 'PENDING'));

      const allSwaps = swaps?.items ?? [];
      setMySwaps(allSwaps);
      if (canApprove) {
        const pending = (await swapRequestsApi.list({ status: 'PENDING' }))?.items ?? [];
        setPendingSwaps(pending);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const upcoming = (rosters?.items ?? [])
        .flatMap((roster) => (roster.lineItems ?? []).map((li) => ({ ...li, roster })))
        .filter((li) => li.employee?.id === employeeId && new Date(li.date) >= today)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 5);
      setMyShifts(upcoming);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [employeeId, user?.deptId, canApprove]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const clockStatusKey = !openEvent ? 'off' : openEvent.type === 'BREAK' ? 'break' : 'on';

  const clockLabel = useMemo(() => {
    if (!openEvent) return completedShiftToday ? "You've already completed your shift for today" : 'Clock in to start your shift';
    const since = new Date(openEvent.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return openEvent.type === 'BREAK' ? `On break since ${since}` : `Clocked in since ${since}`;
  }, [openEvent, completedShiftToday]);

  const locationLabel = useMemo(() => {
    const permissionGranted = locationStatus === 'granted' || locationStatus === 'granted:foreground-only';
    if (permissionGranted && !locationServicesEnabled) {
      return { text: 'Location: off (turn on device location)', color: colors.textMuted };
    }
    if (permissionGranted) return { text: 'Location: sharing', color: colors.success };
    if (locationStatus === 'requesting') return { text: 'Location: requesting permission…', color: colors.textMuted };
    if (locationStatus === 'denied') return { text: 'Location: off (permission denied)', color: colors.textMuted };
    if (locationStatus?.startsWith('error:')) return { text: `Location: ${locationStatus.slice(6)}`, color: colors.error };
    return { text: 'Location: —', color: colors.textMuted };
  }, [locationStatus, locationServicesEnabled]);

  const runClockAction = useCallback(
    async (action) => {
      if (!employeeId) return;
      setClockActionLoading(true);
      setError(null);
      try {
        // Every action below is a shift-lifecycle edge (clock-in/out,
        // break-start/end) and the backend requires a current fix for each
        // one (see timesheetsApi) — not just clock-in.
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') throw new Error('Location permission is required.');
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

        if (action === 'clockIn') {
          await timesheetsApi.clockIn(employeeId, position.coords);
        } else if (action === 'clockOut') {
          await timesheetsApi.clockOut(employeeId, position.coords);
        } else if (action === 'startBreak') {
          await timesheetsApi.startBreak(employeeId, position.coords);
        } else if (action === 'endBreak') {
          await timesheetsApi.endBreak(employeeId, position.coords);
        }
        await load();
      } catch (err) {
        setError(err.message);
      } finally {
        setClockActionLoading(false);
      }
    },
    [employeeId, load],
  );

  const approveLeave = useCallback(
    async (id) => {
      await leavesApi.approveRequest(id);
      await load();
    },
    [load],
  );
  const rejectLeave = useCallback(
    async (id) => {
      await leavesApi.rejectRequest(id);
      await load();
    },
    [load],
  );
  const approveSwap = useCallback(
    async (id) => {
      await swapRequestsApi.approve(id);
      await load();
    },
    [load],
  );
  const rejectSwap = useCallback(
    async (id) => {
      await swapRequestsApi.reject(id);
      await load();
    },
    [load],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.safeArea} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.container}>
        <Text variant="titleLarge" style={styles.greeting}>
          Hi, {user?.displayName ?? user?.userName ?? user?.email}
        </Text>
        <Text style={[styles.locationLabel, { color: locationLabel.color }]}>{locationLabel.text}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Card style={styles.card}>
          <Card.Title title="Time clock" left={() => <TileIcon icon="clock-outline" />} />
          <Card.Content>
            <View style={[styles.statusPill, { backgroundColor: CLOCK_STATUS_META[clockStatusKey].tint }]}>
              <Text style={[styles.statusPillText, { color: CLOCK_STATUS_META[clockStatusKey].color }]}>
                {CLOCK_STATUS_META[clockStatusKey].label}
              </Text>
            </View>
            <Text style={styles.clockSubtext}>{clockLabel}</Text>
            <View style={styles.buttonRow}>
              {!openEvent && !completedShiftToday && (
                <Button mode="contained" onPress={() => runClockAction('clockIn')} loading={clockActionLoading} disabled={clockActionLoading}>
                  Clock in
                </Button>
              )}
              {openEvent?.type === 'START' && (
                <>
                  <Button mode="outlined" onPress={() => runClockAction('startBreak')} loading={clockActionLoading} disabled={clockActionLoading}>
                    Start break
                  </Button>
                  <Button mode="contained" onPress={() => runClockAction('clockOut')} loading={clockActionLoading} disabled={clockActionLoading}>
                    Clock out
                  </Button>
                </>
              )}
              {openEvent?.type === 'BREAK' && (
                <Button mode="contained" onPress={() => runClockAction('endBreak')} loading={clockActionLoading} disabled={clockActionLoading}>
                  End break
                </Button>
              )}
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Upcoming shifts" left={() => <TileIcon icon="calendar-month-outline" />} />
          <Card.Content>
            {myShifts.length === 0 ? (
              <Text style={styles.muted}>No upcoming shifts.</Text>
            ) : (
              myShifts.map((li) => (
                <View key={li.id} style={styles.listRow}>
                  <Text>{new Date(li.date).toDateString()}</Text>
                  <Text style={styles.muted}>
                    {li.startTime} – {li.endTime} · {li.position?.job?.jobTitle ?? '—'}
                  </Text>
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title
            title="My leave requests"
            left={() => <TileIcon icon="calendar-check-outline" />}
            right={() => <Button onPress={() => setApplyModalVisible(true)}>Apply</Button>}
          />
          <Card.Content>
            {myLeave.length === 0 ? (
              <Text style={styles.muted}>No leave requests yet.</Text>
            ) : (
              myLeave.slice(0, 5).map((item) => (
                <View key={item.id} style={styles.listRow}>
                  <Text>
                    {new Date(item.startDate).toLocaleDateString()} – {new Date(item.endDate).toLocaleDateString()}
                  </Text>
                  <Chip compact style={{ backgroundColor: statusColors(item.status).backgroundColor }} textStyle={{ color: statusColors(item.status).color }}>
                    {item.status}
                  </Chip>
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="My shift-swap requests" left={() => <TileIcon icon="swap-horizontal" />} />
          <Card.Content>
            {mySwaps.length === 0 ? (
              <Text style={styles.muted}>No swap requests.</Text>
            ) : (
              mySwaps.slice(0, 5).map((item) => (
                <View key={item.id} style={styles.listRow}>
                  <Text>
                    {item.requester?.firstName} → {item.targetEmployee?.firstName}
                  </Text>
                  <Chip compact style={{ backgroundColor: statusColors(item.status).backgroundColor }} textStyle={{ color: statusColors(item.status).color }}>
                    {item.status}
                  </Chip>
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        {canApprove && (
          <Card style={styles.card}>
            <Card.Title title="Approval inbox" left={() => <TileIcon icon="clipboard-check-outline" />} />
            <Card.Content>
              {pendingLeave.length === 0 && pendingSwaps.length === 0 ? (
                <Text style={styles.muted}>Nothing waiting on you.</Text>
              ) : (
                <>
                  {pendingLeave.map((item) => (
                    <View key={item.id} style={styles.approvalRow}>
                      <Text style={styles.flex}>
                        {item.employee?.firstName} {item.employee?.lastName} · Leave · {new Date(item.startDate).toLocaleDateString()}
                      </Text>
                      <Button compact onPress={() => approveLeave(item.id)}>
                        Approve
                      </Button>
                      <Button compact textColor={colors.error} onPress={() => rejectLeave(item.id)}>
                        Reject
                      </Button>
                    </View>
                  ))}
                  {pendingSwaps.map((item) => (
                    <View key={item.id} style={styles.approvalRow}>
                      <Text style={styles.flex}>
                        {item.requester?.firstName} ↔ {item.targetEmployee?.firstName} · Swap
                      </Text>
                      <Button compact onPress={() => approveSwap(item.id)}>
                        Approve
                      </Button>
                      <Button compact textColor={colors.error} onPress={() => rejectSwap(item.id)}>
                        Reject
                      </Button>
                    </View>
                  ))}
                </>
              )}
            </Card.Content>
          </Card>
        )}
      </View>

      <ApplyLeaveModal
        visible={applyModalVisible}
        onDismiss={() => setApplyModalVisible(false)}
        employeeId={employeeId}
        onSubmitted={() => {
          setApplyModalVisible(false);
          load();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16, gap: 12 },
  greeting: { color: colors.textPrimary, fontWeight: '700' },
  locationLabel: { fontSize: 12, fontWeight: '600', marginTop: 2, marginBottom: 4 },
  card: { borderRadius: radius.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  tileIcon: { backgroundColor: colors.primaryTint },
  statusPill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  statusPillText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  clockSubtext: { color: colors.textSecondary, marginTop: 8 },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  approvalRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 4 },
  flex: { flex: 1 },
  muted: { color: colors.textMuted },
  error: { color: colors.error, marginVertical: 8 },
});
