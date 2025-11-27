import * as React from "react";
import {
  FirebaseUser,
  observeAuthState,
  loginUser,
  registerUser,
  logoutUser,
} from "../firebase/auth";
import { User } from "../types";

interface AuthContextType {
  user: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
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

  React.useEffect(() => {
    const unsubscribe = observeAuthState((firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setUserData({
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          createdAt: Date.now(),
        });
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

  return React.createElement(
    AuthContext.Provider,
    {
      value: { user, userData, loading, login, register, logout },
    },
    children
  );
};
