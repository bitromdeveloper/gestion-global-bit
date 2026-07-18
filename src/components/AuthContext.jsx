import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

// ============================================================================
// Reemplaza al AuthContext viejo (que comparaba password en texto plano
// contra la tabla public.usuarios). Ahora usa Supabase Auth de verdad,
// y lee rol/módulo desde public.perfiles.
//
// Mantiene la MISMA FORMA que el AuthContext viejo (login, logout,
// changePassword, updateEmails, user.sector) para romper lo menos posible
// el resto de la app. Lo único nuevo es user.modulo y user.rol.
// ============================================================================

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restaura sesión existente (Supabase la persiste solo, no hace falta localStorage manual)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) cargarPerfil(data.session.user.id);
      else setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) cargarPerfil(session.user.id);
      else { setUser(null); setLoading(false); }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function cargarPerfil(id) {
    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('No se encontró el perfil para este usuario:', error);
      setUser(null);
      setLoading(false);
      return;
    }

    setUser({
      id: data.id,
      username: data.nombre,          // compatibilidad con el código viejo que usaba "username"
      nombre: data.nombre,
      sector: data.rol,               // compatibilidad: "sector" viejo === "rol" nuevo
      modulo: data.modulo,
      rol: data.rol,
      datos_personales: data.datos_personales || {},
      email1: data.datos_personales?.email1 ?? null,
      email2: data.datos_personales?.email2 ?? null,
      email3: data.datos_personales?.email3 ?? null,
    });
    setLoading(false);
  }

  const login = async (username, password) => {
    // Generico por ahora: el usuario solo tipea "admin.bra" o "mantenimiento.cilindros",
    // acá se arma el email real para Supabase Auth por atrás.
    const email = username.includes('@') ? username.trim() : `${username.trim()}@bitrom.local`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: 'Usuario o contraseña incorrectos' };
    // cargarPerfil se dispara solo via onAuthStateChange
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const changePassword = async (passwordActual, passwordNueva) => {
    // Verifica la contraseña actual re-autenticando (equivalente a lo que hacía la versión vieja)
    const { error: errVerif } = await supabase.auth.signInWithPassword({
      email: (await supabase.auth.getUser()).data.user.email,
      password: passwordActual,
    });
    if (errVerif) return { error: 'Contraseña actual incorrecta' };

    const { error } = await supabase.auth.updateUser({ password: passwordNueva });
    if (error) return { error: 'Error al actualizar contraseña' };
    return { success: true };
  };

  const updateEmails = async (email1, email2, email3) => {
    const nuevosDatos = { ...(user.datos_personales || {}), email1, email2, email3 };
    const { error } = await supabase
      .from('perfiles')
      .update({ datos_personales: nuevosDatos })
      .eq('id', user.id);
    if (error) return { error: 'Error al actualizar emails' };

    const updated = { ...user, email1, email2, email3, datos_personales: nuevosDatos };
    setUser(updated);
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, changePassword, updateEmails }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
