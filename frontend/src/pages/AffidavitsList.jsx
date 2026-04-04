import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api';
import Shell from '../components/Shell';
import { FileText, Download } from 'lucide-react';

export default function AffidavitsList() {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);

  useEffect(() => {
    // Only fetch cases that likely have an affidavit ready
    apiClient.get('/api/cases?status=Synthesized,Finalized')
      .then(res => setCases(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <Shell>
      <div className="flex flex-1 overflow-hidden h-full">
        <div className="flex-1 overflow-y-auto bg-cream relative">
          
          {/* Background Watermark */}
          <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
            <img 
              src="/assests/watermark.png" 
              alt="Watermark" 
              className="w-[800px] md:w-[1000px] h-auto object-contain" 
              style={{ opacity: 0.09 }} 
            />
          </div>

          <div className="max-w-[1600px] mx-auto w-full p-6 md:p-8 relative z-10">
            <div className="flex items-center justify-between mb-8">
              <h1 className="font-serif text-[26px] font-medium text-slate">Verified Affidavits</h1>
            </div>
            <div className="text-[13px] text-muted mb-8 font-medium">Dynamically generated Statements of Fact for finalized cases</div>

            <div className="space-y-4">
              {cases.length === 0 && <div className="text-muted text-center py-20">No synthesized cases available to export.</div>}
              
              {cases.map(c => (
                <div key={c._id} className="bg-card-bg border border-border rounded-xl p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(29,78,216,0.12)] hover:border-primary flex items-center justify-between group relative z-20">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-primary-light text-primary-dark rounded-xl flex items-center justify-center shrink-0">
                      <FileText size={20} />
                    </div>
                    <div>
                      <div className="font-serif text-[20px] font-bold text-charcoal tracking-tight">{c.clientName} — Statement of Facts</div>
                      <div className="text-[12px] text-muted font-medium mt-1 uppercase tracking-widest">{c.caseId} · {c.baseLayer?.jurisdiction}</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => navigate(`/case/${c.caseId}/chronology`)}
                      className="px-4 py-2 border border-border rounded-lg text-sm font-semibold text-slate hover:bg-gray-50 transition-colors"
                    >
                      View Chronology
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
