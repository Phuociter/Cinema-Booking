/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { accountApi } from '../api/useAccount';
import AuthModal from '../components/AuthModal';

import { useClerk, useAuth as useClerkAuth } from '@clerk/clerk-react';

const TOKEN_KEY = 'cinema_access_token';
const USER_KEY = 'cinema_user';
const IS_CLERK_ENABLED = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

const AuthContext = createContext(null);

function ClerkSyncHandler() {
  const { isSignedIn, getToken, isLoaded } = useClerkAuth();
  const clerk = useClerk();
  const { loginWithClerk, isAuthenticated } = useAuth();
  const isSyncingRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || isSyncingRef.current) return;

    const activeSession = clerk?.session || clerk?.client?.sessions?.find((s) => s.status === 'active') || clerk?.client?.sessions?.[0];

    if ((isSignedIn || activeSession) && !isAuthenticated) {
      isSyncingRef.current = true;
      const tokenPromise = activeSession ? activeSession.getToken() : getToken();
      tokenPromise
        .then(async (clerkToken) => {
          if (!clerkToken) return;
          try {
            await loginWithClerk(clerkToken);
            const redirectUrl = sessionStorage.getItem('redirect_after_login');
            if (redirectUrl) {
              sessionStorage.removeItem('redirect_after_login');
              window.location.href = redirectUrl;
            }
          } catch (err) {
            console.error('Lỗi tự động đồng bộ tài khoản Clerk:', err);
          }
        })
        .catch((err) => {
          console.error('Lỗi lấy Clerk Token:', err);
        })
        .finally(() => {
          isSyncingRef.current = false;
        });
    }
  }, [isSignedIn, isAuthenticated, isLoaded, getToken, loginWithClerk, clerk]);

  return null;
}

export function AuthProvider({ children }) {
  const clerk = useClerk();
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem(USER_KEY);
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [authModal, setAuthModal] = useState(null); // 'login' | 'register' | null

  useEffect(() => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }, [user]);

  useEffect(() => {
    const handleAuthExpired = () => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setToken(null);
      setUser(null);
    };

    window.addEventListener('cinema:auth-expired', handleAuthExpired);
    return () => window.removeEventListener('cinema:auth-expired', handleAuthExpired);
  }, []);

  const authenticate = async (request) => {
    const data = await request;
    if (data?.token) localStorage.setItem(TOKEN_KEY, data.token);
    if (data?.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const login = (payload) => authenticate(accountApi.login(payload));
  const register = (payload) => authenticate(accountApi.register(payload));
  const loginWithClerk = (clerkToken) => authenticate(accountApi.clerkSync(clerkToken));
  const logout = async () => {
    try {
      if (IS_CLERK_ENABLED && clerk) {
        await clerk.signOut();
      }
    } catch (err) {
      console.warn('Clerk signOut error:', err);
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setToken(null);
      setUser(null);
    }
  };

  const openLoginModal = useCallback(() => setAuthModal('login'), []);
  const openRegisterModal = useCallback(() => setAuthModal('register'), []);
  const closeAuthModal = useCallback(() => setAuthModal(null), []);

  return (
    <AuthContext.Provider value={{
      token,
      user,
      isAuthenticated: Boolean(token),
      login,
      register,
      loginWithClerk,
      logout,
      authModal,
      openLoginModal,
      openRegisterModal,
      closeAuthModal,
      setAuthModal
    }}>
      {IS_CLERK_ENABLED && <ClerkSyncHandler />}
      {children}
      {authModal && <AuthModal mode={authModal} onClose={closeAuthModal} />}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

