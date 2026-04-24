import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  LayoutDashboard,
  LogOut,
  User,
  Users,
  ChevronDown,
  Menu,
  X,
  Bell
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onViewChange: (view: 'my-companies' | 'all-companies' | 'users') => void;
  activeView: string;
}

const DashboardLayout: React.FC<LayoutProps> = ({ children, onViewChange, activeView }) => {
  const { user, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const displayName = user?.name ?? user?.email ?? 'User';
  const firstName = (user?.name?.split(' ')?.[0] ?? user?.email ?? 'User').toString();
  const initial = (user?.name?.trim()?.[0] ?? user?.email?.trim()?.[0] ?? 'U').toString().toUpperCase();

  return (
    <div className="flex h-screen bg-[#f1f5f9] font-sans overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${isSidebarOpen ? 'w-72' : 'w-24'} bg-white border-r border-[#e2e8f0] transition-all duration-500 ease-in-out flex flex-col z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]`}
      >
        <div className="h-20 flex items-center justify-between px-8 border-b border-slate-50">
          {isSidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-[10px] shadow-lg shadow-indigo-200">
                RJ
              </div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900">
                RJ<span className="text-indigo-600">Fintech</span>
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 px-4 py-8 space-y-8 overflow-y-auto">
          <div>
            {isSidebarOpen && <p className="px-4 mb-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Navigation</p>}
            <nav className="space-y-2">
              <button
                onClick={() => onViewChange('my-companies')}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${activeView === 'my-companies'
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100'
                    : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
              >
                <div className={`${activeView === 'my-companies' ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'}`}>
                  <Building2 size={22} strokeWidth={2.5} />
                </div>
                {isSidebarOpen && <span className="font-bold text-[15px]">My Company</span>}
              </button>

              <button
                onClick={() => onViewChange('all-companies')}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${activeView === 'all-companies'
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100'
                    : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
              >
                <div className={`${activeView === 'all-companies' ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'}`}>
                  <LayoutDashboard size={22} strokeWidth={2.5} />
                </div>
                {isSidebarOpen && <span className="font-bold text-[15px]">All Company</span>}
              </button>

              <button
                onClick={() => onViewChange('users')}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${activeView === 'users'
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100'
                    : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
              >
                <div className={`${activeView === 'users' ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'}`}>
                  <Users size={22} strokeWidth={2.5} />
                </div>
                {isSidebarOpen && <span className="font-bold text-[15px]">Team Members</span>}
              </button>
            </nav>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative h-full overflow-hidden">
        {/* Modern Navbar */}
        <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-white flex items-center justify-between px-10 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-indigo-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-all"
              aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-3 p-1.5 hover:bg-slate-50 rounded-2xl transition-all border border-transparent active:scale-95"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 text-sm font-bold">
                {initial}
              </div>
              <div className="hidden lg:block text-left mr-2">
                <p className="text-xs font-black text-slate-900 leading-tight">{firstName}</p>
                <p className="text-[10px] font-bold text-slate-400 truncate max-w-[180px]">{user?.email}</p>
              </div>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
            </button>

            {isProfileOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsProfileOpen(false)}></div>
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-[2.5rem] shadow-[0_32px_64px_-15px_rgba(0,0,0,0.2)] z-40 border border-slate-100 overflow-hidden">
                  <div className="p-8 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 text-white">
                    <div className="flex items-start justify-between mb-6">
                      <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-2xl font-black shadow-lg">
                        {initial}
                      </div>
                      <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-widest text-indigo-100">
                        Active Session
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <User size={16} className="text-indigo-200" />
                        <p className="font-black text-xl tracking-tight leading-none">{displayName}</p>
                      </div>
                      <div className="flex items-center gap-3 opacity-80">
                        <Bell size={14} className="text-indigo-200" />
                        <p className="text-xs font-medium break-all">{user?.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-white">
                    <div className="p-2 space-y-1">
                      <button className="w-full flex items-center gap-4 px-6 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-2xl transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                          <User size={18} />
                        </div>
                        Profile Settings
                      </button>

                      <button
                        onClick={logout}
                        className="w-full flex items-center gap-4 px-6 py-4 text-sm font-black text-red-600 hover:bg-red-50 rounded-2xl transition-all group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-400 group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
                          <LogOut size={18} />
                        </div>
                        Sign Out Account
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-auto p-10 bg-[#f8fbff]/50">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
