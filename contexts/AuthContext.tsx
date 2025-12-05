import * as React from "react";
import {
  FirebaseUser,
  observeAuthState,
  loginUser,
  registerUser,
  logoutUser,
} from "../firebase/auth";
import { getUser, updateUser } from "../firebase/firestore";
import { 
  getAssociation, 
  getUserAssociations, 
  getMemberByUserId,
  setCurrentAssociation as setCurrentAssociationDb,
} from "../firebase/associations";
import { User, Association, Member, AccountType } from "../types";

interface AuthContextType {
  // User data
  user: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  
  // Association data
  currentAssociation: Association | null;
  currentMember: Member | null;
  userAssociations: Association[];
  associationLoading: boolean;
  
  // Auth functions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, accountType: AccountType) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  
  // Association functions
  switchAssociation: (associationId: string) => Promise<void>;
  refreshAssociation: () => Promise<void>;
  clearAssociation: () => void;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
}: AuthProviderProps) => {
  const [user, setUser] = React.useState<FirebaseUser | null>(null);
  const [userData, setUserData] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  
  // Association state
  const [currentAssociation, setCurrentAssociation] = React.useState<Association | null>(null);
  const [currentMember, setCurrentMember] = React.useState<Member | null>(null);
  const [userAssociations, setUserAssociations] = React.useState<Association[]>([]);
  const [associationLoading, setAssociationLoading] = React.useState(false);

  const loadAssociationData = async (userId: string, associationId: string | undefined) => {
    setAssociationLoading(true);
    try {
      // Load all user's associations
      const associations = await getUserAssociations(userId);
      setUserAssociations(associations);
      
      // If user has a current association, load it
      if (associationId) {
        const association = await getAssociation(associationId);
        if (association) {
          setCurrentAssociation(association);
          
          // Load member data
          const member = await getMemberByUserId(userId, associationId);
          setCurrentMember(member);
        } else {
          // Association not found, clear it
          setCurrentAssociation(null);
          setCurrentMember(null);
        }
      } else if (associations.length > 0) {
        // User has associations but no current one set - use the first one
        const firstAssociation = associations[0];
        setCurrentAssociation(firstAssociation);
        
        // Load member data
        const member = await getMemberByUserId(userId, firstAssociation.id);
        setCurrentMember(member);
        
        // Update user's current association in database
        await updateUser(userId, { currentAssociationId: firstAssociation.id });
      } else {
        // User has no associations
        setCurrentAssociation(null);
        setCurrentMember(null);
      }
    } catch (error) {
      console.error('[AuthContext] Error loading association data:', error);
      setCurrentAssociation(null);
      setCurrentMember(null);
    } finally {
      setAssociationLoading(false);
    }
  };

  const loadUserData = async (firebaseUser: FirebaseUser) => {
    try {
      // Try to get user data from Firestore
      const firestoreUser = await getUser(firebaseUser.uid);
      if (firestoreUser) {
        setUserData(firestoreUser);
        // Load association data
        await loadAssociationData(firebaseUser.uid, firestoreUser.currentAssociationId);
      } else {
        // Fallback to basic data from Firebase Auth
        const basicUser: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          accountType: 'personal', // Default to personal for legacy users
          createdAt: Date.now(),
        };
        setUserData(basicUser);
        // No association data to load for new users
        setUserAssociations([]);
        setCurrentAssociation(null);
        setCurrentMember(null);
      }
    } catch (error) {
      console.error('[AuthContext] Error loading user data:', error);
      // Fallback to basic data
      setUserData({
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        accountType: 'personal', // Default to personal for legacy users
        createdAt: Date.now(),
      });
      setUserAssociations([]);
      setCurrentAssociation(null);
      setCurrentMember(null);
    }
  };

  React.useEffect(() => {
    const unsubscribe = observeAuthState(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await loadUserData(firebaseUser);
      } else {
        setUserData(null);
        setUserAssociations([]);
        setCurrentAssociation(null);
        setCurrentMember(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    const data = await loginUser(email, password);
    setUserData(data);
  };

  const register = async (email: string, password: string, accountType: AccountType) => {
    const data = await registerUser(email, password, accountType);
    setUserData(data);
    
    // For association accounts, we don't create the association here
    // Instead, redirect to association creation screen (handled in register.tsx)
    // The association will be created when they complete the form
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
    setUserData(null);
    setUserAssociations([]);
    setCurrentAssociation(null);
    setCurrentMember(null);
  };

  const refreshUser = async () => {
    if (user) {
      await loadUserData(user);
    }
  };

  /**
   * Switches to a different association
   */
  const switchAssociation = async (associationId: string) => {
    if (!userData) {
      throw new Error('User not logged in');
    }

    // Verify user is a member
    const member = await getMemberByUserId(userData.uid, associationId);
    if (!member || !member.isActive) {
      throw new Error('Not a member of this association');
    }

    // Update in database
    await setCurrentAssociationDb(userData.uid, associationId);

    // Update local state
    const association = await getAssociation(associationId);
    setCurrentAssociation(association);
    setCurrentMember(member);

    // Update userData
    setUserData(prev => prev ? { ...prev, currentAssociationId: associationId } : null);

    console.log('[AuthContext] Switched to association:', associationId);
  };

  /**
   * Refreshes the current association data
   */
  const refreshAssociation = async () => {
    if (userData && userData.currentAssociationId) {
      await loadAssociationData(userData.uid, userData.currentAssociationId);
    }
  };

  /**
   * Clears the current association (for users who want individual mode)
   */
  const clearAssociation = () => {
    setCurrentAssociation(null);
    setCurrentMember(null);
    if (userData) {
      updateUser(userData.uid, { currentAssociationId: undefined });
      setUserData(prev => prev ? { ...prev, currentAssociationId: undefined } : null);
    }
  };

  return React.createElement(
    AuthContext.Provider,
    {
      value: { 
        user, 
        userData, 
        loading, 
        currentAssociation,
        currentMember,
        userAssociations,
        associationLoading,
        login, 
        register, 
        logout, 
        refreshUser,
        switchAssociation,
        refreshAssociation,
        clearAssociation,
      },
    },
    children
  );
};
