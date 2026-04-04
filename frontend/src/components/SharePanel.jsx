import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Shield, Clock, ExternalLink } from 'lucide-react';
import apiClient from '../api';
import { useLanguage } from '../i18n';

export default function SharePanel({ isOpen, onClose, caseId }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    recipientOrg: '', recipientRole: 'Police',
    timeline: true, narrative: false, deposits: false, media: false,
    expiryDays: 7, consent: false,
  });
  const [shares, setShares] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);
  const [tab, setTab] = useState('create');

  useEffect(() => {
    if (!isOpen || !caseId) return;
    apiClient.get(`/api/cases/${encodeURIComponent(caseId)}/share`)
      .then(res => setShares(res.data)).catch(console.error);
    apiClient.get(`/api/cases/${encodeURIComponent(caseId)}/share/audit`)
      .then(res => setAuditLogs(res.data)).catch(console.error);
  }, [isOpen, caseId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.consent) return alert(t('consent_label'));
    setLoading(true);
    try {
      const res = await apiClient.post(`/api/cases/${encodeURIComponent(caseId)}/share`, {
        recipientOrg: form.recipientOrg,
        recipientRole: form.recipientRole,
        permissions: { timeline: form.timeline, narrative: form.narrative, deposits: form.deposits, media: form.media },
        expiryDays: form.expiryDays,
        consentNote: `Consent confirmed by lawyer at ${new Date().toISOString()}`,
      });
      const updated = await apiClient.get(`/api/cases/${encodeURIComponent(caseId)}/share`);
      setShares(updated.data);
      setForm({ ...form, recipientOrg: '', consent: false });
      setTab('links');
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally { setLoading(false); }
  };

  const handleRevoke = async (token) => {
    if (!window.confirm('Revoke this share link? The recipient will lose access immediately.')) return;
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

  const getStatus = (share) => {
    if (share.isRevoked) return { label: t('revoked'), cls: 'bg-red-100 text-red-700' };
    if (new Date(share.expiresAt) < new Date()) return { label: t('expired'), cls: 'bg-gray-100 text-gray-600' };
    return { label: t('active'), cls: 'bg-green-100 text-green-700' };
  };

  const ROLES = ['Police', 'Medical', 'Legal', 'Shelter', 'Court', 'NGO', 'Other'];
  const roleKey = (r) => `role_${r.toLowerCase()}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm cursor-pointer" onClick={onClose} aria-label="Close share panel" />
      <div className="bg-cream w-full max-w-[560px] h-full shadow-2xl relative z-10 flex flex-col border-l border-primary/20 animate-slide-in-right" role="dialog" aria-modal="true" aria-label={t('share_title')}>

        {/* Header */}
        <div className="px-8 py-5 border-b border-border flex items-center justify-between bg-card-bg">
          <div>
            <h2 className="font-serif text-[22px] font-bold text-slate tracking-tight">{t('share_title')}</h2>
            <p className="text-[12px] text-muted mt-0.5">{t('share_subtitle')}</p>
          </div>
          <button onClick={onClose} className="p-2 text-muted hover:text-slate hover:bg-gray-100 rounded-xl transition-colors" aria-label="Close"><X size={22}/></button>
        </div>

        {/* Tabs */}
        <div className="px-8 pt-4 flex gap-1 bg-card-bg border-b border-border">
          {[
            { id: 'create', label: t('generate_link') },
            { id: 'links',  label: `${t('active_shares')} (${shares.filter(s => !s.isRevoked && new Date(s.expiresAt) > new Date()).length})` },
            { id: 'audit',  label: t('audit_trail') },
          ].map(tab_ => (
            <button key={tab_.id} onClick={() => setTab(tab_.id)}
              className={`px-4 py-2.5 text-[12px] font-semibold rounded-t-lg transition-colors ${tab === tab_.id ? 'bg-cream text-slate border border-border border-b-cream -mb-px' : 'text-muted hover:text-slate'}`}>
              {tab_.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">

          {/* CREATE TAB */}
          {tab === 'create' && (
            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wide mb-1.5">{t('recipient_org')} *</label>
                <input required type="text" placeholder={t('recipient_org_ph')}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-1 focus:ring-primary outline-none"
                  value={form.recipientOrg} onChange={e => setForm({ ...form, recipientOrg: e.target.value })} />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wide mb-1.5">{t('recipient_role')}</label>
                <select value={form.recipientRole} onChange={e => setForm({ ...form, recipientRole: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-1 focus:ring-primary outline-none bg-white">
                  {ROLES.map(r => <option key={r} value={r}>{t(roleKey(r))}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">{t('permissions_label')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'timeline',  label: t('perm_timeline') },
                    { key: 'narrative', label: t('perm_narrative') },
                    { key: 'deposits',  label: t('perm_deposits') },
                    { key: 'media',     label: t('perm_media') },
                  ].map(p => (
                    <label key={p.key} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all text-sm ${form[p.key] ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-white border-border text-muted hover:border-slate/30'}`}>
                      <input type="checkbox" checked={form[p.key]} onChange={e => setForm({ ...form, [p.key]: e.target.checked })} className="accent-primary" />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wide mb-1.5">{t('expiry_label')}</label>
                <div className="flex items-center gap-2">
                  <input type="number" min={1} max={30} value={form.expiryDays}
                    onChange={e => setForm({ ...form, expiryDays: parseInt(e.target.value) || 7 })}
                    className="w-20 border border-border rounded-lg px-3 py-2 text-sm text-center focus:ring-1 focus:ring-primary outline-none" />
                  <span className="text-sm text-muted">{t('expiry_days')}</span>
                </div>
              </div>

              <div className="border-t border-border pt-5">
                <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${form.consent ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-200'}`}>
                  <input type="checkbox" checked={form.consent} onChange={e => setForm({ ...form, consent: e.target.checked })} className="mt-0.5 accent-green-600" />
                  <div>
                    <p className="text-[11px] font-bold text-slate uppercase tracking-wide mb-1 flex items-center gap-1.5">
                      <Shield size={13}/> {t('consent_label')}
                    </p>
                    <p className="text-[12px] text-muted leading-relaxed">{t('consent_text')}</p>
                  </div>
                </label>
              </div>

              <button type="submit" disabled={loading || !form.consent || !form.recipientOrg}
                className="w-full py-3 rounded-xl font-bold text-[13px] uppercase tracking-wider text-white transition-all disabled:opacity-40"
                style={{ background: '#3B4F8C' }}>
                {loading ? t('generating') : t('generate_link')}
              </button>
            </form>
          )}

          {/* LINKS TAB */}
          {tab === 'links' && (
            <div className="space-y-3">
              {shares.length === 0 && <p className="text-center text-muted text-sm py-10">{t('no_shares')}</p>}
              {shares.map(share => {
                const status = getStatus(share);
                return (
                  <div key={share.token} className="bg-card-bg border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-bold text-slate">{share.recipientOrg}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted mb-3">
                      <span>{t(roleKey(share.recipientRole))}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1"><Clock size={11}/> {t('expires_label')}: {new Date(share.expiresAt).toLocaleDateString()}</span>
                      <span>·</span>
                      <span>{share.accessLog?.length || 0} {t('accesses')}</span>
                    </div>
                    <div className="flex gap-2">
                      {!share.isRevoked && new Date(share.expiresAt) > new Date() && (
                        <>
                          <button onClick={() => copyLink(share.token)}
                            className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-border hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors">
                            {copied === share.token ? <><Check size={12}/> {t('link_copied')}</> : <><Copy size={12}/> {t('copy_link')}</>}
                          </button>
                          <button onClick={() => handleRevoke(share.token)}
                            className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                            {t('revoke_link')}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* AUDIT TAB */}
          {tab === 'audit' && (
            <div className="space-y-2">
              {auditLogs.length === 0 && <p className="text-center text-muted text-sm py-10">{t('no_audit')}</p>}
              {auditLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-3 py-3 border-b border-border last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    log.action.includes('CREATED') ? 'bg-blue-500' :
                    log.action.includes('ACCESSED') ? 'bg-green-500' :
                    log.action.includes('REVOKED') ? 'bg-red-500' :
                    'bg-gray-400'
                  }`}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-slate">{log.action.replace(/_/g, ' ')}</p>
                    <p className="text-[11px] text-muted">
                      {log.actor} · {new Date(log.timestamp).toLocaleString()}
                    </p>
                    {log.details?.recipientOrg && (
                      <p className="text-[10px] text-muted mt-0.5 flex items-center gap-1">
                        <ExternalLink size={10}/> {log.details.recipientOrg}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
