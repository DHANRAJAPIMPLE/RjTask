import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Phone, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';

const RegisterPage = () => {
  // ── Form state ─────────────────────────────────────────────────────────────
  // Logic: stores all user-entered data for creating a new account
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // ── Field change helper ────────────────────────────────────────────────────
  /**
   * FORM UPDATE LOGIC:
   * Dynamically updates the form state as the user types.
   * Logic:
   * 1. Uses computed property names `[field]` to update only the changed key.
   * 2. This keeps the component 'controlled' and the UI reactive.
   */
  const handleChange = (field: keyof typeof formData) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  // ── Submit handler ─────────────────────────────────────────────────────────
  /**
   * REGISTRATION SUBMISSION LOGIC:
   * Logic:
   * 1. PREVENT RELOAD: SPA handling.
   * 2. API POST: Send details to /auth/register.
   * 3. FEEDBACK: Show successful registration toast.
   * 4. NAVIGATION: Move user to /login page to sign in with their new credentials.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Logic: Hit the registration endpoint
      await api.post('/auth/register', formData);
      
      toast.success('Registration successful! Please login.');
      
      // Logic: Account created, now move to login to start a session
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl shadow-slate-100 p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Create Account</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">Join us to manage your companies</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="block mb-2 text-sm font-bold text-slate-700">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                className="w-full rounded-2xl border border-slate-200 bg-white px-12 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                placeholder="John Doe"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

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
            <label className="block mb-2 text-sm font-bold text-slate-700">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                className="w-full rounded-2xl border border-slate-200 bg-white px-12 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                placeholder="1234567890"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                Register <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm font-medium text-slate-600">
          Already have an account?{' '}
          <Link to="/" className="font-black text-indigo-600 hover:text-indigo-700 underline-offset-4 hover:underline">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
