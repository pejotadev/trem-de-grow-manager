import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import { MenuSidebar } from '../../../components/MenuSidebar';

export default function MenuScreen() {
  // On mobile, show the full menu screen
  // On web, the sidebar is already shown in the layout, so this screen is rarely accessed
  return (
    <SafeAreaView style={styles.container}>
      <MenuSidebar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});
