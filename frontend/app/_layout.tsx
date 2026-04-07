import { Stack } from 'expo-router';
import { colors } from '../constants/theme';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.maroonDeep },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '600', fontSize: 17 },
        headerBackTitle: '',
        contentStyle: { backgroundColor: colors.offWhite },
      }}
    />
  );
}
