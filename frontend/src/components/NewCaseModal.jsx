import React, { useState } from 'react';
import apiClient from '../api';
import { X } from 'lucide-react';
import { useLanguage } from '../i18n';

export default function NewCaseModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    caseId: '',
    clientName: '',
    hearingDate: '',
    knownWindow: '',
    anchorDays: '',
    environmentalContext: '',
    medicalHistory: '',
    digitalFootprint: '',
    priorReports: ''
  });

  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/api/cases', {
        caseId: formData.caseId,
        clientName: formData.clientName,
        hearingDate: formData.hearingDate,
        baseLayer: {
          knownWindow: formData.knownWindow,
          anchorDays: formData.anchorDays,
          environmentalContext: formData.environmentalContext,
          medicalHistory: formData.medicalHistory,
          digitalFootprint: formData.digitalFootprint,
          priorReports: formData.priorReports
        }
      });
      window.location.reload();
    } catch(err) {
      alert("Error: " + (err.response?.data?.error || err.message));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay Background */}
      <div className="absolute inset-0 bg-[#2C2B2A]/40 backdrop-blur-sm cursor-pointer" onClick={onClose}></div>
      
      {/* Sliding Drawer Container */}
      <div 
        role="dialog" aria-modal="true" aria-label={t('open_new_case', 'Open New Case')}
        className="bg-[#FCFBF9] w-full max-w-[600px] h-full shadow-none relative z-10 flex flex-col border-l border-[#E6E2D8] animate-slide-in-right">
        
        <div className="px-8 py-8 border-b border-[#E6E2D8] flex items-center justify-between bg-[#FCFBF9]">
          <h2 className="font-serif text-[26px] font-bold text-[#2C2B2A] tracking-tight">{t('open_new_case', 'Open New Case')}</h2>
          <button type="button" onClick={onClose} aria-label={t('cancel_btn', 'Cancel')} className="p-2 text-[#847E76] hover:text-[#2C2B2A] hover:bg-[#F9F8F6] rounded-xl transition-colors"><X size={20}/></button>
        </div>
        
        <div className="px-8 py-8 overflow-y-auto flex-1 custom-scrollbar">
          <form id="new-case-form" onSubmit={handleSubmit} className="space-y-8">
            
            <div className="grid grid-cols-2 gap-5">
               <div>
                 <label className="block text-[11px] font-semibold text-[#847E76] uppercase tracking-wide mb-2">{t('case_id_label', 'Case ID *')}</label>
                 <input required type="text" placeholder={t('case_id_placeholder', 'e.g. CASE-2024-114')} className="w-full bg-[#F0EEE9] text-[#2C2B2A] placeholder-[#847E76]/50 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-[#7A8B7D] outline-none border-none transition-all" 
                   value={formData.caseId} onChange={e=>setFormData({...formData, caseId: e.target.value})} />
               </div>
               <div>
                 <label className="block text-[11px] font-semibold text-[#847E76] uppercase tracking-wide mb-2">{t('client_name_label', 'Client Name *')}</label>
                 <input required type="text" placeholder={t('client_name_placeholder', 'Full Name')} className="w-full bg-[#F0EEE9] text-[#2C2B2A] placeholder-[#847E76]/50 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-[#7A8B7D] outline-none border-none transition-all" 
                   value={formData.clientName} onChange={e=>setFormData({...formData, clientName: e.target.value})} />
               </div>
            </div>

            <div>
               <label className="block text-[11px] font-semibold text-[#847E76] uppercase tracking-wide mb-2">{t('hearing_date_label', 'Upcoming Hearing Date')}</label>
               <input type="date" className="w-full md:w-1/2 bg-[#F0EEE9] text-[#2C2B2A] placeholder-[#847E76]/50 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-[#7A8B7D] outline-none border-none transition-all" 
                 min={new Date().toISOString().split('T')[0]}
                 value={formData.hearingDate} onChange={e=>setFormData({...formData, hearingDate: e.target.value})} />
            </div>

            <div className="h-px bg-[#E6E2D8] my-4"></div>
            <h3 className="text-sm font-semibold text-[#2C2B2A] mb-4">{t('skeleton_title', 'Case Skeleton Constraints')}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[11px] font-semibold text-[#847E76] uppercase tracking-wide mb-2">{t('known_window_label', '1. Known Window')}</label>
                <input type="text" placeholder={t('known_window_ph', 'e.g. March 14 - March 22')} className="w-full bg-[#F0EEE9] text-[#2C2B2A] placeholder-[#847E76]/50 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-[#7A8B7D] outline-none border-none transition-all" 
                  value={formData.knownWindow} onChange={e=>setFormData({...formData, knownWindow: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#847E76] uppercase tracking-wide mb-2">{t('anchor_days_label', '2. Anchor Days')}</label>
                <input type="text" placeholder={t('anchor_days_ph', 'Birthdays, Anniversaries, Holidays')} className="w-full bg-[#F0EEE9] text-[#2C2B2A] placeholder-[#847E76]/50 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-[#7A8B7D] outline-none border-none transition-all" 
                  value={formData.anchorDays} onChange={e=>setFormData({...formData, anchorDays: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#847E76] uppercase tracking-wide mb-2">{t('env_context_label', '3. Environmental Context')}</label>
                <input type="text" placeholder={t('env_context_ph', 'General locations, living situation')} className="w-full bg-[#F0EEE9] text-[#2C2B2A] placeholder-[#847E76]/50 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-[#7A8B7D] outline-none border-none transition-all" 
                  value={formData.environmentalContext} onChange={e=>setFormData({...formData, environmentalContext: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#847E76] uppercase tracking-wide mb-2">{t('medical_history_label', '4. Medical History')}</label>
                <input type="text" placeholder={t('medical_history_ph', 'Relevant physical/mental records')} className="w-full bg-[#F0EEE9] text-[#2C2B2A] placeholder-[#847E76]/50 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-[#7A8B7D] outline-none border-none transition-all" 
                  value={formData.medicalHistory} onChange={e=>setFormData({...formData, medicalHistory: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#847E76] uppercase tracking-wide mb-2">{t('digital_footprint_label', '5. Digital Footprint')}</label>
                <input type="text" placeholder={t('digital_footprint_ph', 'Emails, texts, shared accounts')} className="w-full bg-[#F0EEE9] text-[#2C2B2A] placeholder-[#847E76]/50 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-[#7A8B7D] outline-none border-none transition-all" 
                  value={formData.digitalFootprint} onChange={e=>setFormData({...formData, digitalFootprint: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#847E76] uppercase tracking-wide mb-2">{t('prior_reports_label', 'Prior Reports')}</label>
                <input type="text" placeholder={t('prior_reports_ph', 'Police, HR, or Community reports')} className="w-full bg-[#F0EEE9] text-[#2C2B2A] placeholder-[#847E76]/50 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-[#7A8B7D] outline-none border-none transition-all" 
                  value={formData.priorReports} onChange={e=>setFormData({...formData, priorReports: e.target.value})} />
              </div>
            </div>
          </form>
        </div>

        <div className="px-8 py-6 border-t border-[#E6E2D8] bg-[#FCFBF9] flex justify-end gap-4 shadow-none relative z-20">
          <button type="button" onClick={onClose} className="px-6 py-2.5 text-[13px] font-semibold text-[#847E76] hover:bg-[#F0EEE9] rounded-xl transition-colors">{t('cancel_btn', 'Cancel')}</button>
          <button form="new-case-form" type="submit" disabled={loading} className="px-8 py-2.5 text-[13px] font-bold text-[#FCFBF9] bg-[#7A8B7D] hover:bg-[#68776B] rounded-xl transition-all disabled:opacity-50 tracking-wide">
            {loading ? t('compiling', 'Compiling Parameters...') : t('init_workspace', 'Initialize Case Workspace')}
          </button>
        </div>
      </div>
    </div>
  );
}
