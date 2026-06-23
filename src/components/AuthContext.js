import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('tubos_user');
    const storedToken = localStorage.getItem('tubos_token');
    if (storedUser && storedToken) {
      try { setUser(JSON.parse(storedUser)); } catch {}
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const data = await api.login(username, password);
      localStorage.setItem('tubos_token', data.token);
      localStorage.setItem('tubos_user', JSON.stringify(data.user));
      setUser(data.user);
      return { user: data.user };
    } catch (err) {
      return { error: err.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('tubos_token');
    localStorage.removeItem('tubos_user');
    setUser(null);
  };

  const changePassword = async (passwordActual, passwordNueva) => {
    try {
      await api.cambiarPassword(passwordActual, passwordNueva);
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  };

  const updateEmails = async (email1, email2, email3) => {
    try {
      await api.actualizarEmails(email1, email2, email3);
      const updated = { ...user, email1, email2, email3 };
      setUser(updated);
      localStorage.setItem('tubos_user', JSON.stringify(updated));
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, changePassword, updateEmails }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
