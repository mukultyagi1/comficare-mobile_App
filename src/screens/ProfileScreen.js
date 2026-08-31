import { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Divider, IconButton, Text, TextInput } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useSession } from '../SessionContext';
import { authApi } from '../api/auth';
import { employeesApi } from '../api/directory';
import { WS_BASE_URL } from '../config';
import { colors, radius } from '../theme';

function getInitials(name) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function ViewField({ label, value }) {
  return (
    <View style={styles.viewField}>
      <Text style={styles.viewFieldLabel}>{label}</Text>
      <Text style={styles.viewFieldValue}>{value ?? '—'}</Text>
    </View>
  );
}

// Mirrors comficare-frontend's MyProfileSheet.jsx: Display Name and the
// profile picture are the only editable fields — everything else is
// official account data, changed elsewhere (e.g. by an admin).
export default function ProfileScreen() {
  const { user, role, refreshUser } = useSession();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [error, setError] = useState(null);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [currentVisible, setCurrentVisible] = useState(false);
  const [newVisible, setNewVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  useEffect(() => {
    setDisplayName(user?.displayName ?? '');
    if (user?.employeeId) {
      employeesApi.get(user.employeeId).then(setEmployee).catch(() => setEmployee(null));
    } else {
      setEmployee(null);
    }
  }, [user?.employeeId, user?.displayName]);

  const officialName = user?.userName || '—';
  const effectiveName = user?.displayName || user?.userName || 'User';
  const dirty = displayName.trim() !== (user?.displayName ?? '').trim();
  const avatarSrc = user?.avatarUrl ? `${WS_BASE_URL}${user.avatarUrl}` : null;

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await authApi.updateProfile({ displayName: displayName.trim() || null });
      await refreshUser();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [displayName, refreshUser]);

  const pickAndUploadPhoto = useCallback(async () => {
    setError(null);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Photo library permission is required to update your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const fileName = asset.fileName || asset.uri.split('/').pop() || `avatar-${Date.now()}.jpg`;
      const ext = /\.(\w+)$/.exec(fileName)?.[1]?.toLowerCase() || 'jpg';
      const mimeType = asset.mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      await authApi.uploadAvatar({ uri: asset.uri, name: fileName, type: mimeType });
      await refreshUser();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }, [refreshUser]);

  const handleChangePassword = useCallback(async () => {
    setPasswordError(null);
    if (!currentPassword) {
      setPasswordError('Enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setChangingPassword(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setPasswordOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setChangingPassword(false);
    }
  }, [currentPassword, newPassword, confirmPassword]);

  return (
    <ScrollView style={styles.safeArea} contentContainerStyle={styles.container}>
      <View style={styles.avatarBlock}>
        <View style={styles.avatarWrap}>
          {avatarSrc ? (
            <Image source={{ uri: avatarSrc }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>{getInitials(effectiveName)}</Text>
            </View>
          )}
          <IconButton
            icon="camera"
            size={16}
            mode="contained"
            containerColor={colors.primary}
            iconColor={colors.white}
            style={styles.avatarCameraButton}
            onPress={pickAndUploadPhoto}
            disabled={uploading}
          />
        </View>
        <Text style={styles.avatarHint}>{uploading ? 'Uploading…' : 'Tap the camera icon to change your photo'}</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.card}>
        <TextInput
          mode="outlined"
          label="Display Name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder={officialName}
          maxLength={150}
        />
        <View style={styles.saveRow}>
          <Text style={styles.hint}>Shown wherever your name appears — leave blank to use your official name.</Text>
          <Button mode="contained" compact onPress={handleSave} loading={saving} disabled={saving || !dirty}>
            Save
          </Button>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account</Text>
        <ViewField label="Official Name" value={officialName} />
        <ViewField label="Email" value={user?.email} />
        <ViewField label="Role" value={role?.label ?? role?.code} />
        <ViewField label="Login Type" value={user?.loginType} />
        <ViewField label="Joined" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : null} />
      </View>

      {employee && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Employment</Text>
          <ViewField label="Employee ID" value={employee.displayId} />
          <ViewField label="Status" value={employee.status} />
          <ViewField label="Department" value={employee.department?.deptName} />
          <ViewField label="Position" value={employee.position?.name} />
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.passwordHeader}>
          <Text style={styles.sectionTitle}>Password</Text>
          {!passwordOpen && (
            <Button compact onPress={() => setPasswordOpen(true)}>
              Change password
            </Button>
          )}
        </View>
        {passwordOpen && (
          <View style={styles.passwordFields}>
            <TextInput
              mode="outlined"
              label="Current Password"
              secureTextEntry={!currentVisible}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              right={<TextInput.Icon icon={currentVisible ? 'eye-off' : 'eye'} onPress={() => setCurrentVisible((v) => !v)} />}
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label="New Password"
              secureTextEntry={!newVisible}
              value={newPassword}
              onChangeText={setNewPassword}
              right={<TextInput.Icon icon={newVisible ? 'eye-off' : 'eye'} onPress={() => setNewVisible((v) => !v)} />}
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label="Confirm New Password"
              secureTextEntry={!confirmVisible}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              right={<TextInput.Icon icon={confirmVisible ? 'eye-off' : 'eye'} onPress={() => setConfirmVisible((v) => !v)} />}
              style={styles.input}
            />
            {passwordError ? <Text style={styles.error}>{passwordError}</Text> : null}
            <View style={styles.passwordActions}>
              <Button
                compact
                disabled={changingPassword}
                onPress={() => {
                  setPasswordOpen(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordError(null);
                  setCurrentVisible(false);
                  setNewVisible(false);
                  setConfirmVisible(false);
                }}
              >
                Cancel
              </Button>
              <Button mode="contained" compact loading={changingPassword} disabled={changingPassword} onPress={handleChangePassword}>
                Update Password
              </Button>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  container: { padding: 16, gap: 12 },
  avatarBlock: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  avatarWrap: { width: 84, height: 84 },
  avatarImage: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.border },
  avatarFallback: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { color: colors.white, fontSize: 28, fontWeight: '700' },
  avatarCameraButton: { position: 'absolute', right: -4, bottom: -4, margin: 0 },
  avatarHint: { color: colors.textMuted, fontSize: 12 },
  error: { color: colors.error, marginBottom: 4 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 8 },
  saveRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  hint: { flex: 1, color: colors.textMuted, fontSize: 12 },
  sectionTitle: { fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  viewField: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.canvas },
  viewFieldLabel: { color: colors.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  viewFieldValue: { color: colors.textPrimary, fontSize: 14, marginTop: 2 },
  passwordHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  passwordFields: { gap: 4, marginTop: 4 },
  input: { marginBottom: 4 },
  passwordActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
});
