import { Stack } from 'expo-router';
import AdminConsole from '../../components/admin/AdminConsole';

export default function AdminScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Admin Workspace' }} />
      <AdminConsole />
    </>
  );
}
