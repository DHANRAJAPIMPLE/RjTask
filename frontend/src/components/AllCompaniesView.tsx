import React from 'react';
import { AlertCircle, Building2, Layers, Users } from 'lucide-react';
import type { GroupCompany } from '../types/company';

interface AllCompaniesViewProps {
  allGroups: GroupCompany[];
}

const AllCompaniesView: React.FC<AllCompaniesViewProps> = ({ allGroups }) => {
  return (
    <div className="space-y-16">
      {allGroups.length > 0 ? (
        allGroups.map((group, groupIdx) => (
          <section key={groupIdx} className="relative group">
            <div className="flex items-center gap-6 mb-10">
              <div className="w-20 h-20 bg-white shadow-2xl shadow-indigo-100 rounded-[2rem] flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform duration-500">
                <Layers size={36} strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                    {group.group_name}
                  </h3>
                </div>
                <p className="text-sm font-bold text-slate-400 flex items-center gap-2">
                  <Users size={14} /> 0{group.companies.length} Linked Entities Accounted
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {group.companies.map((company, index) => (
                <div
                  key={index}
                  className="flex items-center gap-5 p-7 rounded-[2.5rem] bg-white border border-slate-50 hover:border-indigo-100 hover:shadow-2xl hover:shadow-indigo-100/50 transition-all cursor-pointer group/card"
                >
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover/card:bg-indigo-600 group-hover/card:text-white group-hover/card:shadow-lg group-hover/card:shadow-indigo-200 transition-all duration-300">
                    <Building2 size={24} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-800 truncate leading-snug">{company.brand_name}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter opacity-70 group-hover/card:text-indigo-600 transition-colors uppercase">
                      {company.company_code}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      ) : (
        <div className="p-32 bg-white rounded-[4rem] shadow-2xl shadow-slate-100 flex flex-col items-center">
          <AlertCircle size={80} className="text-slate-100 mb-8" />
          <h3 className="text-3xl font-black text-slate-900 tracking-tight">No Cluster Data</h3>
          <p className="text-slate-400 font-bold mt-2">The organizational hierarchy has not been initialized yet.</p>
        </div>
      )}
    </div>
  );
};

export default AllCompaniesView;
