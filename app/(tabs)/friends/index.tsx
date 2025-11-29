import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getFriends,
  getPendingFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
} from '../../../firebase/firestore';
import { FriendRequest, Friendship, User } from '../../../types';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Loading } from '../../../components/Loading';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

type TabType = 'friends' | 'requests';

export default function FriendsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [friends, setFriends] = useState<{ friendship: Friendship; friend: User }[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [indexBuilding, setIndexBuilding] = useState(false);
  const { userData } = useAuth();
  const router = useRouter();

  const loadData = async () => {
    if (!userData || !userData.uid) {
      console.log('[FriendsScreen] No userData or userData.uid, skipping load');
      setLoading(false);
      return;
    }

    try {
      const [friendsData, requestsData] = await Promise.all([
        getFriends(userData.uid),
        getPendingFriendRequests(userData.uid),
      ]);
      setFriends(friendsData);
      setRequests(requestsData);
      setIndexBuilding(false);
    } catch (error: any) {
      console.error('[FriendsScreen] Error loading data:', error);
      
      // Check if it's an index building error
      if (error.code === 'failed-precondition' && error.message?.includes('index')) {
        setIndexBuilding(true);
        // Don't show alert for index building - show UI message instead
      } else {
        setIndexBuilding(false);
        Alert.alert('Error', 'Failed to load friends: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [userData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAcceptRequest = async (request: FriendRequest) => {
    if (!userData) return;
    
    try {
      await acceptFriendRequest(request.id, userData);
      Alert.alert('Success', 'Friend request accepted!');
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept request');
    }
  };

  const handleRejectRequest = async (request: FriendRequest) => {
    if (!userData) return;

    Alert.alert(
      'Reject Request',
      `Reject friend request from ${request.fromUserDisplayName || request.fromUserEmail}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectFriendRequest(request.id, userData.uid);
              Alert.alert('Done', 'Friend request rejected');
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to reject request');
            }
          },
        },
      ]
    );
  };

  const handleRemoveFriend = (friendship: Friendship, friend: User) => {
    if (!userData) return;

    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friend.displayName || friend.email} as a friend?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFriend(friendship.id, userData.uid);
              Alert.alert('Done', 'Friend removed');
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove friend');
            }
          },
        },
      ]
    );
  };

  const renderFriend = ({ item }: { item: { friendship: Friendship; friend: User } }) => (
    <TouchableOpacity onPress={() => router.push(`/(tabs)/friends/${item.friend.uid}`)}>
      <Card>
        <View style={styles.friendCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {(item.friend.displayName || item.friend.email).charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.friendInfo}>
            <Text style={styles.friendName}>
              {item.friend.displayName || item.friend.email}
            </Text>
            {item.friend.displayName && (
              <Text style={styles.friendEmail}>{item.friend.email}</Text>
            )}
            <Text style={styles.friendSince}>
              Friends since {format(new Date(item.friendship.createdAt), 'MMM dd, yyyy')}
            </Text>
          </View>
          <View style={styles.friendActions}>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveFriend(item.friendship, item.friend)}
            >
              <Ionicons name="person-remove-outline" size={20} color="#f44336" />
            </TouchableOpacity>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  const renderRequest = ({ item }: { item: FriendRequest }) => (
    <Card>
      <View style={styles.requestCard}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {(item.fromUserDisplayName || item.fromUserEmail).charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.requestInfo}>
          <Text style={styles.friendName}>
            {item.fromUserDisplayName || item.fromUserEmail}
          </Text>
          {item.fromUserDisplayName && (
            <Text style={styles.friendEmail}>{item.fromUserEmail}</Text>
          )}
          <Text style={styles.requestDate}>
            Sent {format(new Date(item.createdAt), 'MMM dd, yyyy')}
          </Text>
        </View>
        <View style={styles.requestActions}>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handleAcceptRequest(item)}
          >
            <Ionicons name="checkmark" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={() => handleRejectRequest(item)}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );

  if (loading) {
    return <Loading message="Loading friends..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Ionicons
            name="people"
            size={20}
            color={activeTab === 'friends' ? '#4CAF50' : '#999'}
          />
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Friends ({friends.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Ionicons
            name="mail"
            size={20}
            color={activeTab === 'requests' ? '#4CAF50' : '#999'}
          />
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Requests ({requests.length})
          </Text>
          {requests.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{requests.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {indexBuilding && (
          <View style={styles.indexBuildingCard}>
            <Ionicons name="hourglass-outline" size={24} color="#FF9800" />
            <View style={styles.indexBuildingText}>
              <Text style={styles.indexBuildingTitle}>Setting up friends feature...</Text>
              <Text style={styles.indexBuildingSubtext}>
                The database index is being created. This usually takes 1-2 minutes. Please refresh in a moment.
              </Text>
            </View>
          </View>
        )}
        {activeTab === 'friends' ? (
          friends.length === 0 && !indexBuilding ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No friends yet</Text>
              <Text style={styles.emptySubtext}>
                Search for friends to connect with!
              </Text>
            </View>
          ) : friends.length > 0 ? (
            <FlatList
              data={friends}
              keyExtractor={(item) => item.friendship.id}
              renderItem={renderFriend}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
              }
              contentContainerStyle={styles.list}
            />
          ) : null
        ) : (
          requests.length === 0 && !indexBuilding ? (
            <View style={styles.emptyState}>
              <Ionicons name="mail-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No pending requests</Text>
              <Text style={styles.emptySubtext}>
                When someone sends you a friend request, it will appear here.
              </Text>
            </View>
          ) : requests.length > 0 ? (
            <FlatList
              data={requests}
              keyExtractor={(item) => item.id}
              renderItem={renderRequest}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
              }
              contentContainerStyle={styles.list}
            />
          ) : null
        )}
      </View>

      {/* Add Friend Button */}
      <Button
        title="+ Find Friends"
        onPress={() => router.push('/(tabs)/friends/search')}
        style={styles.addButton}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  activeTabText: {
    color: '#4CAF50',
  },
  badge: {
    backgroundColor: '#f44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  list: {
    paddingBottom: 16,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  friendEmail: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  friendSince: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  friendActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  removeButton: {
    padding: 8,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestInfo: {
    flex: 1,
  },
  requestDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
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
  addButton: {
    margin: 16,
  },
  indexBuildingCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'flex-start',
    gap: 12,
  },
  indexBuildingText: {
    flex: 1,
  },
  indexBuildingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 4,
  },
  indexBuildingSubtext: {
    fontSize: 13,
    color: '#F57C00',
    lineHeight: 18,
  },
});

