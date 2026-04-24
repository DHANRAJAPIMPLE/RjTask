import React, { useState, useEffect } from 'react';
import { UserCheck, UserX, Mail, Phone, Calendar, Building, User as UserIcon, BadgeInfo } from 'lucide-react';
import api from '../api/client';
import toast from 'react-hot-toast';

interface UserData {
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  companyName: string;
  reportingManager: string;
  designation: string;
  employeeId: string;
}

interface FetchAllResponse {
  active: UserData[];
  inactive: UserData[];
}

const UsersListView = () => {
  const [data, setData] = useState<FetchAllResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.post('/users/fetch-all-users');
      setData(response.data);
    } catch (error) {
      toast.error('Failed to fetch users list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold tracking-tight">Loading Directory...</p>
      </div>
    );
  }

  const users = activeTab === 'active' ? data?.active : data?.inactive;

  return (
    <div className="space-y-8">
      {/* Status Toggle */}
      <div className="flex p-1.5 bg-slate-100 rounded-[2rem] w-fit">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-3 px-8 py-3.5 rounded-[1.7rem] font-black text-sm transition-all ${
            activeTab === 'active' 
            ? 'bg-white text-indigo-600 shadow-xl shadow-indigo-100' 
            : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <UserCheck size={18} />
          Active Members ({data?.active.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('inactive')}
          className={`flex items-center gap-3 px-8 py-3.5 rounded-[1.7rem] font-black text-sm transition-all ${
            activeTab === 'inactive' 
            ? 'bg-white text-rose-600 shadow-xl shadow-rose-100' 
            : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <UserX size={18} />
          Inactive ({data?.inactive.length || 0})
        </button>
      </div>

      {/* Users Grid */}
      {users && users.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {users.map((user, idx) => (
            <div 
              key={idx}
              className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.03)] hover:shadow-[0_32px_64px_-15px_rgba(0,0,0,0.08)] transition-all duration-500 group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8">
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  activeTab === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {activeTab}
                </span>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-16">
                {/* Profile Section */}
                <div className="flex items-center gap-6 min-w-[300px]">
                  <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-white text-2xl font-black shadow-lg ${
                    activeTab === 'active' ? 'bg-gradient-to-tr from-indigo-600 to-violet-600' : 'bg-slate-400'
                  }`}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight mb-1 group-hover:text-indigo-600 transition-colors">
                      {user.name}
                    </h3>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                      {user.designation} • {user.employeeId}
                    </p>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-slate-500 group/item">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover/item:bg-indigo-50 group-hover/item:text-indigo-600 transition-all">
                        <Mail size={14} />
                      </div>
                      <span className="text-sm font-bold truncate max-w-[200px]">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500 group/item">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover/item:bg-indigo-50 group-hover/item:text-indigo-600 transition-all">
                        <Phone size={14} />
                      </div>
                      <span className="text-sm font-bold">{user.phone}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-slate-500 group/item">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover/item:bg-indigo-50 group-hover/item:text-indigo-600 transition-all">
                        <Building size={14} />
                      </div>
                      <span className="text-sm font-bold">{user.companyName}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500 group/item">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover/item:bg-indigo-50 group-hover/item:text-indigo-600 transition-all">
                        <UserIcon size={14} />
                      </div>
                      <span className="text-sm font-bold italic">Mgr: {user.reportingManager}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-slate-500 group/item">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover/item:bg-indigo-50 group-hover/item:text-indigo-600 transition-all">
                        <Calendar size={14} />
                      </div>
                      <span className="text-sm font-bold">Joined: {user.createdAt}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-32 bg-white rounded-[3rem] border border-slate-100 flex flex-col items-center text-center px-10">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mb-6">
            <BadgeInfo size={40} />
          </div>
          <h4 className="text-2xl font-black text-slate-800 tracking-tight">No {activeTab} users found</h4>
          <p className="text-slate-400 font-bold mt-2 max-w-sm">
            It looks like there aren't any members categorized as {activeTab} at the moment.
          </p>
        </div>
      )}
    </div>
  );
};

export default UsersListView;
