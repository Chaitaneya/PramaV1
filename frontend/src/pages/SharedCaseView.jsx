import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api';
import { ShieldCheck, Calendar, MapPin, Eye, Ear, Wind, Activity, FileText, Send, CheckCircle, Clock, User, Clipboard, Paperclip } from 'lucide-react';
import { useLanguage } from '../i18n';

const TAGS = [
  { name: 'General',   icon: <FileText size={16} strokeWidth={1.5}/>  },
  { name: 'Visual',    icon: <Eye size={16} strokeWidth={1.5}/>       },
  { name: 'Auditory',  icon: <Ear size={16} strokeWidth={1.5}/>       },
  { name: 'Olfactory', icon: <Wind size={16} strokeWidth={1.5}/>      },
  { name: 'Somatic',   icon: <Activity size={16} strokeWidth={1.5}/>  },
];

export default function SharedCaseView() {
  const { token } = useParams();
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [collabForm, setCollabForm] = useState({ content: '', sensoryTag: 'General' });

  const load = useCallback(() => {
    apiClient.get(`/api/share/${token}`)
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center font-sans text-slate">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"/>
        <p className="text-sm font-medium">{t('shared_loading', 'Verifying access…')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6 font-sans text-slate">
        <div className="max-w-md bg-white border border-red-200 rounded-2xl p-8 shadow-sm text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate mb-2">Access Denied</h2>
          <p className="text-sm text-muted leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream font-sans text-slate flex flex-col h-screen overflow-hidden">
      {/* Premium Header */}
      <div className="bg-charcoal text-white px-6 py-3 flex items-center justify-between shadow-md z-50 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-amber-400" />
            <span className="font-bold tracking-wider text-[11px] uppercase text-amber-400">
               {data.recipientRole === 'Client' ? 'SECURE CLIENT PORTAL' : 'SHARED CASE VIEW — READ ONLY'}
            </span>
          </div>
          <div className="h-4 w-px bg-white/20 hidden md:block" />
          <div className="hidden md:flex items-center gap-2 text-[10px] text-slate-300 uppercase tracking-widest font-semibold">
            <Clock size={12} /> {t('expires_label', 'Expires')}: {new Date(data.expiresAt).toLocaleDateString()}
          </div>
        </div>
        <div className="text-[11px] font-mono font-bold tracking-tighter">PRᥲMA</div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: Case Context (Left) */}
        <div className="w-[260px] border-r border-border bg-card-bg p-6 flex flex-col hidden lg:flex shrink-0 overflow-y-auto">
          <div className="text-[10px] tracking-widest text-muted uppercase font-bold mb-6 flex items-center gap-2">
             <Clipboard size={12} /> {t('case_context', 'Case Context')}
          </div>
          
          <div className="mb-6">
            <div className="text-[10px] text-muted uppercase tracking-wide mb-1.5 font-bold">{t('client_label', 'Client')}</div>
            <div className="text-[18px] text-charcoal font-bold font-serif leading-tight">{data.clientName}</div>
          </div>

          <div className="mb-6">
            <div className="text-[10px] text-muted uppercase tracking-wide mb-1.5 font-bold">Case Reference</div>
            <div className="text-[13px] font-mono text-slate bg-white px-2 py-1 rounded border border-border inline-block">
              {data.caseId}
            </div>
          </div>

          {data.hearingDate && (
            <div className="mb-6">
              <div className="text-[10px] text-muted uppercase tracking-wide mb-1.5 font-bold">{t('upcoming_hearing', 'Upcoming Hearing')}</div>
              <div className="flex items-center gap-2 text-sm text-slate font-medium">
                 <Calendar size={14} className="text-primary" /> {new Date(data.hearingDate).toLocaleDateString()}
              </div>
            </div>
          )}

          <div className="h-px bg-border/60 my-4"/>

          {/* Skeleton info (Base Layer) */}
          <div className="space-y-4">
            {[
              [t('known_window', 'Known Window'),   data.baseLayer?.knownWindow],
              [t('anchor_days', 'Anchor Days'),    data.baseLayer?.anchorDays],
              [t('env_context', 'Env. Context'),   data.baseLayer?.environmentalContext],
              [t('medical_hx', 'Medical Hx'),     data.baseLayer?.medicalHistory],
            ].filter(([, v]) => v).map(([label, val]) => (
              <div key={label}>
                <div className="text-[10px] text-muted uppercase tracking-wide mb-1.5 font-bold">{label}</div>
                <div className="text-[12px] text-slate leading-relaxed bg-white border border-border/40 p-2.5 rounded-lg">
                  {val}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-6">
             <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                  <User size={12}/> {t('shared_by', 'Shared by')}
                </p>
                <p className="text-[12px] text-indigo-900 font-medium">{data.sharedBy}</p>
             </div>
          </div>
        </div>

        {/* Main Feed (Center) */}
        <div className="flex-1 flex flex-col bg-cream min-w-0">
          <div className="flex-1 p-6 md:p-8 overflow-y-auto flex flex-col gap-6 max-w-3xl mx-auto w-full">
            
            <div className="mb-2">
              <h2 className="text-2xl font-bold font-serif text-charcoal flex items-center gap-3">
                {t('memory_deposits', 'Memory Deposits')}
                <span className="text-sm font-sans font-bold bg-white px-3 py-1 rounded-full border border-border text-muted">
                  {data.depositCount}
                </span>
              </h2>
              <p className="text-sm text-muted mt-2">Historical record of all deposited memories for this matter.</p>
            </div>

            {/* Deposits List */}
            {data.deposits && data.deposits.length > 0 ? (
              <div className="space-y-4">
                {data.deposits.map(d => {
                  const tagIcon = TAGS.find(t => t.name === d.tag)?.icon || <FileText size={16}/>;
                  return (
                    <div key={d.id} className="bg-white border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-50 border border-border flex items-center justify-center text-slate">
                            {tagIcon}
                          </div>
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-widest text-slate">{d.tag}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                               <span className={`text-[10px] font-bold px-1.5 py-px rounded uppercase ${d.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                 {d.status || 'approved'}
                               </span>
                               <span className="text-[10px] text-muted">Session {d.session}</span>
                            </div>
                          </div>
                        </div>
                        {d.timestamp && (
                          <span className="font-mono text-[10px] text-muted">{new Date(d.timestamp).toLocaleString()}</span>
                        )}
                      </div>
                      
                      <p className="text-[15px] text-slate leading-relaxed font-medium pl-1">"{d.text}"</p>

                      {data.permissions.media && d.attachments?.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {d.attachments.map((a, i) => (
                            <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="overflow-hidden rounded-xl border border-border block hover:opacity-90 transition-opacity">
                              {a.mimeType?.startsWith('image/') 
                                ? <img src={a.url} alt="attachment" className="h-16 w-auto object-cover"/>
                                : <div className="h-16 px-4 bg-gray-50 flex items-center justify-center text-[10px] font-bold text-blue-600 uppercase tracking-tight">View File</div>
                              }
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 bg-white/50 border-2 border-dashed border-border rounded-2xl">
                <p className="text-muted text-sm">{t('no_memories', 'No memories recorded yet.')}</p>
              </div>
            )}

            <div className="h-8 shrink-0" />
          </div>

          {/* Collaboration Input Area (Bottom) */}
          {data.permissions.canAddDeposits && (
            <div className="bg-card-bg border-t border-border p-6 mt-auto">
              <div className="max-w-3xl mx-auto">
                {success ? (
                  <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 text-center animate-in fade-in zoom-in duration-300">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                        <CheckCircle size={20} />
                      </div>
                      <h3 className="text-lg font-bold text-green-900">{t('collab_success', 'Memory submitted successfully!')}</h3>
                    </div>
                    <p className="text-sm text-green-700/80 mb-4">Your memory has been sent to your lawyer for review and will be added to the official timeline once approved.</p>
                    <button 
                      onClick={() => { setSuccess(false); setCollabForm({ content: '', sensoryTag: 'General' }); }}
                      className="px-8 py-2.5 bg-green-600 text-white rounded-xl font-bold text-[12px] uppercase tracking-wider shadow-sm hover:bg-green-700 transition-all active:scale-95"
                    >
                      Add Another Detail
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Sensory Tag Bar */}
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="text-[10px] font-bold text-muted uppercase tracking-widest self-center mr-2">Type :</span>
                      {TAGS.map(tData => (
                        <button 
                          key={tData.name} 
                          onClick={() => setCollabForm({ ...collabForm, sensoryTag: tData.name })}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${
                            collabForm.sensoryTag === tData.name
                              ? 'bg-slate text-white border-slate'
                              : 'bg-white text-muted border-border hover:border-slate/30'
                          }`}
                        >
                          {tData.icon} {t(`tag_${tData.name.toLowerCase()}`, tData.name)}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-1 relative">
                        <textarea 
                          rows={2}
                          className="w-full bg-cream border-2 border-border/40 rounded-2xl p-4 text-[14px] leading-relaxed focus:ring-2 focus:ring-primary/20 focus:border-primary/40 outline-none transition-all placeholder:text-muted/60"
                          placeholder={t('collab_placeholder', 'Add any additional details or memories here...')}
                          value={collabForm.content}
                          onChange={(e) => setCollabForm({ ...collabForm, content: e.target.value })}
                        />
                        <div className="absolute right-3 bottom-3 flex items-center gap-1 opacity-40 hover:opacity-100 transition-opacity">
                           <Paperclip size={14} className="text-muted" />
                        </div>
                      </div>
                      
                      <button 
                        disabled={!collabForm.content || submitting}
                        onClick={async () => {
                          setSubmitting(true);
                          try {
                            await apiClient.post(`/api/share/${token}/collab/deposit`, collabForm);
                            setSuccess(true);
                            load();
                          } catch (err) {
                            alert('Submission failed: ' + (err.response?.data?.error || err.message));
                          } finally {
                            setSubmitting(false);
                          }
                        }}
                        className={`px-8 py-3 rounded-2xl font-bold text-[12px] uppercase tracking-widest text-white shadow-lg transition-all self-center ${!collabForm.content || submitting ? 'bg-gray-400 cursor-not-allowed mx-auto' : 'bg-primary hover:bg-primary/90 active:scale-95'}`}
                      >
                        {submitting ? 'Submitting...' : <><Send size={16} className="inline-block mr-2 -mt-0.5"/> {t('collab_save', 'Submit')}</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
