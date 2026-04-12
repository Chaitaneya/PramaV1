import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, Clock, AlertCircle, MessageSquare } from 'lucide-react';
import apiClient from '../api';
import { useLanguage } from '../i18n';

export default function ReviewPanel({ isOpen, onClose, caseId, onUpdate }) {
  const { t } = useLanguage();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && caseId) {
      fetchPending();
    }
  }, [isOpen, caseId]);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/cases/${encodeURIComponent(caseId)}/pending-deposits`);
      setPending(res.data);
    } catch (err) {
      console.error('Failed to fetch pending deposits:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (depositId, status) => {
    try {
      await apiClient.put(`/api/cases/${encodeURIComponent(caseId)}/deposits/${depositId}/status`, { status });
      setPending(pending.filter(p => p._id !== depositId));
      if (onUpdate) onUpdate();
    } catch (err) {
      alert('Action failed: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm cursor-pointer" onClick={onClose} />
      <div className="bg-cream w-full max-w-[500px] h-full shadow-2xl relative z-10 flex flex-col border-l border-primary/20 animate-slide-in-right">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-border bg-card-bg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <Clipboard size={22} />
              </div>
              <div>
                <h2 className="font-serif text-[22px] font-bold text-slate tracking-tight">Review Contributions</h2>
                <p className="text-[12px] text-muted mt-0.5">Memories submitted by clients through collaboration links.</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-muted hover:text-slate hover:bg-gray-100 rounded-xl transition-colors"><X size={22}/></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          {loading ? (
             <div className="flex items-center justify-center py-20">
               <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
             </div>
          ) : pending.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 border-2 border-dashed border-border rounded-2xl">
              <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Check size={24} />
              </div>
              <p className="text-slate font-bold text-sm">All caught up!</p>
              <p className="text-muted text-[12px] mt-1">No pending client contributions to review.</p>
            </div>
          ) : (
            <div className="space-y-4">
               <p className="text-[11px] font-bold text-muted uppercase tracking-widest mb-4">Pending Review ({pending.length})</p>
               {pending.map(item => (
                 <div key={item._id} className="bg-white border-2 border-amber-100 rounded-2xl p-5 shadow-sm hover:border-amber-200 transition-all">
                    <div className="flex items-center justify-between mb-3">
                       <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                         {item.sensoryTag}
                       </span>
                       <span className="flex items-center gap-1 text-[10px] text-muted">
                         <Clock size={10} /> {new Date(item.addedAt).toLocaleString()}
                       </span>
                    </div>
                    
                    <div className="bg-cream/50 rounded-xl p-4 border border-border/40 mb-4 overflow-hidden">
                       <p className="text-[14px] text-slate leading-relaxed italic break-all">"{item.content}"</p>
                    </div>

                    <div className="flex gap-2">
                       <button 
                         onClick={() => handleAction(item._id, 'approved')}
                         className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl py-2.5 text-[12px] font-bold uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-sm active:scale-95"
                       >
                         <Check size={16} /> Add to Case
                       </button>
                       <button 
                         onClick={() => handleAction(item._id, 'rejected')}
                         className="flex items-center justify-center gap-2 border-2 border-red-100 text-red-600 rounded-xl px-4 py-2.5 text-[12px] font-bold uppercase tracking-wider hover:bg-red-50 transition-all"
                       >
                         <Trash2 size={16} />
                       </button>
                    </div>
                 </div>
               ))}
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3">
             <AlertCircle size={20} className="text-blue-500 shrink-0 mt-0.5" />
             <div>
                <p className="text-[12px] font-bold text-blue-900 mb-0.5">Lawyer's Prerogative</p>
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  Only approved memories will be processed by the Prama AI and included in the synthesized case chronology.
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper to avoid import error in this block
function Clipboard({ size }) {
  return <MessageSquare size={size} />;
}
