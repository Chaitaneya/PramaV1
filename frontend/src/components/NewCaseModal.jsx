import React, { useState } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';

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

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/cases', {
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
      <div className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm cursor-pointer" onClick={onClose}></div>
      
      {/* Sliding Drawer Container */}
      <div className="bg-cream w-full max-w-[600px] h-full shadow-2xl relative z-10 flex flex-col border-l border-primary/20 animate-slide-in-right">
        
        <div className="px-8 py-6 border-b border-border flex items-center justify-between bg-card-bg">
          <h2 className="font-serif text-[24px] font-bold text-slate tracking-tight">Open New Case</h2>
          <button type="button" onClick={onClose} className="p-2 text-muted hover:text-slate hover:bg-gray-100 rounded-xl transition-colors"><X size={22}/></button>
        </div>
        
        <div className="px-8 py-6 overflow-y-auto flex-1 custom-scrollbar">
          <form id="new-case-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-[11px] font-semibold text-muted uppercase tracking-wide mb-1.5">Case ID *</label>
                 <input required type="text" placeholder="e.g. CASE-2024-114" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" 
                   value={formData.caseId} onChange={e=>setFormData({...formData, caseId: e.target.value})} />
               </div>
               <div>
                 <label className="block text-[11px] font-semibold text-muted uppercase tracking-wide mb-1.5">Client Name *</label>
                 <input required type="text" placeholder="Full Name" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" 
                   value={formData.clientName} onChange={e=>setFormData({...formData, clientName: e.target.value})} />
               </div>
            </div>

            <div className="mt-4">
               <label className="block text-[11px] font-semibold text-muted uppercase tracking-wide mb-1.5">Upcoming Hearing Date</label>
               <input type="date" className="w-full md:w-1/2 border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" 
                 min={new Date().toISOString().split('T')[0]}
                 value={formData.hearingDate} onChange={e=>setFormData({...formData, hearingDate: e.target.value})} />
            </div>

            <div className="h-px bg-border my-2"></div>
            <h3 className="text-sm font-medium text-slate mb-3">Case Skeleton Constraints</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wide mb-1.5">1. Known Window</label>
                <input type="text" placeholder="e.g. March 14 - March 22" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" 
                  value={formData.knownWindow} onChange={e=>setFormData({...formData, knownWindow: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wide mb-1.5">2. Anchor Days</label>
                <input type="text" placeholder="Birthdays, Anniversaries, Holidays" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" 
                  value={formData.anchorDays} onChange={e=>setFormData({...formData, anchorDays: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wide mb-1.5">3. Environmental Context</label>
                <input type="text" placeholder="General locations, living situation" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" 
                  value={formData.environmentalContext} onChange={e=>setFormData({...formData, environmentalContext: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wide mb-1.5">4. Medical History</label>
                <input type="text" placeholder="Relevant physical/mental records" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" 
                  value={formData.medicalHistory} onChange={e=>setFormData({...formData, medicalHistory: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wide mb-1.5">5. Digital Footprint</label>
                <input type="text" placeholder="Emails, texts, shared accounts" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" 
                  value={formData.digitalFootprint} onChange={e=>setFormData({...formData, digitalFootprint: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wide mb-1.5">Prior Reports</label>
                <input type="text" placeholder="Police, HR, or Community reports" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" 
                  value={formData.priorReports} onChange={e=>setFormData({...formData, priorReports: e.target.value})} />
             </div>
            </div>
          </form>
        </div>

        <div className="px-8 py-6 border-t border-border bg-card-bg flex justify-end gap-4 shadow-[0_-10px_30px_rgba(0,0,0,0.02)] relative z-20">
          <button type="button" onClick={onClose} className="px-6 py-2.5 text-[13px] font-semibold text-slate hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
          <button form="new-case-form" type="submit" disabled={loading} className="px-8 py-2.5 text-[13px] font-bold text-white bg-primary hover:bg-primary-dark shadow-[0_5px_15px_rgba(29,78,216,0.25)] rounded-xl transition-all transform hover:-translate-y-0.5 disabled:opacity-50 tracking-wide">
            {loading ? 'Compiling Parameters...' : 'Initialize Case Workspace'}
          </button>
        </div>
      </div>
    </div>
  );
}
