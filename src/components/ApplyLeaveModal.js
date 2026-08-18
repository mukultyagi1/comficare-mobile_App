import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Chip, Modal, Portal, Text, TextInput } from 'react-native-paper';
import { leavesApi } from '../api/leave';

// Shared by DashboardScreen's "My leave requests" card and the standalone
// LeaveScreen — both let an employee raise a leave request the same way.
export default function ApplyLeaveModal({ visible, onDismiss, employeeId, onSubmitted }) {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [form, setForm] = useState({ leaveTypeId: null, startDate: '', endDate: '', comments: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) leavesApi.listTypes().then(setLeaveTypes).catch(() => setLeaveTypes([]));
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
        <TextInput
          mode="outlined"
          label="Start date (YYYY-MM-DD)"
          value={form.startDate}
          onChangeText={(v) => setForm((f) => ({ ...f, startDate: v }))}
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="End date (YYYY-MM-DD)"
          value={form.endDate}
          onChangeText={(v) => setForm((f) => ({ ...f, endDate: v }))}
          style={styles.input}
        />
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
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: { backgroundColor: '#fff', margin: 24, padding: 20, borderRadius: 12 },
  title: { marginBottom: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { marginBottom: 4 },
  input: { marginBottom: 12 },
  error: { color: '#dc2626', marginBottom: 8 },
});
