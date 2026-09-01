import { Component } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button, PaperProvider, Text } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { SessionProvider, useSession } from './src/SessionContext';
import SignInScreen from './src/screens/SignInScreen';
import AppNavigator from './src/navigation/AppNavigator';
import { colors, paperTheme } from './src/theme';

// Catches any render-time crash below it and shows a recoverable screen
// instead of the native blank/white screen RN otherwise leaves on an
// uncaught error — "Try again" just re-attempts the render, which is enough
// for a transient error; a real one will show up in the Metro log via
// componentDidCatch either way.
class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorScreen}>
          <Text variant="titleMedium" style={styles.errorTitle}>
            Something went wrong
          </Text>
          <Button mode="contained" onPress={() => this.setState({ hasError: false })}>
            Try again
          </Button>
        </View>
      );
    }
    return this.props.children;
  }
}

function Root() {
  const { status } = useSession();

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return status === 'signedIn' ? <AppNavigator /> : <SignInScreen />;
}

export default function App() {
  return (
    <SessionProvider>
      <PaperProvider theme={paperTheme}>
        <StatusBar style="auto" />
        <ErrorBoundary>
          <Root />
        </ErrorBoundary>
      </PaperProvider>
    </SessionProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: colors.canvas },
  errorTitle: { color: colors.textPrimary },
});
