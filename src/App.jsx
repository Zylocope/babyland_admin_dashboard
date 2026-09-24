import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AppLayout from './components/layout/AppLayout';
import RouteFallback from './components/common/RouteFallback';
import Settings from './pages/Settings';

// The shell (layout, sidebar, header) stays eager -- it is on screen for every
// route, so deferring it would only add a round trip before anything renders.
// Most pages are split: nobody loads all thirteen, and the two chart screens
// drag in recharts, the single heaviest dependency. Settings stays eager: it is
// tiny, frequently opened, and should not wait on its own first-use request.
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products = lazy(() => import('./pages/Products'));
const StockIn = lazy(() => import('./pages/StockIn'));
const ProductForm = lazy(() => import('./pages/ProductForm'));
const Categories = lazy(() => import('./pages/Categories'));
const Orders = lazy(() => import('./pages/Orders'));
const POS = lazy(() => import('./pages/POS'));
const SalesDashboard = lazy(() => import('./pages/SalesDashboard'));
const Playground = lazy(() => import('./pages/Playground'));
const PlaygroundApp = lazy(() => import('./pages/PlaygroundApp'));
const Customers = lazy(() => import('./pages/Customers'));
const Staff = lazy(() => import('./pages/Staff'));
const Information = lazy(() => import('./pages/Information'));
const Assistant = lazy(() => import('./pages/Assistant'));

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
    // One boundary around the whole switch: a page swap is the only thing that
    // suspends, and the shell stays mounted behind the fallback.
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      {['help', 'about', 'privacy', 'terms'].map(page => <Route key={page} path={`/${page}`} element={<Information page={page} />} />)}
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
        <Route path="playground" element={<RoleRoute roles={[]}><Playground /></RoleRoute>} />
        <Route path="pos" element={<RoleRoute roles={['SaleStaff']}><POS /></RoleRoute>} />
        <Route path="sales" element={<RoleRoute roles={[]}><SalesDashboard /></RoleRoute>} />
        <Route path="products" element={<RoleRoute roles={['SaleStaff']}><Products /></RoleRoute>} />
        {/* Manager only: create/update/delete product are all RequiresRole<SuperAdminRole>
            on the backend, so letting sale staff open the form only gets them a 403
            on save. The buttons are already hidden; this closes the direct URL. */}
        <Route path="products/new" element={<RoleRoute roles={[]}><ProductForm /></RoleRoute>} />
        <Route path="products/:id/edit" element={<RoleRoute roles={[]}><ProductForm /></RoleRoute>} />
        <Route path="stock-in" element={<RoleRoute roles={[]}><StockIn /></RoleRoute>} />
        <Route path="categories" element={<RoleRoute roles={[]}><Categories /></RoleRoute>} />
        <Route path="orders" element={<RoleRoute roles={['SaleStaff']}><Orders /></RoleRoute>} />
        <Route path="customers" element={<RoleRoute roles={[]}><Customers /></RoleRoute>} />
        <Route path="staff" element={<RoleRoute roles={[]}><Staff /></RoleRoute>} />
        <Route path="assistant" element={<RoleRoute roles={[]}><Assistant /></RoleRoute>} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
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
