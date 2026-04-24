import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  // ── Form state ─────────────────────────────────────────────────────────────
  // Logic: Controlled inputs state to track user typing
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    action: 0,
  });

  // ── Async / UI state ───────────────────────────────────────────────────────
  // Logic: isLoading prevents duplicate form submissions
  const [isLoading, setIsLoading] = useState(false);

  // Logic: showForcePrompt toggles between login form and conflict warning
  const [showForcePrompt, setShowForcePrompt] = useState(false);

  // Logic: stores the one-time token needed for force-login confirmation
  const [forceLogToken, setForceLogToken] = useState<string | null>(null);

  const navigate = useNavigate();
  const { login } = useAuth(); // Logic: access the global login action

  // ── Submit handler ─────────────────────────────────────────────────────────

  /**
   * AUTH SUBMISSION LOGIC:
   * This is the core logic for signing in.
   * Logic:
   * 1. PREVENT DEFAULT: Stop the browser from reloading the page.
   * 2. SET LOADING: Disable the UI to prevent race conditions.
   * 3. API CALL: Post credentials to /auth/login.
   * 4. HANDLE CONFLICT (409): If backend detects another session, switch UI to "Force Login" mode.
   * 5. HANDLE SUCCESS: Call 'login()' from context to persist user and then navigate to Dashboard.
   * 6. HANDLE ERROR: Display descriptive error messages via toast.
   */
  const handleSubmit = async (e: React.FormEvent, isForce = false) => {
    e?.preventDefault(); // Logic: essential for SPA to handle form via JS
    setIsLoading(true);

    try {
      // Logic: Merge 'action' flag into payload. 1 = force login.
      const payload: any = { ...formData, action: isForce ? 1 : 0 };
      if (isForce && forceLogToken) {
        payload.force_log_token = forceLogToken; // Logic: Include the required validation token
      }

      // Logic: Execute the backend request via the global axios instance
      const response = await api.post('/auth/login', payload);

      // Logic: Update application state with returned user profile
      login(response.data?.user);
      toast.success('Welcome back!');
      
      // Logic: Redirect the user to the protected area (Dashboard)
      navigate('/');
    } catch (error: any) {
      if (error.response?.status === 409) {
        // Logic: Conflict detected. Extract the force login token and show the confirmation prompt.
        const token = error.response?.data?.forceLogToken;
        setForceLogToken(token || null);
        setShowForcePrompt(true);
        toast('You are already logged in on another device.', { icon: '⚠️' });
      } else {
        // Logic: General login failure (wrong password, etc.)
        toast.error(error.response?.data?.message || error.message || 'Login failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl shadow-slate-100 p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Welcome Back</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">Please enter your details to sign in</p>
        </div>

        {/* Logic Rendering: Decide whether to show the form or the force-login prompt */}
        {!showForcePrompt ? (
          <form onSubmit={(e) => handleSubmit(e)}>
            <div className="mb-5">
              <label className="block mb-2 text-sm font-bold text-slate-700">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-12 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  placeholder="john@example.com"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="mb-5">
              <label className="block mb-2 text-sm font-bold text-slate-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-12 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  placeholder="••••••••"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 font-black text-white hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  Sign In <LogIn size={18} />
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle size={48} className="text-amber-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">Active Session Found</h2>
            <p className="text-slate-500 mb-6">
              You are already logged in from another device. Would you like to terminate that session and login here?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleSubmit(null as any, true)}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 font-black text-white hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="animate-spin" /> : 'Yes, Log Me In'}
              </button>
              <button
                onClick={() => { setShowForcePrompt(false); setForceLogToken(null); }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-black text-slate-800 border border-slate-200 hover:bg-slate-50 active:scale-[0.99]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-sm font-medium text-slate-600">
          Don't have an account?{' '}
          <Link to="/register" className="font-black text-indigo-600 hover:text-indigo-700 underline-offset-4 hover:underline">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
