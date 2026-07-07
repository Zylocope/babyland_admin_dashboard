import { createContext, useContext, useState } from 'react';
import { loginAdmin, logoutAdmin } from '../services/baseService';

export const AuthContext = createContext(null);

const ROLE_MAP = {
  SaleAdmin: 'SaleStaff',
  PlaygroundAdmin: 'TicketStaff',
  SuperAdmin: 'Manager',
};

const toUiRole = (role) => ROLE_MAP[role] ?? role ?? 'Staff';

const hydrateUser = (value) => {
  if (!value) return null;

  return {
    ...value,
    role: toUiRole(value.role),
    apiRole: value.apiRole ?? value.role ?? null,
    name: value.name ?? value.username ?? 'Admin',
  };
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = sessionStorage.getItem('al_user');
    return stored ? hydrateUser(JSON.parse(stored)) : null;
  });

  const login = async (username, password) => {
    try {
      const account = await loginAdmin({ username, password });

      const userData = {
        id: account.id ?? null,
        username: account.username ?? username,
        name: account.username ?? username,
        role: toUiRole(account.role),
        apiRole: account.role ?? null,
      };

      sessionStorage.setItem('al_user', JSON.stringify(userData));
      setUser(userData);
      return { success: true, data: userData };
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Unable to sign in.';
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await logoutAdmin();
    } catch {
      // Clear local auth state even if the server-side session is already gone.
    }

    sessionStorage.removeItem('al_user');
    setUser(null);
  };

  const isManager = user?.role === 'Manager';
  // role-aware helper: does the current user have access to a feature area?
  const can = (...roles) => !!user && (isManager || roles.includes(user.role));

  return (
    <AuthContext.Provider value={{ user, login, logout, isManager, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthProvider;
