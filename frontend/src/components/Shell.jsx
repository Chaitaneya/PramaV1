import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import apiClient from '../api';
import NewCaseModal from './NewCaseModal';
import { useLanguage } from '../i18n';

export default function Shell({ children, updateTrigger }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stats, setStats] = useState({ collecting: 0, review: 0, completed: 0 });
  const location = useLocation();
  const isInsideCase = location.pathname.includes('/case/');
  const { lang, setLang, t } = useLanguage();

  useEffect(() => {
    apiClient.get('/api/cases/stats').then(res => setStats(res.data)).catch(console.error);
  }, [location.pathname, updateTrigger]); // refetch on navigation or exact trigger
  
  return (
    <div className="bg-[#F9F8F6] font-sans text-[#2C2B2A] h-screen flex flex-col overflow-hidden">
      {/* Top Navbar */}
      <div className="px-8 md:px-12 py-5 border-b border-[#E6E2D8] bg-[#FCFBF9] flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-12">
          <div className="flex items-center">
            <img src="/assests/logogo.png" alt="Prama Logo" className="h-[40px] w-auto object-contain transition-transform hover:scale-[1.01]" />
          </div>
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className={`text-[14px] px-4 py-2 rounded-xl transition-all ${location.pathname === '/' ? 'text-[#2C2B2A] bg-[#F0EEE9] font-semibold' : 'text-[#847E76] font-medium hover:text-[#2C2B2A] hover:bg-[#F9F8F6]'}`}>{t('nav_dashboard', 'Dashboard')}</Link>
            <Link to="/cases" className={`text-[14px] px-4 py-2 rounded-xl transition-all ${location.pathname === '/cases' ? 'text-[#2C2B2A] bg-[#F0EEE9] font-semibold' : 'text-[#847E76] font-medium hover:text-[#2C2B2A] hover:bg-[#F9F8F6]'}`}>{t('nav_cases', 'Cases')}</Link>
            <Link to="/affidavits" className={`text-[14px] px-4 py-2 rounded-xl transition-all ${location.pathname === '/affidavits' ? 'text-[#2C2B2A] bg-[#F0EEE9] font-semibold' : 'text-[#847E76] font-medium hover:text-[#2C2B2A] hover:bg-[#F9F8F6]'}`}>{t('nav_affidavits', 'Affidavits')}</Link>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
            className="px-3 py-1.5 bg-[#FCFBF9] border border-[#E6E2D8] rounded-xl text-xs text-[#2C2B2A] hover:bg-[#F9F8F6] flex items-center gap-2 transition-colors"
            aria-label={t('nav_switch_lang', 'Toggle Language')}
          >
            <span className={lang === 'en' ? 'font-bold text-[#7A8B7D]' : 'text-[#847E76]'}>EN</span>
            <span className="text-[#E6E2D8]">|</span>
            <span className={lang === 'hi' ? 'font-bold text-[#7A8B7D]' : 'text-[#847E76]'}>हिं</span>
          </button>
          
          {!isInsideCase && (
            <div className="flex items-center gap-5 bg-[#F0EEE9] px-6 py-2.5 rounded-2xl border border-[#E6E2D8] shadow-none">
               <div className="flex flex-col items-center">
                 <span className="text-[9px] text-[#847E76] tracking-wider uppercase font-bold">{t('nav_active_cases', 'Active Cases')}</span>
                 <span className="text-lg font-serif text-[#2C2B2A] font-bold leading-none mt-1">{stats.collecting}</span>
               </div>
               <div className="w-px h-6 bg-[#E6E2D8]"></div>
               <div className="flex flex-col items-center">
                 <span className="text-[9px] text-[#847E76] tracking-wider uppercase font-bold">{t('nav_pending_review', 'Pending Review')}</span>
                 <span className="text-lg font-serif text-[#2C2B2A] font-bold leading-none mt-1">{stats.review}</span>
               </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[#F9F8F6]">
          {children}
        </div>
        
        {/* Static Firm Footer */}
        {!isInsideCase && (
          <footer className="py-5 px-8 md:px-12 border-t border-[#E6E2D8] bg-[#FCFBF9] flex flex-col md:flex-row items-center justify-between text-[11px] text-[#847E76] tracking-wide shrink-0">
            <div className="flex items-center gap-6">
              <div className="text-[#2C2B2A] font-bold uppercase tracking-widest text-[11px]">Prama</div>
              <div className="w-1.5 h-1.5 rounded-full bg-[#E6E2D8]"></div>
              <div className="flex items-center gap-1.5 transition-colors cursor-default">📍 New Delhi</div>
              <div className="flex items-center gap-1.5 transition-colors cursor-default">📞 +0141 277127</div>
            </div>
            <div className="mt-3 md:mt-0 flex items-center gap-2">
              <span>Secure Access Portal:</span>
              <span className="text-[#2C2B2A] font-bold tracking-wide transition-colors cursor-pointer hover:text-[#7A8B7D]">www.prama.info.co</span>
            </div>
          </footer>
        )}
      </div>

      {/* Floating Action Button */}
      {!isInsideCase && (
        <button 
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-10 right-10 w-16 h-16 bg-[#7A8B7D] text-[#FCFBF9] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-center hover:bg-[#68776B] transition-all transform hover:scale-105 active:scale-95 z-50 text-4xl pb-1 font-light border border-[#E6E2D8]/20"
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
