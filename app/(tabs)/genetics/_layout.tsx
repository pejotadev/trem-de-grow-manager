import React from 'react';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function GeneticsLayout() {
  const { t } = useTranslation('genetics');

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#8BC34A', // Light green for genetics
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
          title: t('addGenetic'),
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: t('detail.title'),
        }}
      />
    </Stack>
  );
}







