import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { Button, Chip, Modal, Portal, Text, TextInput } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { leavesApi } from '../api/leave';
import { colors } from '../theme';

// Shared by DashboardScreen's "My leave requests" card and the standalone
// LeaveScreen — both let an employee raise a leave request the same way.
//
// Date pickers use react-native-calendars (pure JS, no native module) rather
// than @react-native-community/datetimepicker — the latter isn't part of
// Expo Go's prebuilt binary and crashes with an "Unable to resolve module"
// bundling error / native-module-not-found at runtime, the same class of
// problem this app already hit and avoided with react-native-reanimated
// (see MenuScreen.js).
export default function ApplyLeaveModal({ visible, onDismiss, employeeId, onSubmitted }) {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [form, setForm] = useState({ leaveTypeId: null, startDate: '', endDate: '', comments: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  // 'start' | 'end' | null — which date field's calendar is open.
  const [activePicker, setActivePicker] = useState(null);

  useEffect(() => {
    if (visible) {
      leavesApi
        .listTypes()
        .then((res) => setLeaveTypes((res?.items ?? []).filter((t) => t.status === 'ACTIVE')))
        .catch(() => setLeaveTypes([]));
    } else {
      setActivePicker(null);
    }
  }, [visible]);

  const submit = useCallback(async () => {
    setError(null);
    if (!form.leaveTypeId || !form.startDate || !form.endDate) {
      setError('Leave type, start date, and end date are required.');
      return;
    }
    setSubmitting(true);
    try {
      await leavesApi.createRequest({
        empId: employeeId,
        leaveTypeId: form.leaveTypeId,
        startDate: form.startDate,
        endDate: form.endDate,
        comments: form.comments || undefined,
      });
      setForm({ leaveTypeId: null, startDate: '', endDate: '', comments: '' });
      onSubmitted?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }, [form, employeeId, onSubmitted]);

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text variant="titleMedium" style={styles.title}>
            Apply for leave
          </Text>
          <View style={styles.chipRow}>
            {leaveTypes.map((type) => (
              <Chip
                key={type.id}
                selected={form.leaveTypeId === type.id}
                onPress={() => setForm((f) => ({ ...f, leaveTypeId: type.id }))}
                style={styles.chip}
              >
                {type.name ?? type.leaveTypeName ?? type.id}
              </Chip>
            ))}
          </View>

          <Pressable onPress={() => setActivePicker(activePicker === 'start' ? null : 'start')}>
            <TextInput
              mode="outlined"
              label="Start date"
              value={form.startDate}
              editable={false}
              right={<TextInput.Icon icon="calendar" />}
              style={styles.input}
            />
          </Pressable>
          {activePicker === 'start' && (
            <Calendar
              current={form.startDate || undefined}
              onDayPress={(day) => {
                setForm((f) => ({ ...f, startDate: day.dateString }));
                setActivePicker(null);
              }}
              markedDates={form.startDate ? { [form.startDate]: { selected: true, selectedColor: colors.primary } } : {}}
              style={styles.calendar}
            />
          )}

          <Pressable onPress={() => setActivePicker(activePicker === 'end' ? null : 'end')}>
            <TextInput
              mode="outlined"
              label="End date"
              value={form.endDate}
              editable={false}
              right={<TextInput.Icon icon="calendar" />}
              style={styles.input}
            />
          </Pressable>
          {activePicker === 'end' && (
            <Calendar
              current={form.endDate || form.startDate || undefined}
              minDate={form.startDate || undefined}
              onDayPress={(day) => {
                setForm((f) => ({ ...f, endDate: day.dateString }));
                setActivePicker(null);
              }}
              markedDates={form.endDate ? { [form.endDate]: { selected: true, selectedColor: colors.primary } } : {}}
              style={styles.calendar}
            />
          )}

          <TextInput
            mode="outlined"
            label="Comments (optional)"
            value={form.comments}
            onChangeText={(v) => setForm((f) => ({ ...f, comments: v }))}
            style={styles.input}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button mode="contained" onPress={submit} loading={submitting} disabled={submitting}>
            Submit
          </Button>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: { backgroundColor: '#fff', margin: 24, padding: 20, borderRadius: 12, maxHeight: '85%' },
  title: { marginBottom: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { marginBottom: 4 },
  input: { marginBottom: 12 },
  calendar: { marginBottom: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 8 },
  error: { color: '#dc2626', marginBottom: 8 },
});
