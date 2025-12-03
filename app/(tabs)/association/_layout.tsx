import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function AssociationLayout() {
  const { t } = useTranslation('association');

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#4CAF50',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: t('title'),
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          title: t('createAssociation'),
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: t('details'),
        }}
      />
      <Stack.Screen
        name="members"
        options={{
          title: t('members.title'),
        }}
      />
      <Stack.Screen
        name="invite"
        options={{
          title: t('invite.title'),
        }}
      />
    </Stack>
  );
}


