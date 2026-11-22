// src/context/AuthProvider.jsx — who is signed in, shared with the whole app (read it with useAuth()).
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';
import { AuthContext } from './AuthContext';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef(null);
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    const init = async () => {
      if (authService.isAuthenticated()) {
        try {
          const me = await authService.me();
          setUser(me);
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  // Both portals live on one site and share one stored sign-in. When another tab signs in or out,
  // or a staff screen is refused, re-read who is signed in so the guards show the right portal.
  useEffect(() => {
    let checking = false;
    const recheck = async () => {
      if (checking) return;
      checking = true;
      try {
        if (!authService.isAuthenticated()) {
          setUser(null);
          return;
        }
        const me = await authService.me();
        const prev = userRef.current;
        const isStaff = ['admin', 'manager'].includes(me?.role);
        if (prev && (prev.id !== me.id || (['admin', 'manager'].includes(prev.role) && !isStaff))) {
          toast.error(`This browser is now signed in as ${me.email}.`
            + (isStaff || me?.role === 'trainer' ? '' : ' Sign in with a staff account to use the admin portal.'),
          { id: 'account-switch', duration: 8000 });
        }
        setUser(me);
        localStorage.setItem('user', JSON.stringify(me));
      } catch {
        setUser(null);
      } finally {
        checking = false;
      }
    };
    const onStorage = (e) => {
      if (e.key === null || e.key === 'access_token' || e.key === 'user') recheck();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('auth:forbidden', recheck);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('auth:forbidden', recheck);
    };
  }, []);

  // Returns the API answer. With 2-step verification it is {two_factor, ticket…} and nobody is
  // signed in yet — the login page shows the code step, then calls finishLogin().
  const login = async (email, password) => {
    const data = await authService.login(email, password);
    if (!data.two_factor) setUser(data.user);
    return data;
  };

  /** After the code step: {access, refresh, user} from verify / setup confirm. */
  const finishLogin = (data) => {
    authService.storeSession(data);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  // Re-read the user from the API (e.g. after a password change clears must_change_password).
  const refreshUser = async () => {
    const me = await authService.me();
    localStorage.setItem('user', JSON.stringify(me));
    setUser(me);
    return me;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        finishLogin,
        logout,
        refreshUser,
        isAuthenticated: !!user,
        mustChangePassword: !!user?.must_change_password,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
