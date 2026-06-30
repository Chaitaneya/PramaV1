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
      <div className="absolute inset-0 bg-[#2C2B2A]/40 backdrop-blur-sm cursor-pointer" onClick={onClose} aria-label="Close share panel" />
      <div className="bg-[#FCFBF9] w-full max-w-[560px] h-full shadow-none relative z-10 flex flex-col border-l border-[#E6E2D8] animate-slide-in-right" role="dialog" aria-modal="true" aria-label={t('share_title')}>

        {/* Header */}
        <div className="px-8 py-6 border-b border-[#E6E2D8] flex items-center justify-between bg-[#FCFBF9]">
          <div>
            <h2 className="font-serif text-[24px] font-bold text-[#2C2B2A] tracking-tight">{t('share_title')}</h2>
            <p className="text-[12px] text-[#847E76] mt-0.5">{t('share_subtitle')}</p>
          </div>
          <button onClick={onClose} className="p-2 text-[#847E76] hover:text-[#2C2B2A] hover:bg-[#F9F8F6] rounded-xl transition-colors" aria-label="Close"><X size={20}/></button>
        </div>

        {/* Tabs */}
        <div className="px-8 pt-4 flex gap-1 bg-[#FCFBF9] border-b border-[#E6E2D8]">
          {[
            { id: 'create', label: t('generate_link') },
            { id: 'links',  label: `${t('active_shares')} (${shares.filter(s => !s.isRevoked && new Date(s.expiresAt) > new Date()).length})` },
            { id: 'audit',  label: t('audit_trail') },
          ].map(tab_ => (
            <button key={tab_.id} onClick={() => setTab(tab_.id)}
              className={`px-4 py-2.5 text-[12px] font-semibold rounded-t-xl transition-colors ${tab === tab_.id ? 'bg-[#F9F8F6] text-[#2C2B2A] border border-[#E6E2D8] border-b-[#F9F8F6] -mb-px' : 'text-[#847E76] hover:text-[#2C2B2A]'}`}>
              {tab_.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-8">

          {/* CREATE TAB */}
          {tab === 'create' && (
            <form onSubmit={handleCreate} className="space-y-6">
              <div>
                <label className="block text-[11px] font-semibold text-[#847E76] uppercase tracking-wide mb-2">{t('recipient_org')} *</label>
                <input required type="text" placeholder={t('recipient_org_ph')}
                  className="w-full bg-[#F0EEE9] text-[#2C2B2A] placeholder-[#847E76]/50 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-[#7A8B7D] outline-none border-none transition-all"
                  value={form.recipientOrg} onChange={e => setForm({ ...form, recipientOrg: e.target.value })} />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#847E76] uppercase tracking-wide mb-2">{t('recipient_role')}</label>
                <select value={form.recipientRole} onChange={e => setForm({ ...form, recipientRole: e.target.value })}
                  className="w-full bg-[#F0EEE9] text-[#2C2B2A] rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-[#7A8B7D] outline-none border-none transition-all cursor-pointer">
                  {ROLES.map(r => <option key={r} value={r}>{t(roleKey(r))}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#847E76] uppercase tracking-wide mb-2">{t('permissions_label')}</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'timeline',  label: t('perm_timeline') },
                    { key: 'narrative', label: t('perm_narrative') },
                    { key: 'deposits',  label: t('perm_deposits') },
                    { key: 'media',     label: t('perm_media') },
                  ].map(p => (
                    <label key={p.key} className={`flex items-center gap-2.5 p-3.5 rounded-xl border cursor-pointer transition-all text-sm ${form[p.key] ? 'bg-[#F0EEE9] border-[#7A8B7D] text-[#2C2B2A] font-medium' : 'bg-transparent border-[#E6E2D8] text-[#847E76] hover:border-[#847E76]/30'}`}>
                      <input type="checkbox" checked={form[p.key]} onChange={e => setForm({ ...form, [p.key]: e.target.checked })} className="accent-[#7A8B7D]" />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#847E76] uppercase tracking-wide mb-2">{t('expiry_label')}</label>
                <div className="flex items-center gap-3">
                  <input type="number" min={1} max={30} value={form.expiryDays}
                    onChange={e => setForm({ ...form, expiryDays: parseInt(e.target.value) || 7 })}
                    className="w-20 bg-[#F0EEE9] text-[#2C2B2A] border-none rounded-xl px-3 py-2.5 text-sm text-center focus:ring-1 focus:ring-[#7A8B7D] outline-none" />
                  <span className="text-sm text-[#847E76]">{t('expiry_days')}</span>
                </div>
              </div>

              <div className="border-t border-[#E6E2D8] pt-6">
                <label className={`flex items-start gap-3.5 p-5 rounded-2xl border transition-all cursor-pointer ${form.consent ? 'bg-[#F0EEE9] border-[#7A8B7D]' : 'bg-[#FCFBF9] border-[#E6E2D8] hover:border-[#847E76]/30'}`}>
                  <input type="checkbox" checked={form.consent} onChange={e => setForm({ ...form, consent: e.target.checked })} className="mt-1 accent-[#7A8B7D]" />
                  <div>
                    <p className="text-[11px] font-bold text-[#2C2B2A] uppercase tracking-wide mb-1 flex items-center gap-1.5">
                      <Shield size={14} className="text-[#7A8B7D]"/> {t('consent_label')}
                    </p>
                    <p className="text-[12px] text-[#847E76] leading-relaxed">{t('consent_text')}</p>
                  </div>
                </label>
              </div>

              <button type="submit" disabled={loading || !form.consent || !form.recipientOrg}
                className="w-full py-3.5 rounded-xl font-bold text-[13px] uppercase tracking-wider text-[#FCFBF9] bg-[#7A8B7D] hover:bg-[#68776B] transition-all disabled:opacity-40 shadow-none">
                {loading ? t('generating') : t('generate_link')}
              </button>
            </form>
          )}

          {/* LINKS TAB */}
          {tab === 'links' && (
            <div className="space-y-4">
              {shares.length === 0 && <p className="text-center text-[#847E76] text-sm py-10">{t('no_shares')}</p>}
              {shares.map(share => {
                const status = getStatus(share);
                return (
                  <div key={share.token} className="bg-[#FCFBF9] border border-[#E6E2D8] rounded-2xl p-5 space-y-3 hover:border-[#847E76]/45 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-bold text-[#2C2B2A]">{share.recipientOrg}</span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${
                        share.isRevoked ? 'bg-[#F0EEE9] text-[#847E76]' :
                        new Date(share.expiresAt) < new Date() ? 'bg-[#F0EEE9] text-[#847E76]' :
                        'bg-[#F0EEE9] text-[#7A8B7D]'
                      }`}>{status.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[#847E76]">
                      <span>{t(roleKey(share.recipientRole))}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1"><Clock size={12}/> {t('expires_label')}: {new Date(share.expiresAt).toLocaleDateString()}</span>
                      <span>·</span>
                      <span>{share.accessLog?.length || 0} {t('accesses')}</span>
                    </div>
                    <div className="flex gap-2 pt-1 border-t border-[#E6E2D8]/50">
                      {!share.isRevoked && new Date(share.expiresAt) > new Date() && (
                        <>
                          <button onClick={() => copyLink(share.token)}
                            className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-[#E6E2D8] text-[#2C2B2A] hover:bg-[#F0EEE9] transition-colors">
                            {copied === share.token ? <><Check size={12}/> {t('link_copied')}</> : <><Copy size={12}/> {t('copy_link')}</>}
                          </button>
                          <button onClick={() => handleRevoke(share.token)}
                            className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-[#E6E2D8] text-red-600 hover:bg-red-50 transition-colors">
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
              {auditLogs.length === 0 && <p className="text-center text-[#847E76] text-sm py-10">{t('no_audit')}</p>}
              {auditLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-3 py-4 border-b border-[#E6E2D8]/60 last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    log.action.includes('CREATED') ? 'bg-[#7A8B7D]' :
                    log.action.includes('ACCESSED') ? 'bg-[#7A8B7D]' :
                    log.action.includes('REVOKED') ? 'bg-[#D97706]' :
                    'bg-[#847E76]'
                  }`}/>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-[12px] font-bold text-[#2C2B2A]">{log.action.replace(/_/g, ' ')}</p>
                    <p className="text-[11px] text-[#847E76]">
                      {log.actor} · {new Date(log.timestamp).toLocaleString()}
                    </p>
                    {log.details?.recipientOrg && (
                      <p className="text-[10px] text-[#847E76] mt-1 flex items-center gap-1">
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
