import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api';
import { ShieldCheck, Calendar, MapPin, Eye, Ear, Wind, Activity, FileText } from 'lucide-react';
import { useLanguage } from '../i18n';

export default function SharedCaseView() {
  const { token } = useParams();
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get(`/api/share/${token}`)
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center font-sans text-slate">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"/>
        <p className="text-sm font-medium">{t('shared_loading', 'Verifying share link…')}</p>
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
    <div className="min-h-screen bg-cream font-sans text-slate">
      {/* Print-friendly banner */}
      <div className="bg-charcoal text-white px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <ShieldCheck size={18} className="text-amber-400" />
          <span className="font-bold tracking-wider text-[11px] uppercase text-amber-400">
            {t('shared_banner', 'SHARED VIEW — READ ONLY')}
          </span>
        </div>
        <div className="text-[10px] font-mono text-slate-300">
          Prama Legal Workspace
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 md:p-10">
        {/* Header */}
        <div className="mb-10 pb-6 border-b-2 border-border/50">
          <div className="text-[10px] tracking-widest text-muted uppercase font-semibold mb-2">
            Case Details
          </div>
          <h1 className="text-3xl font-bold font-serif text-charcoal mb-4">
            {data.clientName}
          </h1>
          <div className="flex flex-wrap gap-4 text-sm text-muted">
            <span className="font-mono bg-white px-2 py-1 rounded border border-border">ID: {data.caseId}</span>
            {data.hearingDate && (
              <span className="flex items-center gap-1.5"><Calendar size={14}/> {new Date(data.hearingDate).toLocaleDateString()}</span>
            )}
            {data.jurisdiction && (
              <span className="flex items-center gap-1.5"><MapPin size={14}/> {data.jurisdiction}</span>
            )}
          </div>
        </div>

        {/* Share Meta Box */}
        <div className="bg-white border border-border rounded-xl p-5 mb-10 flex flex-wrap gap-8 text-sm shadow-sm">
          <div>
            <div className="text-[10px] text-muted uppercase font-bold tracking-wider mb-1">{t('shared_to', 'Shared to')}</div>
            <div className="font-semibold text-slate">{data.recipientOrg}</div>
            <div className="text-xs text-muted">{data.recipientRole}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted uppercase font-bold tracking-wider mb-1">{t('shared_by', 'Shared by')}</div>
            <div className="font-semibold text-slate">{data.sharedBy}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted uppercase font-bold tracking-wider mb-1">{t('shared_expires', 'Link expires')}</div>
            <div className="font-semibold text-slate">{new Date(data.expiresAt).toLocaleDateString()}</div>
          </div>
        </div>

        {/* Permissions Content */}
        {!data.permissions.timeline && !data.permissions.deposits && (
          <div className="text-center py-10 text-muted">
            No specific evidence permissions were granted for this share link.
          </div>
        )}

        {data.permissions.deposits && data.deposits && (
          <div className="mb-10">
            <h2 className="text-xl font-bold font-serif mb-6 flex items-center gap-2">
              Memory Deposits ({data.depositCount})
            </h2>
            <div className="space-y-4">
              {data.deposits.map(d => (
                <div key={d.id} className="bg-white border border-border p-4 rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 text-slate">
                        {d.tag}
                      </span>
                      <span className="text-xs text-muted">Session {d.session}</span>
                    </div>
                    {d.timestamp && (
                      <span className="font-mono text-[10px] text-muted">{new Date(d.timestamp).toLocaleString()}</span>
                    )}
                  </div>
                  <p className="text-[14px] text-slate leading-relaxed font-medium">"{d.text}"</p>
                  
                  {data.permissions.media && d.attachments?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {d.attachments.map((a, i) => (
                        <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="overflow-hidden rounded border border-border block">
                          {a.mimeType?.startsWith('image/') 
                            ? <img src={a.url} alt="attachment" className="h-20 w-auto object-cover"/>
                            : <div className="h-20 px-4 bg-gray-50 flex items-center justify-center text-xs text-blue-600 underline">File</div>
                          }
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
