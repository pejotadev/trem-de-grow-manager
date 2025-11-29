import * as React from "react";
import {
  FirebaseUser,
  observeAuthState,
  loginUser,
  registerUser,
  logoutUser,
} from "../firebase/auth";
import { getUser } from "../firebase/firestore";
import { User } from "../types";

interface AuthContextType {
  user: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
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

  const loadUserData = async (firebaseUser: FirebaseUser) => {
    try {
      // Try to get user data from Firestore
      const firestoreUser = await getUser(firebaseUser.uid);
      if (firestoreUser) {
        setUserData(firestoreUser);
      } else {
        // Fallback to basic data from Firebase Auth
        setUserData({
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          createdAt: Date.now(),
        });
      }
    } catch (error) {
      console.error('[AuthContext] Error loading user data:', error);
      // Fallback to basic data
      setUserData({
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        createdAt: Date.now(),
      });
    }
  };

  React.useEffect(() => {
    const unsubscribe = observeAuthState(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await loadUserData(firebaseUser);
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    const data = await loginUser(email, password);
    setUserData(data);
  };

  const register = async (email: string, password: string) => {
    const data = await registerUser(email, password);
    setUserData(data);
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
    setUserData(null);
  };

  const refreshUser = async () => {
    if (user) {
      await loadUserData(user);
    }
  };

  return React.createElement(
    AuthContext.Provider,
    {
      value: { user, userData, loading, login, register, logout, refreshUser },
    },
    children
  );
};
