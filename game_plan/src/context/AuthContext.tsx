import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { createGuestSession } from '../lib/multiplayerService';

type User = any;

interface GuestUser {
  type: 'guest';
  id: string;
  name: string;
  sessionToken: string;
}

interface AuthContextType {
  user: User | null;
  guestUser: GuestUser | null;
  isGuest: boolean;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loginAsGuest: (guestName: string) => Promise<void>;
  logoutGuest: () => void;
  currentPlayer: { id: string; name: string; isGuest: boolean } | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [guestUser, setGuestUser] = useState<GuestUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Load guest session from localStorage if it exists
  useEffect(() => {
    const savedGuest = localStorage.getItem('guestSession');
    if (savedGuest) {
      try {
        const guest = JSON.parse(savedGuest);
        setGuestUser(guest);
      } catch (err) {
        localStorage.removeItem('guestSession');
      }
    }
  }, []);

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data?.session?.user || null);
      setLoading(false);
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    // Clear guest session if switching to auth
    localStorage.removeItem('guestSession');
    setGuestUser(null);

    // Sign up with Supabase Auth
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;

    // Create player profile
    if (data.user) {
      const { error: profileError } = await supabase.from('players').insert({
        id: data.user.id,
        email,
        username,
      });

      if (profileError) throw profileError;
    }
  };

  const signIn = async (email: string, password: string) => {
    // Clear guest session if switching to auth
    localStorage.removeItem('guestSession');
    setGuestUser(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setGuestUser(null);
    localStorage.removeItem('guestSession');
  };

  const loginAsGuest = async (guestName: string) => {
    // Clear any existing auth session
    await supabase.auth.signOut();
    setUser(null);

    // Create guest session
    const guestSession = await createGuestSession(guestName);
    
    const guest: GuestUser = {
      type: 'guest',
      id: guestSession.id,
      name: guestName,
      sessionToken: guestSession.session_token,
    };

    setGuestUser(guest);
    localStorage.setItem('guestSession', JSON.stringify(guest));
  };

  const logoutGuest = () => {
    setGuestUser(null);
    localStorage.removeItem('guestSession');
  };

  const currentPlayer = user
    ? { id: user.id, name: user.email || 'User', isGuest: false }
    : guestUser
    ? { id: guestUser.id, name: guestUser.name, isGuest: true }
    : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        guestUser,
        isGuest: !!guestUser,
        loading,
        signUp,
        signIn,
        signOut,
        loginAsGuest,
        logoutGuest,
        currentPlayer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
