import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

// Roles: Manager (full access, may overlap), SaleStaff (products + orders),
// TicketStaff (playground). Staff roles do not overlap each other.
// Hardcoded credentials for dev — swap for Supabase auth when backend is ready
const CREDENTIALS = {
  manager55: { password: 'manager55', role: 'Manager',     name: 'Mg Mg (Manager)' },
  sale77:    { password: 'sale77',    role: 'SaleStaff',   name: 'Su Su (Sale Staff)' },
  ticket77:  { password: 'ticket77',  role: 'TicketStaff', name: 'Kyaw Kyaw (Ticket Staff)' },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = sessionStorage.getItem('al_user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = (username, password) => {
    const record = CREDENTIALS[username];
    if (!record || record.password !== password) {
      return { success: false, error: 'Invalid username or password.' };
    }
    const userData = { username, role: record.role, name: record.name };
    sessionStorage.setItem('al_user', JSON.stringify(userData));
    setUser(userData);
    return { success: true };
  };

  const logout = () => {
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
