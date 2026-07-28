import { useState } from 'react';
import { loginAdmin, logoutAdmin } from '../services/authService';
import { AuthContext, hydrateUser, toUserData } from './auth-helpers';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = sessionStorage.getItem('al_user');
    return stored ? hydrateUser(JSON.parse(stored)) : null;
  });

  const login = async (username, password) => {
    try {
      const account = await loginAdmin({ username, password });
      const userData = toUserData(account, username);

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

export default AuthProvider;
