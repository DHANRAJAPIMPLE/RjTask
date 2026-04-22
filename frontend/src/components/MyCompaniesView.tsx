import React from 'react';
import { ArrowUpRight, Building2 } from 'lucide-react';
import type { Company } from '../types/company';

interface MyCompaniesViewProps {
  myCompanies: Company[];
}

const MyCompaniesView: React.FC<MyCompaniesViewProps> = ({ myCompanies }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {myCompanies.length > 0 ? (
        myCompanies.map((company, index) => (
          <div
            key={index}
            className="group relative bg-white p-6 rounded-[2rem] border border-[#e2e8f0] hover:border-indigo-600/20 hover:shadow-[0_32px_64px_-15px_rgba(99,102,241,0.15)] transition-all duration-500 cursor-pointer overflow-hidden"
          >
            {/* Decorative Gradient Blob */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-50 rounded-full blur-3xl group-hover:bg-indigo-100 transition-colors"></div>

            <div className="relative z-10">
              <section className="flex items-start justify-between mb-5">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
                  <Building2 size={24} />
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  <ArrowUpRight size={18} />
                </div>
              </section>

              <h4 className="text-xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors">
                {company.brand_name}
              </h4>
            </div>
          </div>
        ))
      ) : (
        <div className="col-span-full p-20 bg-white rounded-[4rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-slate-50 text-slate-200 rounded-[2rem] flex items-center justify-center mb-8">
            <Building2 size={48} />
          </div>
          <h3 className="text-3xl font-black text-slate-900 tracking-tight">Cloud Empty</h3>
          <p className="text-slate-400 font-bold mt-3 max-w-sm">
            We couldn't find any enterprise mappings associated with your identity ID.
          </p>
        </div>
      )}
    </div>
  );
};

export default MyCompaniesView;
