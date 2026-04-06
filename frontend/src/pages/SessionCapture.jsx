import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../api';
import Shell from '../components/Shell';
import { Search, AlignLeft, Eye, Ear, Wind, Hand, FileText, Activity, Paperclip } from 'lucide-react';
import { useLanguage } from '../i18n';

const TAGS = [
  { name: 'General',   icon: <FileText size={16} strokeWidth={1.5}/>  },
  { name: 'Visual',    icon: <Eye size={16} strokeWidth={1.5}/>       },
  { name: 'Auditory',  icon: <Ear size={16} strokeWidth={1.5}/>       },
  { name: 'Olfactory', icon: <Wind size={16} strokeWidth={1.5}/>      },
  { name: 'Somatic',   icon: <Activity size={16} strokeWidth={1.5}/>  },
];

const SESSION_WARN_SECS = 25 * 60;
const SESSION_LIMIT_SECS = 30 * 60;

export default function SessionCapture() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();

  // Core state
  const [deposits,     setDeposits]    = useState([]);
  const [clientData,   setClientData]  = useState({ name: 'Loading...', baseLayer: {} });
  const [inputText,    setInputText]   = useState('');
  const [activeTag,    setActiveTag]   = useState('General');
  const [searchQuery,  setSearchQuery] = useState('');

  // Check-in
  const [checkedIn,  setCheckedIn]  = useState(false);
  const [distress,   setDistress]   = useState(null);

  // Session timer
  const [sessionSecs,        setSessionSecs]        = useState(0);
  const [showBreakBanner,    setShowBreakBanner]     = useState(false);
  const timerRef = useRef(null);

  // File attachments
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [uploading,          setUploading]           = useState(false);
  const fileInputRef = useRef(null);

  // Session counter for this tab visit
  const [thisSessionCount, setThisSessionCount] = useState(0);

  useEffect(() => {
    apiClient.get(`/api/cases/${id}`)
      .then(res => setClientData({ name: res.data.clientName, baseLayer: res.data.baseLayer, hearingDate: res.data.hearingDate?.split('T')[0] || '' }))
      .catch(() => setClientData({ name: 'Unknown Client', baseLayer: {} }));

    apiClient.get(`/api/cases/${id}/sessions`).then(res => {
      const allDeps = [];
      res.data.forEach((s, i) => {
        const label = `Session ${i + 1} · ${new Date(s.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;
        s.deposits.forEach(d => allDeps.push({
          id: d._id, type: d.sensoryTag,
          icon: TAGS.find(t => t.name === d.sensoryTag)?.icon || <AlignLeft size={16}/>,
          time: new Date(d.addedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: new Date(d.addedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
          sessionLabel: label, text: d.content,
          attachments: d.attachments || [],
        }));
      });
      setDeposits(allDeps);
    }).catch(err => console.error('Sessions fetch error:', err));
  }, [id]);

  // Timer — only runs after check-in
  useEffect(() => {
    if (!checkedIn) return;
    timerRef.current = setInterval(() => {
      setSessionSecs(s => {
        const next = s + 1;
        if (next === SESSION_WARN_SECS) setShowBreakBanner(true);
        return next;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [checkedIn]);

  const fmtTimer = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // File upload
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      const res = await apiClient.post(`/api/cases/${encodeURIComponent(id)}/uploads`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPendingAttachments(prev => [...prev, ...res.data.files]);
    } catch (err) { alert('File upload failed: ' + (err.response?.data?.error || err.message)); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleAdd = async () => {
    if (!inputText.trim() && pendingAttachments.length === 0) return;
    const icon = TAGS.find(t => t.name === activeTag)?.icon || <FileText size={16} strokeWidth={1.5}/>;
    const textToSend = inputText.trim() || 'Media Attached';
    const attachmentsToSend = pendingAttachments;
    const label = deposits.length > 0
      ? deposits[deposits.length - 1].sessionLabel
      : `Session 1 · ${new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;

    setDeposits(prev => [...prev, {
      id: Date.now(), type: activeTag, icon,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
      sessionLabel: label, text: textToSend, attachments: attachmentsToSend,
    }]);
    setInputText('');
    setPendingAttachments([]);
    setThisSessionCount(c => c + 1);

    try {
      await apiClient.post(`/api/cases/${encodeURIComponent(id)}/sessions`, {
        content: textToSend, sensoryTag: activeTag,
        attachments: attachmentsToSend,
      });
      sessionStorage.removeItem(`prama_stitch_${id}`);
    } catch { alert('Failed to save memory.'); }
  };

  const handleTakeBreak = async () => {
    try { await apiClient.post(`/api/cases/${encodeURIComponent(id)}/sessions/end`); } catch {}
    navigate('/');
  };

  const groupedDeposits = deposits
    .filter(d => d.text.toLowerCase().includes(searchQuery.toLowerCase()))
    .reduce((acc, dep) => {
      const key = dep.sessionLabel || dep.date;
      if (!acc[key]) acc[key] = [];
      acc[key].push(dep);
      return acc;
    }, {});

  // ── Emotional Check-In Gate ──────────────────────────────────
  if (!checkedIn) {
    return (
      <Shell>
        <div className="flex flex-1 items-center justify-center bg-cream px-6" style={{ fontFamily: "'Inter', sans-serif" }}>
          <div className="max-w-md w-full text-center">
            <p className="text-[10px] tracking-[0.3em] text-muted uppercase font-semibold mb-3">{t('session_start', 'Prama · Session Start')}</p>
            <h2 className={`text-2xl font-bold text-slate mb-2 ${lang === 'hi' ? 'font-sans' : ''}`} style={{ fontFamily: lang === 'hi' ? 'Inter, sans-serif' : "'Playfair Display', serif" }}>
              {t('how_feeling', 'How are you feeling right now?')}
            </h2>
            <p className="text-sm text-muted mb-8 leading-relaxed">
              {t('no_pressure', 'There is no pressure to continue. You can stop at any time and your work will be saved.')}
            </p>
            <div className="space-y-3 mb-8">
              {[
                { key: 'low',    label: t('feel_okay', "I feel okay to continue"),    indicator: 'bg-green-500', bg: '#F0FDF4', border: '#86EFAC', text: '#166534' },
                { key: 'medium', label: t('feel_uneasy', "I feel a bit uneasy"),         indicator: 'bg-amber-400', bg: '#FFFBEB', border: '#FCD34D', text: '#92400E' },
                { key: 'high',   label: t('feel_distress', "I am in distress right now"),  indicator: 'bg-red-500', bg: '#FFF1F2', border: '#FCA5A5', text: '#9F1239' },
              ].map(opt => (
                <button key={opt.key}
                  onClick={() => setDistress(opt.key)}
                  aria-pressed={distress === opt.key}
                  aria-label={opt.label}
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all text-left"
                  style={{
                    background: distress === opt.key ? opt.bg : '#fff',
                    borderColor: distress === opt.key ? opt.border : '#e2e8f0',
                  }}>
                  <div className={`w-3.5 h-3.5 rounded-full ${opt.indicator} shadow-sm shrink-0`}/>
                  <span className="font-semibold text-[14px]" style={{ color: distress === opt.key ? opt.text : '#475569' }}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>

            {distress === 'high' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-left" aria-live="assertive">
                <p className="text-sm font-bold text-red-700 mb-1">{t('distress_title', "You don't have to continue today.")}</p>
                <p className="text-xs text-red-600 leading-relaxed mb-2">
                  {t('distress_body', "What you're doing takes real courage. If you need support right now:")}
                </p>
                <p className="text-xs font-mono text-red-700 font-semibold">
                  {t('crisis_lines', 'iCall (India): 9152987821 · Vandrevala Foundation: 1860-2662-345')}
                </p>
              </div>
            )}

            {distress && (
              <button
                onClick={() => setCheckedIn(true)}
                className="w-full py-3.5 rounded-xl font-bold text-[13px] uppercase tracking-wider text-white transition-all"
                style={{ background: '#3B4F8C' }}>
                {distress === 'high' ? t('continue_ready', 'I understand — continue when ready') : t('begin_session', 'Begin Session')}
              </button>
            )}
          </div>
        </div>
      </Shell>
    );
  }

  // ── Main Session UI ──────────────────────────────────────────
  return (
    <Shell>
      <div className="flex flex-col flex-1 w-full bg-cream relative overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

        {/* Session break suggestion banner */}
        {showBreakBanner && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-2 flex items-center justify-between shrink-0">
            <p className="text-[12px] text-amber-800 font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"/> {t('break_suggest', "You've been going for 25 minutes. It's okay to take a break — everything is saved.")}
            </p>
            <button onClick={() => setShowBreakBanner(false)} className="text-amber-600 text-[11px] font-semibold">{t('dismiss', 'Dismiss')}</button>
          </div>
        )}

        {/* Top bar */}
        <div className="px-4 py-2 border-b border-border bg-card-bg flex items-center justify-between shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="text-xs text-muted font-medium">{id} · {t('memory_session', 'Memory Session')}</div>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <input type="text" placeholder={t('search_memories', 'Search memories…')} value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="text-[12px] border border-border bg-gray-50 rounded-full pl-8 pr-3 py-1 outline-none focus:border-primary w-48 transition-all" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-muted">{fmtTimer(sessionSecs)}</span>
            <div className="flex bg-[#EEF2FF] text-[#5C6BC0] text-[10px] font-semibold px-3 py-1 rounded-full items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#5C6BC0] animate-pulse"/> {t('in_progress', 'In Progress')}
            </div>
            <button onClick={handleTakeBreak}
              className="text-[11px] font-bold uppercase tracking-wide text-slate border border-border bg-card-bg hover:bg-red-50 hover:text-red-600 hover:border-red-200 px-4 py-1.5 rounded-full transition-colors flex items-center gap-1.5">
              {t('take_break', 'Take a Break')}
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: Case skeleton */}
          <div className="w-[200px] border-r border-border bg-card-bg p-4 flex flex-col hidden md:flex shrink-0 overflow-y-auto">
            <div className="text-[10px] tracking-widest text-muted uppercase font-medium mb-4">{t('case_context', 'Case Context')}</div>
            <div className="mb-3">
              <div className="text-[9px] text-muted uppercase tracking-wide mb-1">{t('client_label', 'Client')}</div>
              <div className="text-[14px] text-charcoal font-bold">{clientData.name}</div>
            </div>
            <div className="mb-3">
              <div className="text-[9px] text-muted uppercase tracking-wide mb-1">{t('upcoming_hearing', 'Upcoming Hearing')}</div>
              <input type="date" min={new Date().toISOString().split('T')[0]}
                value={clientData.hearingDate || ''}
                onChange={async (e) => {
                  setClientData({ ...clientData, hearingDate: e.target.value });
                  await apiClient.put(`/api/cases/${id}/hearing`, { hearingDate: e.target.value }).catch(console.error);
                }}
                className="w-full text-xs bg-gray-50 border border-border rounded p-1.5 focus:outline-none focus:border-primary" />
            </div>
            <div className="h-px bg-border my-2"/>
            {[
              [t('known_window', 'Known Window'),   clientData.baseLayer?.knownWindow],
              [t('anchor_days', 'Anchor Days'),    clientData.baseLayer?.anchorDays],
              [t('env_context', 'Env. Context'),   clientData.baseLayer?.environmentalContext],
              [t('medical_hx', 'Medical Hx'),     clientData.baseLayer?.medicalHistory],
            ].filter(([, v]) => v).map(([label, val]) => (
              <div key={label} className="my-2">
                <div className="text-[9px] text-muted uppercase tracking-wide mb-0.5">{label}</div>
                <div className="text-[11px] text-slate font-medium leading-tight">{val}</div>
              </div>
            ))}
          </div>

          {/* Center: Memory feed */}
          <div className="flex-1 flex flex-col bg-cream min-w-0">
            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
              {thisSessionCount > 0 && (
                <div className="text-center text-[11px] text-green-600 font-semibold">
                  ✓ {t('memories_saved', '{count} memories saved this session').replace('{count}', thisSessionCount).replace('memories', thisSessionCount === 1 ? t('memory_word_s', 'memory') : t('memory_word_p', 'memories'))}
                </div>
              )}
              {Object.keys(groupedDeposits).length === 0 && (
                <div className="text-center text-muted mt-10 text-sm leading-relaxed">
                  <p className="mb-1">{t('no_memories', 'No memories recorded yet.')}</p>
                  <p className="text-[12px] text-muted/70">{t('no_memories_hint', 'Describe what you remember below — in any order, in any detail.')}</p>
                </div>
              )}
              {Object.entries(groupedDeposits).map(([label, deps]) => (
                <div key={label} className="mb-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-px bg-border flex-1"/>
                    <div className="text-xs font-bold text-muted uppercase tracking-wider bg-gray-50 px-3 py-1 rounded-full border border-border">{label}</div>
                    <div className="h-px bg-border flex-1"/>
                  </div>
                  <div className="flex flex-col gap-3">
                    {deps.map(d => (
                      <div key={d.id} className="bg-card-bg border border-border p-3.5 rounded-xl shadow-sm flex gap-3">
                        <div className="bg-gray-50 w-8 h-8 rounded flex items-center justify-center shrink-0 border border-border text-base">{d.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-slate text-xs">{d.type}</span>
                            <span className="text-[10px] text-muted">{d.time}</span>
                          </div>
                          <div className="text-slate leading-relaxed text-[13px]">{d.text}</div>
                          {d.attachments?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {d.attachments.map((a, i) => (
                                a.mimeType?.startsWith('image/')
                                  ? <a key={i} href={a.url} target="_blank" rel="noopener noreferrer">
                                      <img src={a.url} alt={a.originalName} className="w-12 h-12 object-cover rounded border border-slate-200 hover:opacity-80 transition"/>
                                    </a>
                                  : <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                                       className="text-[10px] text-blue-600 underline flex items-center gap-1"><FileText size={12}/> {a.originalName}</a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="h-4"/>
            </div>

            {/* Input area */}
            <div className="bg-card-bg border-t border-border p-4 shrink-0">
              {/* Sense tags */}
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1" role="group" aria-label="Sensory Tags">
                {TAGS.map(t => (
                  <button key={t.name} onClick={() => setActiveTag(t.name)}
                    aria-pressed={activeTag === t.name}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors border whitespace-nowrap ${
                      activeTag === t.name
                        ? 'bg-[#8FBC8F] text-white border-[#8FBC8F]'
                        : 'bg-transparent text-slate/60 border-slate/20 hover:border-slate/40'
                    }`}>
                    {t.icon} {t.name}
                  </button>
                ))}
              </div>

              {/* Pending file previews ON TOP (WhatsApp style) */}
              {pendingAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2 bg-cream/50 p-2 rounded-xl border border-border">
                  {pendingAttachments.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-sm">
                      {f.mimeType?.startsWith('image/')
                        ? <img src={f.url} alt={f.originalName} className="w-8 h-8 object-cover rounded"/>
                        : <FileText size={14} className="text-muted"/>}
                      <span className="text-[10px] text-slate truncate max-w-[100px]">{f.originalName}</span>
                      <button onClick={() => setPendingAttachments(p => p.filter((_, j) => j !== i))}
                        className="text-red-400 hover:text-red-600 text-[10px] font-bold leading-none ml-1">✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Text input inline with attachment */}
              <div className="flex gap-2">
                <label className="cursor-pointer flex items-center justify-center p-3 text-muted hover:text-slate bg-gray-50 border border-border rounded-xl transition-colors shrink-0" title={t('attach_tooltip', 'Attach photo or document')}>
                  <Paperclip size={18} className="text-slate" />
                  <input ref={fileInputRef} type="file" multiple
                    accept="image/*,.pdf,audio/*,video/*"
                    className="hidden" onChange={handleFileSelect}
                    disabled={uploading} />
                </label>
                <textarea
                  rows={2}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAdd())}
                  placeholder={t('input_placeholder', "Describe what you remember — in any order, any detail. Don't worry about getting it perfect.")}
                  aria-label={t('input_placeholder', "Describe what you remember")}
                  className="flex-1 border border-border rounded-xl px-4 py-3 text-[13px] bg-cream text-slate outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none leading-relaxed"
                />
                <button onClick={handleAdd}
                  disabled={uploading}
                  className="bg-primary text-white rounded-xl px-5 text-[13px] font-bold uppercase tracking-wide hover:bg-primary-dark transition-colors self-stretch disabled:opacity-50">
                  {t('save_btn', 'Save')}
                </button>
              </div>
            </div>
          </div>

          {/* Right: AI panel */}
          <div className="w-[180px] border-l border-border bg-card-bg p-4 flex flex-col pt-6 hidden lg:flex shrink-0">
            <div className="text-[10px] tracking-widest text-muted uppercase font-medium mb-3">{t('session_panel', 'Session')}</div>
            <div className="bg-primary-light rounded-xl p-4 text-center mb-4">
              <div className="font-serif text-[32px] text-slate leading-none">{deposits.length}</div>
              <div className="text-[10px] text-muted mt-1">{t('memories_logged', 'memories logged')}</div>
            </div>
            <div className="flex flex-col gap-2 mb-4">
              {TAGS.map(tData => (
                <div key={tData.name} className="flex justify-between text-xs text-muted border-b border-border pb-1">
                  <span className="flex items-center gap-1.5">{tData.icon} {t(`tag_${tData.name.toLowerCase()}`, tData.name)}</span>
                  <span className="text-slate font-medium">{deposits.filter(d => d.type === tData.name).length}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs text-muted border-b border-border pb-1">
                <span className="flex items-center gap-1.5"><FileText size={12}/> {t('media_label', 'Media')}</span>
                <span className="text-slate font-medium">
                  {deposits.reduce((n, d) => n + (d.attachments?.filter(a => a.mimeType?.startsWith('image/')).length || 0), 0)}
                </span>
              </div>
            </div>
            <button onClick={() => navigate(`/case/${encodeURIComponent(id)}/chronology`)}
              className="bg-slate text-white w-full rounded-xl p-4 text-[12px] font-bold uppercase tracking-wide hover:bg-slate/90 transition-colors shadow-sm mt-auto">
              {t('view_timeline', 'View Timeline ↗')}
            </button>
          </div>
        </div>
      </div>
    </Shell>
  );
}
