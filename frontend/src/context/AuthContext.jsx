import { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      const token = localStorage.getItem('housebalance_token');
      if (!token) {
        if (active) setLoading(false);
        return;
      }

      try {
        const data = await apiFetch('/auth/me');
        if (active) setUser(data.user);
      } catch (error) {
        localStorage.removeItem('housebalance_token');
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    function authChanged() {
      setUser(null);
      setLoading(false);
    }

    loadUser();
    window.addEventListener('housebalance-auth-changed', authChanged);
    return () => {
      active = false;
      window.removeEventListener('housebalance-auth-changed', authChanged);
    };
  }, []);

  function login(token, authenticatedUser) {
    localStorage.setItem('housebalance_token', token);
    setUser(authenticatedUser);
  }

  function logout() {
    localStorage.removeItem('housebalance_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
}

