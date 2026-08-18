import { ActivityIndicator, View } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { SessionProvider, useSession } from './src/SessionContext';
import SignInScreen from './src/screens/SignInScreen';
import AppNavigator from './src/navigation/AppNavigator';
import { paperTheme } from './src/theme';

function Root() {
  const { status } = useSession();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
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
        <Root />
      </PaperProvider>
    </SessionProvider>
  );
}
