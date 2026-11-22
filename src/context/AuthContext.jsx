// src/context/AuthContext.jsx — the signed-in user's context and useAuth(); the provider is in AuthProvider.jsx.
import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}