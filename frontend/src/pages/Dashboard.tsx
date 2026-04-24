import React, { useState, useEffect } from 'react';
import { RefreshCcw } from 'lucide-react';
import api from '../api/client';
import DashboardLayout from '../components/DashboardLayout';
import toast from 'react-hot-toast';
import MyCompaniesView from '../components/MyCompaniesView';
import AllCompaniesView from '../components/AllCompaniesView';
import UsersListView from '../components/UsersListView';
import type { Company, GroupCompany } from '../types/company';

const Dashboard = () => {
  // ─── State ──────────────────────────────────────────────────────────────────
  // Logic: activeView determines which subset of data to load and display
  const [activeView, setActiveView] = useState<'my-companies' | 'all-companies' | 'users'>('my-companies');
  const [myCompanies, setMyCompanies] = useState<Company[]>([]);
  const [allGroups, setAllGroups] = useState<GroupCompany[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ─── Data Fetching ─────────────────────────────────────────────────────────

  /**
   * FETCH MY COMPANIES LOGIC:
   * Logic:
   * 1. TRIGGER: Called on mount or when switching to 'my-companies' tab.
   * 2. API GET: Fetch personal mappings from /company/my-companies.
   * 3. STATE UPDATE: Populate the local array with the returned JSON list.
   */
  const fetchMyCompanies = async () => {
    setIsLoading(true);
    try {
      // Logic: Request data from the protected user mapping endpoint
      const response = await api.post('/company/my-companies');
      setMyCompanies(response.data);
    } catch (error: any) {
      toast.error('Failed to resolve mappings');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * FETCH ALL GROUPS LOGIC:
   * Logic:
   * 1. TRIGGER: Called when switching to 'all-companies' tab.
   * 2. API GET: Fetch the entire hierarchical structure from /company/groups.
   * 3. STATE UPDATE: Store the nested group list in allGroups state.
   */
  const fetchAllGroups = async () => {
    setIsLoading(true);
    try {
      // Logic: Request the organizational cluster data
      const response = await api.post('/company/groups');
      setAllGroups(response.data);
    } catch (error: any) {
      toast.error('Failed to sync directory');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Effects ───────────────────────────────────────────────────────────────

  /**
   * REACTIVE DATA ORCHESTRATION:
   * Logic: This side effect ensures that whenever 'activeView' changes, 
   *        the correct data fetching function is automatically executed.
   */
  useEffect(() => {
    if (activeView === 'my-companies') {
      fetchMyCompanies();
    } else {
      fetchAllGroups();
    }
  }, [activeView]); // Logic: dependency array ensures re-run on tab swap

  /**
   * REFRESH ACTION LOGIC:
   * Logic: Re-executes the current view's fetch logic to pull live data from DB.
   */
  const handleRefresh = () => {
    if (activeView === 'my-companies') fetchMyCompanies();
    else if (activeView === 'all-companies') fetchAllGroups();
  };

  return (
    <DashboardLayout activeView={activeView} onViewChange={setActiveView}>
      <div className="space-y-12">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-10 h-1 bg-indigo-600 rounded-full"></span>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Workspace Overview</p>
            </div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-none mb-3">
              {activeView === 'my-companies' ? 'My Companies' : activeView === 'all-companies' ? 'All Companies' : 'Team Members'}<br />
            </h1>

          </div>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-3 px-8 py-5 bg-white border border-slate-200 rounded-3xl font-black text-slate-800 hover:bg-slate-50 transition-all hover:shadow-xl hover:shadow-slate-100 active:scale-95"
          >
            <RefreshCcw size={18} className={isLoading ? 'animate-spin text-indigo-600' : ''} />
            Refresh Data
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40 bg-white rounded-[3rem] border border-white shadow-[0_32px_64px_-15px_rgba(0,0,0,0.05)]">
            <div className="w-24 h-24 relative mb-8">
              <div className="absolute inset-0 border-[10px] border-slate-50 rounded-full"></div>
              <div className="absolute inset-0 border-[10px] border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Syncing Database</h3>
            <p className="text-slate-400 font-bold mt-2">Pulling latest enterprise relations...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-10">
            {activeView === 'my-companies' && <MyCompaniesView myCompanies={myCompanies} />}
            {activeView === 'all-companies' && <AllCompaniesView allGroups={allGroups} />}
            {activeView === 'users' && <UsersListView />}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
