import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import {
  searchUsersByEmail,
  sendFriendRequest,
  getSentFriendRequests,
  getFriends,
} from '../../../firebase/firestore';
import { User, FriendRequest, Friendship } from '../../../types';
import { Card } from '../../../components/Card';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { Loading } from '../../../components/Loading';
import { Ionicons } from '@expo/vector-icons';

export default function SearchFriendsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [existingFriends, setExistingFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { userData } = useAuth();

  const loadExistingConnections = async () => {
    if (!userData || !userData.uid) return;

    try {
      const [requests, friends] = await Promise.all([
        getSentFriendRequests(userData.uid),
        getFriends(userData.uid),
      ]);
      
      setSentRequests(requests.map(r => r.toUserId));
      setExistingFriends(friends.map(f => f.friend.uid));
    } catch (error) {
      console.error('Error loading connections:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter an email to search');
      return;
    }

    if (!userData || !userData.uid) return;

    setSearching(true);
    setHasSearched(true);

    try {
      await loadExistingConnections();
      const results = await searchUsersByEmail(searchQuery.trim(), userData.uid);
      setSearchResults(results);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to search users');
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (toUser: User) => {
    if (!userData) return;

    setLoading(true);
    try {
      await sendFriendRequest(userData, toUser);
      Alert.alert('Success', `Friend request sent to ${toUser.displayName || toUser.email}!`);
      setSentRequests([...sentRequests, toUser.uid]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send friend request');
    } finally {
      setLoading(false);
    }
  };

  const getButtonState = (user: User): { text: string; disabled: boolean; variant: 'primary' | 'secondary' | 'outline' } => {
    if (existingFriends.includes(user.uid)) {
      return { text: 'Already Friends', disabled: true, variant: 'secondary' };
    }
    if (sentRequests.includes(user.uid)) {
      return { text: 'Request Sent', disabled: true, variant: 'outline' };
    }
    return { text: 'Add Friend', disabled: false, variant: 'primary' };
  };

  const renderUser = ({ item }: { item: User }) => {
    const buttonState = getButtonState(item);

    return (
      <Card>
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {(item.displayName || item.email).charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {item.displayName || item.email}
            </Text>
            {item.displayName && (
              <Text style={styles.userEmail}>{item.email}</Text>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.addButton,
              buttonState.variant === 'primary' && styles.addButtonPrimary,
              buttonState.variant === 'secondary' && styles.addButtonSecondary,
              buttonState.variant === 'outline' && styles.addButtonOutline,
              buttonState.disabled && styles.addButtonDisabled,
            ]}
            onPress={() => handleSendRequest(item)}
            disabled={buttonState.disabled || loading}
          >
            {buttonState.variant === 'primary' && !loading ? (
              <Ionicons name="person-add" size={20} color="#fff" />
            ) : (
              <Text style={[
                styles.buttonText,
                buttonState.variant === 'outline' && styles.buttonTextOutline,
              ]}>
                {buttonState.text}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Search Box */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
              <Input
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by email..."
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.searchInput}
              />
            </View>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={handleSearch}
              disabled={searching}
            >
              {searching ? (
                <Loading />
              ) : (
                <Ionicons name="arrow-forward" size={24} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          {/* Info */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              Search for friends by their email address. You can send them a friend request to connect.
            </Text>
          </View>

          {/* Results */}
          {searching ? (
            <Loading message="Searching..." />
          ) : hasSearched ? (
            searchResults.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No users found</Text>
                <Text style={styles.emptySubtext}>
                  Try searching with a different email address
                </Text>
              </View>
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.uid}
                renderItem={renderUser}
                contentContainerStyle={styles.list}
              />
            )
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-circle-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Find Friends</Text>
              <Text style={styles.emptySubtext}>
                Enter an email address above to search for friends
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginLeft: 12,
  },
  searchInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    marginVertical: 0,
  },
  searchButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  list: {
    paddingBottom: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  userEmail: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonPrimary: {
    backgroundColor: '#4CAF50',
  },
  addButtonSecondary: {
    backgroundColor: '#9e9e9e',
  },
  addButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  addButtonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  buttonTextOutline: {
    color: '#4CAF50',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});


