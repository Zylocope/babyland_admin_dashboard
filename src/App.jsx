import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import ProductForm from './pages/ProductForm';
import Categories from './pages/Categories';
import Orders from './pages/Orders';
import POS from './pages/POS';
import SalesDashboard from './pages/SalesDashboard';
import Playground from './pages/Playground';
import PlaygroundApp from './pages/PlaygroundApp';
import Customers from './pages/Customers';
import Staff from './pages/Staff';
import Settings from './pages/Settings';
import Assistant from './pages/Assistant';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

// Allow Manager (always) + the listed staff roles; otherwise bounce to dashboard.
function RoleRoute({ roles = [], children }) {
  const { user, can } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!can(...roles)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

      {/* Staff app view — deliberately OUTSIDE AppLayout so it renders full
          bleed with no desktop sidebar or header. This is the screen staff hold
          at the playground door; /playground stays the admin info page. */}
      <Route path="/playground-app" element={
        <ProtectedRoute><RoleRoute roles={['TicketStaff']}><PlaygroundApp /></RoleRoute></ProtectedRoute>
      } />
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        {/* Each staff role lands on the screen it works from; only managers get the
            dashboard. The index route is not role-guarded, so without these
            redirects a staff member hitting "/" would still render Dashboard. */}
        <Route index element={
          user?.role === 'TicketStaff' ? <Navigate to="/playground-app" replace />
            : user?.role === 'SaleStaff' ? <Navigate to="/pos" replace />
              : <Dashboard />
        } />
        <Route path="playground" element={<RoleRoute roles={['TicketStaff']}><Playground /></RoleRoute>} />
        <Route path="pos" element={<RoleRoute roles={['SaleStaff']}><POS /></RoleRoute>} />
        <Route path="sales" element={<RoleRoute roles={[]}><SalesDashboard /></RoleRoute>} />
        <Route path="products" element={<RoleRoute roles={['SaleStaff']}><Products /></RoleRoute>} />
        <Route path="products/new" element={<RoleRoute roles={['SaleStaff']}><ProductForm /></RoleRoute>} />
        <Route path="products/:id/edit" element={<RoleRoute roles={['SaleStaff']}><ProductForm /></RoleRoute>} />
        <Route path="categories" element={<RoleRoute roles={[]}><Categories /></RoleRoute>} />
        <Route path="orders" element={<RoleRoute roles={['SaleStaff']}><Orders /></RoleRoute>} />
        <Route path="customers" element={<RoleRoute roles={['SaleStaff', 'TicketStaff']}><Customers /></RoleRoute>} />
        <Route path="staff" element={<RoleRoute roles={[]}><Staff /></RoleRoute>} />
        <Route path="assistant" element={<RoleRoute roles={[]}><Assistant /></RoleRoute>} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
