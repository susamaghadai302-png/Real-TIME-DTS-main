import { useEffect, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { UserRole } from '@dts/shared';
import { useAuthStore } from './stores/authStore';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CustomerTrackingPage from './pages/CustomerTrackingPage';
import CustomerDashboard from './pages/CustomerDashboard';
import DriverDashboard from './pages/DriverDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminDeliveriesPage from './pages/AdminDeliveriesPage';
import AdminDriversPage from './pages/AdminDriversPage';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage';

// ─── Protected Route ─────────────────────────────────────────────────────────
interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole;
}

function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">403 – Forbidden</h1>
          <p className="text-gray-500 mb-6">
            You don't have permission to access this page.
          </p>
          <RoleRedirectButton role={user?.role} />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function RoleRedirectButton({ role }: { role?: UserRole }) {
  const navigate = useNavigate();
  const target =
    role === UserRole.ADMIN ? '/admin' : role === UserRole.DRIVER ? '/driver' : '/dashboard';
  return (
    <button
      onClick={() => navigate(target)}
      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
    >
      Go to my dashboard
    </button>
  );
}

// ─── Root redirect ────────────────────────────────────────────────────────────
function RootRedirect() {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === UserRole.ADMIN) return <Navigate to="/admin" replace />;
  if (user?.role === UserRole.DRIVER) return <Navigate to="/driver" replace />;
  return <Navigate to="/dashboard" replace />;
}

// ─── App Initialiser ─────────────────────────────────────────────────────────
function AppInitialiser() {
  const { restoreSession, isLoading } = useAuthStore();

  useEffect(() => {
    restoreSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/track/:trackingNumber" element={<CustomerTrackingPage />} />

      {/* Customer */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requiredRole={UserRole.CUSTOMER}>
            <CustomerDashboard />
          </ProtectedRoute>
        }
      />

      {/* Driver */}
      <Route
        path="/driver"
        element={
          <ProtectedRoute requiredRole={UserRole.DRIVER}>
            <DriverDashboard />
          </ProtectedRoute>
        }
      />

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/deliveries"
        element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <AdminDeliveriesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/drivers"
        element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <AdminDriversPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <AdminAnalyticsPage />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AppInitialiser />
    </BrowserRouter>
  );
}
