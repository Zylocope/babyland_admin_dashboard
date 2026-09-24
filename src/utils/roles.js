// Backend roles are snake_case; the UI speaks Manager / SaleStaff / TicketStaff.
const ROLE_MAP = {
  sale_admin: 'SaleStaff',
  playground_admin: 'TicketStaff',
  super_admin: 'Manager',
};

export const toUiRole = (role) => ROLE_MAP[role] ?? role ?? 'Staff';
