import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Shield, Clock, UserPlus } from 'lucide-react';
import apiClient from '../api';
import { useLanguage } from '../i18n';

export default function CollabPanel({ isOpen, onClose, caseId }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    recipientOrg: '', // Using common field for 'Client Name'
    recipientRole: 'Client',
    timeline: true, narrative: false, deposits: true, media: true,
    canAddDeposits: true,
    expiryDays: 1, consent: false,
  });
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);
  const [tab, setTab] = useState('create');

  useEffect(() => {
    if (!isOpen || !caseId) return;
    apiClient.get(`/api/cases/${encodeURIComponent(caseId)}/share`)
      .then(res => {
        // Filter only Client roles for this panel
        setShares(res.data.filter(s => s.recipientRole === 'Client'));
      }).catch(console.error);
  }, [isOpen, caseId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.consent) return alert(t('collab_consent'));
    setLoading(true);
    try {
      await apiClient.post(`/api/cases/${encodeURIComponent(caseId)}/share`, {
        recipientOrg: form.recipientOrg,
        recipientRole: form.recipientRole,
        permissions: { 
          timeline: form.timeline, 
          narrative: form.narrative, 
          deposits: form.deposits, 
          media: form.media,
          canAddDeposits: form.canAddDeposits
        },
        expiryDays: form.expiryDays,
        consentNote: `Collaboration consent confirmed by lawyer at ${new Date().toISOString()}`,
      });
      const updated = await apiClient.get(`/api/cases/${encodeURIComponent(caseId)}/share`);
      setShares(updated.data.filter(s => s.recipientRole === 'Client'));
      setForm({ ...form, recipientOrg: '', consent: false });
      setTab('links');
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally { setLoading(false); }
  };

  const handleRevoke = async (token) => {
    if (!window.confirm('Revoke this collaboration link? The client will lose access immediately.')) return;
    try {
      await apiClient.put(`/api/share/${token}/revoke`);
      setShares(shares.map(s => s.token === token ? { ...s, isRevoked: true } : s));
    } catch (err) { alert('Revoke failed: ' + err.message); }
  };

  const copyLink = (token) => {
    navigator.clipboard.writeText(`${window.location.origin}/shared/${token}`);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
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
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <UserPlus size={22} />
              </div>
              <div>
                <h2 className="font-serif text-[22px] font-bold text-slate tracking-tight">{t('collab_title')}</h2>
                <p className="text-[12px] text-muted mt-0.5">{t('collab_subtitle')}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-muted hover:text-slate hover:bg-gray-100 rounded-xl transition-colors"><X size={22}/></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-8 pt-4 flex gap-1 bg-card-bg border-b border-border">
          <button onClick={() => setTab('create')} className={`px-4 py-2.5 text-[12px] font-semibold rounded-t-lg transition-colors ${tab === 'create' ? 'bg-cream text-slate border border-border border-b-cream -mb-px' : 'text-muted hover:text-slate'}`}>
            Invite New
          </button>
          <button onClick={() => setTab('links')} className={`px-4 py-2.5 text-[12px] font-semibold rounded-t-lg transition-colors ${tab === 'links' ? 'bg-cream text-slate border border-border border-b-cream -mb-px' : 'text-muted hover:text-slate'}`}>
            {t('collab_active')} ({shares.filter(s => !s.isRevoked && new Date(s.expiresAt) > new Date()).length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          {tab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-6">
              <div>
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wide mb-1.5">{t('collab_name')} *</label>
                <input required type="text" placeholder={t('collab_name_ph')}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-1 focus:ring-primary outline-none"
                  value={form.recipientOrg} onChange={e => setForm({ ...form, recipientOrg: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-muted uppercase tracking-wide mb-1.5">Default Expiry</label>
                  <div className="flex items-center gap-2">
                    <div className="px-4 py-2 bg-gray-100 border border-border rounded-lg text-sm font-semibold text-slate">24 Hours</div>
                  </div>
                </div>
                <div>
                   <label className="block text-[11px] font-semibold text-muted uppercase tracking-wide mb-1.5">Permissions</label>
                   <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-[11px] font-bold text-blue-700 uppercase tracking-wide">View + Append</div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                 <p className="text-[11px] font-bold text-amber-800 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                   <Shield size={13}/> Security Notice
                 </p>
                 <p className="text-[12px] text-amber-800/80 leading-relaxed">
                   Links for clients expire quickly for security. The client can view the case data you've synthesized and add new memories. They <strong>cannot</strong> edit what you've already verified.
                 </p>
              </div>

              <div className="border-t border-border pt-6">
                <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${form.consent ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-200'}`}>
                  <input type="checkbox" checked={form.consent} onChange={e => setForm({ ...form, consent: e.target.checked })} className="mt-0.5 accent-green-600" />
                  <div>
                    <p className="text-[11px] font-bold text-slate uppercase tracking-wide mb-1">{t('collab_consent')}</p>
                    <p className="text-[12px] text-muted leading-relaxed">{t('collab_consent_text')}</p>
                  </div>
                </label>
              </div>

              <button type="submit" disabled={loading || !form.consent || !form.recipientOrg}
                className="w-full py-4 rounded-xl font-bold text-[13px] uppercase tracking-wider text-white transition-all disabled:opacity-40"
                style={{ background: '#4F46E5' }}>
                {loading ? 'Generating...' : t('collab_link')}
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              {shares.length === 0 && <p className="text-center text-muted text-sm py-10">No active collaborations.</p>}
              {shares.map(share => {
                const isExpired = new Date(share.expiresAt) < new Date();
                return (
                  <div key={share.token} className="bg-card-bg border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-bold text-slate">{share.recipientOrg}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full ${share.isRevoked ? 'bg-red-100 text-red-700' : isExpired ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>
                        {share.isRevoked ? 'Revoked' : isExpired ? 'Expired' : 'Active'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted mb-3">
                      <span className="flex items-center gap-1"><Clock size={11}/> Expires: {new Date(share.expiresAt).toLocaleString()}</span>
                    </div>
                    <div className="flex gap-2">
                      {!share.isRevoked && !isExpired && (
                        <>
                          <button onClick={() => copyLink(share.token)}
                            className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-semibold px-3 py-2 rounded-lg border border-border hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors">
                            {copied === share.token ? <><Check size={12}/> Copied</> : <><Copy size={12}/> Copy Link</>}
                          </button>
                          <button onClick={() => handleRevoke(share.token)}
                            className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                            Revoke
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
