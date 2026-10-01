import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Package, Zap } from 'lucide-react';
import { UserRole } from '@dts/shared';
import { useAuthStore } from '../stores/authStore';

interface DemoCredential {
  label: string;
  email: string;
  password: string;
  role: UserRole;
  color: string;
}

const DEMO_CREDENTIALS: DemoCredential[] = [
  {
    label: 'Admin Demo',
    email: 'admin@dts.dev',
    password: 'Admin@123',
    role: UserRole.ADMIN,
    color: 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200',
  },
  {
    label: 'Driver Demo',
    email: 'driver@dts.dev',
    password: 'Driver@123',
    role: UserRole.DRIVER,
    color: 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200',
  },
  {
    label: 'Customer Demo',
    email: 'customer@dts.dev',
    password: 'Customer@123',
    role: UserRole.CUSTOMER,
    color: 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200',
  },
];

function roleRedirect(role: UserRole): string {
  if (role === UserRole.ADMIN) return '/admin';
  if (role === UserRole.DRIVER) return '/driver';
  return '/dashboard';
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
      const user = useAuthStore.getState().user;
      navigate(roleRedirect(user!.role), { replace: true });
    } catch {
      // error is set in store
    }
  };

  const handleDemo = async (cred: DemoCredential) => {
    clearError();
    setDemoLoading(cred.label);
    try {
      await login(cred.email, cred.password);
      navigate(roleRedirect(cred.role), { replace: true });
    } catch {
      // error displayed from store
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-xl mb-4 shadow-lg">
              <Package className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome to DTS</h1>
            <p className="text-gray-500 text-sm mt-1">Real-Time Delivery Tracking System</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
              <span className="flex-shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-lg text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-gray-400 font-medium">Quick demo access</span>
            </div>
          </div>

          {/* Demo buttons */}
          <div className="grid grid-cols-3 gap-2">
            {DEMO_CREDENTIALS.map((cred) => (
              <button
                key={cred.label}
                onClick={() => handleDemo(cred)}
                disabled={isLoading || demoLoading !== null}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-semibold transition-all disabled:opacity-60 ${cred.color}`}
              >
                {demoLoading === cred.label ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Zap className="w-3 h-3" />
                )}
                {cred.label}
              </button>
            ))}
          </div>

          {/* Register link */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-indigo-600 font-medium hover:text-indigo-700">
              Create one
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-white/60 text-xs mt-6">
          © 2026 DTS – Real-Time Delivery Tracking
        </p>
      </div>
    </div>
  );
}
