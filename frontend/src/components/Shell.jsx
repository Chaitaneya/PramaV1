import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import NewCaseModal from './NewCaseModal';

export default function Shell({ children, updateTrigger }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stats, setStats] = useState({ collecting: 0, review: 0, completed: 0 });
  const location = useLocation();
  const isInsideCase = location.pathname.includes('/case/');

  useEffect(() => {
    axios.get('http://localhost:5000/api/cases/stats').then(res => setStats(res.data)).catch(console.error);
  }, [location.pathname, updateTrigger]); // refetch on navigation or exact trigger
  
  return (
    <div className="bg-cream font-sans text-slate h-screen flex flex-col overflow-hidden">
      {/* Top Navbar */}
      <div className="px-6 md:px-10 py-3 border-b border-border bg-card-bg flex items-center justify-between shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-10">
          <div className="flex items-center">
            <img src="/assests/logogo.png" alt="Prama Logo" className="h-[46px] w-auto object-contain drop-shadow-sm transition-transform hover:scale-[1.02]" />
          </div>
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className={`text-sm px-3 py-1.5 rounded-md ${location.pathname === '/' ? 'text-primary-dark bg-primary-light font-bold shadow-sm' : 'text-muted font-medium hover:bg-gray-50'}`}>Dashboard</Link>
            <Link to="/cases" className={`text-sm px-3 py-1.5 rounded-md ${location.pathname === '/cases' ? 'text-primary-dark bg-primary-light font-bold shadow-sm' : 'text-muted font-medium hover:bg-gray-50'}`}>Cases</Link>
            <Link to="/affidavits" className={`text-sm px-3 py-1.5 rounded-md ${location.pathname === '/affidavits' ? 'text-primary-dark bg-primary-light font-bold shadow-sm' : 'text-muted font-medium hover:bg-gray-50'}`}>Affidavits</Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {!isInsideCase && (
            <div className="flex items-center gap-4 text-center bg-gray-50 px-5 py-2 rounded-xl border border-border shadow-inner">
               <div className="flex flex-col items-center">
                 <span className="text-[10px] text-primary-dark tracking-widest uppercase font-bold">Active Cases</span>
                 <span className="text-xl font-serif text-slate font-bold leading-none">{stats.collecting}</span>
               </div>
               <div className="w-px h-8 bg-border"></div>
               <div className="flex flex-col items-center">
                 <span className="text-[10px] text-muted tracking-widest uppercase font-bold">Pending Review</span>
                 <span className="text-xl font-serif text-slate font-bold leading-none">{stats.review}</span>
               </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-cream">
          {children}
        </div>
        
        {/* Static Firm Footer */}
        {!isInsideCase && (
          <footer className="py-5 bg-charcoal text-[#94A3B8] shrink-0 flex flex-col md:flex-row items-center justify-between z-20 px-6 md:px-10 text-[12px] font-medium border-t-[3px] border-primary shadow-[0_-4px_15px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-6">
              <div className="text-white font-bold uppercase tracking-widest text-[11px]">Prama</div>
              <div className="w-1.5 h-1.5 rounded-full bg-slate"></div>
              <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">📍 New Delhi</div>
              <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">📞 +0141 244127</div>
            </div>
            <div className="mt-3 md:mt-0 flex items-center gap-2">
              <span>Secure Access Portal:</span>
              <span className="text-white font-bold tracking-wide hover:text-primary-light transition-colors cursor-pointer">www.prama.info.co</span>
            </div>
          </footer>
        )}
      </div>

      {/* Floating Action Button */}
      {!isInsideCase && (
        <button 
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-12 right-12 w-20 h-20 bg-primary text-white rounded-full shadow-[0_10px_40px_rgba(29,78,216,0.3)] flex items-center justify-center hover:bg-primary-dark transition-all transform hover:scale-110 z-50 text-6xl pb-2 font-light"
          title="Create New Case Workspace"
        >
          +
        </button>
      )}

      {/* Intake Modal */}
      <NewCaseModal 
        isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
