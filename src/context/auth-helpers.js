import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

const ROLE_MAP = {
  "sale_admin": 'SaleStaff',
  "playground_admin": 'TicketStaff',
  "super_admin": 'Manager',
};

const toUiRole = (role) => ROLE_MAP[role] ?? role ?? 'Staff';

export const hydrateUser = (value) => {
  if (!value) return null;

  return {
    ...value,
    role: toUiRole(value.role),
    apiRole: value.apiRole ?? value.role ?? null,
    name: value.name ?? value.username ?? 'Admin',
  };
};

export const toUserData = (account, username) => ({
  id: account.id ?? null,
  username: account.username ?? username,
  name: account.username ?? username,
  role: toUiRole(account.role),
  apiRole: account.role ?? null,
});

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
