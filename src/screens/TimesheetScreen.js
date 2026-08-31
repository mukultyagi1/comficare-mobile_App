import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, SafeAreaView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Checkbox, Chip, Text } from 'react-native-paper';
import { useSession } from '../SessionContext';
import { timesheetsApi } from '../api/timesheet';
import { colors, statusColors } from '../theme';

// Matches comficare-frontend's TimesheetPage.jsx scope (view + approve/reject,
// individually or in bulk; CSV export and inline edit stay web-only for now).
// Gated behind TIMESHEET_VIEW / TIMESHEET_APPROVE, same as web.
export default function TimesheetScreen() {
  const { hasPermission } = useSession();
  const canApprove = hasPermission('TIMESHEET_APPROVE');

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkActing, setBulkActing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await timesheetsApi.list({});
      setEntries(data?.items ?? []);
      setSelectedIds([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const approve = useCallback(async (id) => {
    await timesheetsApi.approve(id);
    load();
  }, [load]);

  const reject = useCallback(async (id) => {
    await timesheetsApi.reject(id);
    load();
  }, [load]);

  const toggleSelected = useCallback((id) => {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));
  }, []);

  const approveSelected = useCallback(async () => {
    setBulkActing(true);
    try {
      await Promise.all(selectedIds.map((id) => timesheetsApi.approve(id)));
      await load();
    } finally {
      setBulkActing(false);
    }
  }, [selectedIds, load]);

  const rejectSelected = useCallback(async () => {
    setBulkActing(true);
    try {
      await Promise.all(selectedIds.map((id) => timesheetsApi.reject(id)));
      await load();
    } finally {
      setBulkActing(false);
    }
  }, [selectedIds, load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {selectedIds.length > 0 && (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionCount}>{selectedIds.length} selected</Text>
          <Button compact onPress={() => setSelectedIds([])} disabled={bulkActing}>
            Clear
          </Button>
          <Button compact textColor={colors.error} onPress={rejectSelected} loading={bulkActing} disabled={bulkActing}>
            Reject
          </Button>
          <Button compact mode="contained" onPress={approveSelected} loading={bulkActing} disabled={bulkActing}>
            Approve
          </Button>
        </View>
      )}
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
        ListEmptyComponent={<Text style={styles.empty}>No timesheet entries.</Text>}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.row}>
            {canApprove && item.status === 'PENDING' && (
              <Checkbox
                status={selectedIds.includes(item.id) ? 'checked' : 'unchecked'}
                onPress={() => toggleSelected(item.id)}
              />
            )}
            <View style={styles.flex}>
              <Text variant="bodyLarge">
                {item.employee?.firstName} {item.employee?.lastName}
              </Text>
              <Text style={styles.muted}>
                {item.date ? new Date(item.date).toLocaleDateString() : '—'} · {item.workedHours != null ? `${item.workedHours.toFixed?.(1) ?? item.workedHours}h` : '—'}
              </Text>
            </View>
            <Chip compact style={{ backgroundColor: statusColors(item.status).backgroundColor }} textStyle={{ color: statusColors(item.status).color }}>
              {item.status ?? 'PENDING'}
            </Chip>
            {canApprove && item.status === 'PENDING' && (
              <View style={styles.actions}>
                <Button compact onPress={() => approve(item.id)}>
                  Approve
                </Button>
                <Button compact textColor={colors.error} onPress={() => reject(item.id)}>
                  Reject
                </Button>
              </View>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 12, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 8, backgroundColor: colors.white, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  flex: { flex: 1 },
  actions: { flexDirection: 'row' },
  muted: { color: colors.textMuted, fontSize: 13 },
  error: { color: colors.error, padding: 16 },
  empty: { color: colors.textMuted, padding: 24, textAlign: 'center' },
  selectionBar: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  selectionCount: { flex: 1, color: colors.textSecondary, fontWeight: '600' },
});
