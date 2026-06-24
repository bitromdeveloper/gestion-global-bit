import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('tubos_user');
    if (stored) { try { setUser(JSON.parse(stored)); } catch {} }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const { data, error } = await supabase
      .from('usuarios').select('*')
      .eq('username', username.trim())
      .maybeSingle();

    if (error || !data) return { error: 'Usuario o contraseña incorrectos' };
    if (data.password_hash !== password) return { error: 'Usuario o contraseña incorrectos' };

    const userData = {
      id: data.id, username: data.username, sector: data.sector,
      email1: data.email1, email2: data.email2, email3: data.email3,
    };
    setUser(userData);
    localStorage.setItem('tubos_user', JSON.stringify(userData));
    return { user: userData };
  };

  const logout = () => {
    localStorage.removeItem('tubos_user');
    setUser(null);
  };

  const changePassword = async (passwordActual, passwordNueva) => {
    const { data } = await supabase.from('usuarios').select('id')
      .eq('id', user.id).eq('password_hash', passwordActual).maybeSingle();
    if (!data) return { error: 'Contraseña actual incorrecta' };
    const { error } = await supabase.from('usuarios')
      .update({ password_hash: passwordNueva, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (error) return { error: 'Error al actualizar contraseña' };
    return { success: true };
  };

  const updateEmails = async (email1, email2, email3) => {
    const { error } = await supabase.from('usuarios')
      .update({ email1, email2, email3, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (error) return { error: 'Error al actualizar emails' };
    const updated = { ...user, email1, email2, email3 };
    setUser(updated);
    localStorage.setItem('tubos_user', JSON.stringify(updated));
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, changePassword, updateEmails }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
