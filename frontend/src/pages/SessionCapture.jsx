import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../api';
import Shell from '../components/Shell';
import ForensicIntelCard from '../components/ForensicIntelCard';
import { Search, AlignLeft, Eye, Ear, Wind, Hand, FileText, Activity, Paperclip, Mic, MicOff, Trash2 } from 'lucide-react';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
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
  const [interimText,  setInterimText] = useState('');
  const [activeTag,    setActiveTag]   = useState('General');
  const [searchQuery,  setSearchQuery] = useState('');

  // Speech Recognition
  const handleSpeechResult = useCallback(({ interimTranscript, finalTranscript }) => {
    if (finalTranscript) {
      setInputText(prev => (prev + ' ' + finalTranscript).trim());
    }
    setInterimText(interimTranscript);
  }, []);

  const { isListening, error: speechError, toggleListening } = useSpeechRecognition({ onResult: handleSpeechResult });

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

  // Forensic intel suggestion state
  const [forensicSuggestion, setForensicSuggestion] = useState(null); // { intel, matchedDeposit }

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
          id: d.depositId || d._id, // use depositId for the delete route
          sessionId: s._id, // store the parent session ID for the delete route
          type: d.sensoryTag,
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

  // File upload — enriched with Forensic AI (initial working version)
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      const res = await apiClient.post(`/api/cases/${encodeURIComponent(id)}/uploads`, formData);
      const uploadedFiles = res.data.files;
      setPendingAttachments(prev => [...prev, ...uploadedFiles]);

      // Check for Forensic AI intel in any uploaded file
      const filesWithIntel = uploadedFiles.filter(f => f.forensicIntel?.summary);
      if (filesWithIntel.length > 0) {
        const intel = filesWithIntel[0].forensicIntel;
        let matchedDeposit = null;
        if (intel.dates?.length > 0) {
          const dateFragments = intel.dates.map(d => d.toLowerCase());
          matchedDeposit = deposits.find(dep =>
            dateFragments.some(frag => dep.text.toLowerCase().includes(frag.slice(0, 6)))
          ) || null;
        }
        setForensicSuggestion({ intel, matchedDeposit });
      }
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
    setInterimText('');
    setPendingAttachments([]);
    setForensicSuggestion(null);
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

  const handleDeleteDeposit = async (sessionId, depositId) => {
    if (!window.confirm(t('confirm_delete_memory', 'Are you sure you want to permanently remove this specific memory from the case file?'))) return;
    try {
      // Find the session that contains this deposit in our local state to get the DB sessionId
      // Actually, we already have the raw response from /sessions in our useEffect. 
      // Let's refine the local state to store sessionId mapping.
      await apiClient.delete(`/api/cases/${encodeURIComponent(id)}/sessions/${sessionId}/deposit/${depositId}`);
      // Refresh local state
      setDeposits(prev => prev.filter(d => d.id !== depositId));
      sessionStorage.removeItem(`prama_stitch_${id}`);
    } catch (err) {
      alert('Failed to delete memory: ' + (err.response?.data?.error || err.message));
    }
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
        <div className="flex flex-1 items-center justify-center bg-[#F9F8F6] px-8" style={{ fontFamily: "'Inter', sans-serif" }}>
          <div className="max-w-md w-full text-center space-y-6">
            <div>
              <p className="text-[10px] tracking-[0.25em] text-[#847E76] uppercase font-bold mb-3">{t('session_start', 'Prama · Session Start')}</p>
              <h2 className="text-3xl font-bold text-[#2C2B2A] tracking-tight leading-tight" style={{ fontFamily: lang === 'hi' ? 'Inter, sans-serif' : "'Outfit', sans-serif" }}>
                {t('how_feeling', 'How are you feeling right now?')}
              </h2>
            </div>
            <p className="text-[14px] text-[#847E76] leading-relaxed">
              {t('no_pressure', 'There is no pressure to continue. You can stop at any time and your work will be saved.')}
            </p>
            <div className="space-y-4">
              {[
                { key: 'low',    label: t('feel_okay', "I feel okay to continue"),    indicator: 'bg-[#7A8B7D]', text: '#2C2B2A' },
                { key: 'medium', label: t('feel_uneasy', "I feel a bit uneasy"),         indicator: 'bg-[#847E76]', text: '#2C2B2A' },
                { key: 'high',   label: t('feel_distress', "I am in distress right now"),  indicator: 'bg-[#D97706]', text: '#2C2B2A' },
              ].map(opt => (
                <button key={opt.key}
                  onClick={() => setDistress(opt.key)}
                  aria-pressed={distress === opt.key}
                  aria-label={opt.label}
                  className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl border transition-all text-left bg-[#FCFBF9] border-[#E6E2D8] hover:border-[#7A8B7D] focus:ring-1 focus:ring-[#7A8B7D]"
                  style={{
                    borderColor: distress === opt.key ? '#7A8B7D' : '#E6E2D8',
                    backgroundColor: distress === opt.key ? '#F0EEE9' : '#FCFBF9',
                  }}>
                  <div className={`w-3 h-3 rounded-full ${opt.indicator} shrink-0`}/>
                  <span className="font-semibold text-[14px] text-[#2C2B2A]">
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>

            {distress === 'high' && (
              <div className="bg-[#FCFBF9] border border-[#E6E2D8] rounded-2xl p-6 text-left" aria-live="assertive">
                <p className="text-sm font-bold text-[#2C2B2A] mb-1.5">{t('distress_title', "You don't have to continue today.")}</p>
                <p className="text-xs text-[#847E76] leading-relaxed mb-3">
                  {t('distress_body', "What you're doing takes real courage. If you need support right now:")}
                </p>
                <p className="text-xs font-mono text-[#2C2B2A] font-semibold">
                  {t('crisis_lines', 'iCall (India): 9152987821 · Vandrevala Foundation: 1860-2662-345')}
                </p>
              </div>
            )}

            {distress && (
              <button
                onClick={() => setCheckedIn(true)}
                className="w-full py-3.5 rounded-xl font-bold text-[13px] uppercase tracking-wider text-[#FCFBF9] bg-[#7A8B7D] hover:bg-[#68776B] transition-all">
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
      <div className="flex flex-col flex-1 w-full bg-[#F9F8F6] relative overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

        {/* Session break suggestion banner */}
        {showBreakBanner && (
          <div className="bg-[#F0EEE9] border-b border-[#E6E2D8] px-6 py-3 flex items-center justify-between shrink-0">
            <p className="text-[12px] text-[#2C2B2A] font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D97706] animate-pulse"/> {t('break_suggest', "You've been going for 25 minutes. It's okay to take a break — everything is saved.")}
            </p>
            <button onClick={() => setShowBreakBanner(false)} className="text-[#7A8B7D] text-[11px] font-bold uppercase tracking-wider">{t('dismiss', 'Dismiss')}</button>
          </div>
        )}

        {/* Top bar */}
        <div className="px-8 py-4 border-b border-[#E6E2D8] bg-[#FCFBF9] flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-6">
            <div className="text-[12px] text-[#847E76] font-medium">{id} · {t('memory_session', 'Memory Session')}</div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#847E76]" />
              <input type="text" placeholder={t('search_memories', 'Search memories…')} value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="text-[12px] border-none bg-[#F0EEE9] text-[#2C2B2A] rounded-xl pl-9 pr-4 py-2 outline-none focus:ring-1 focus:ring-[#7A8B7D] w-56 transition-all" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[11px] text-[#847E76] bg-[#F0EEE9] px-2.5 py-1 rounded-md">{fmtTimer(sessionSecs)}</span>
            <div className="flex bg-[#F0EEE9] text-[#7A8B7D] text-[10px] font-semibold px-3 py-1 rounded-xl items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#7A8B7D] animate-pulse"/> {t('in_progress', 'In Progress')}
            </div>
            <button onClick={handleTakeBreak}
              className="text-[11px] font-bold uppercase tracking-wider text-[#2C2B2A] border border-[#E6E2D8] bg-[#FCFBF9] hover:bg-[#F0EEE9] px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5">
              {t('take_break', 'Take a Break')}
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: Case context panel */}
          <div className="w-[240px] border-r border-[#E6E2D8] bg-[#FCFBF9] p-6 flex flex-col hidden md:flex shrink-0 overflow-y-auto space-y-5">
            <div className="text-[10px] tracking-widest text-[#847E76] uppercase font-bold mb-2">{t('case_context', 'Case Context')}</div>
            <div>
              <div className="text-[9px] text-[#847E76] uppercase tracking-wide mb-1">{t('client_label', 'Client')}</div>
              <div className="text-[15px] text-[#2C2B2A] font-bold">{clientData.name}</div>
            </div>
            <div>
              <div className="text-[9px] text-[#847E76] uppercase tracking-wide mb-1.5">{t('upcoming_hearing', 'Upcoming Hearing')}</div>
              <input type="date" min={new Date().toISOString().split('T')[0]}
                value={clientData.hearingDate || ''}
                onChange={async (e) => {
                  setClientData({ ...clientData, hearingDate: e.target.value });
                  await apiClient.put(`/api/cases/${id}/hearing`, { hearingDate: e.target.value }).catch(console.error);
                }}
                className="w-full text-xs bg-[#F0EEE9] text-[#2C2B2A] border-none rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-[#7A8B7D]" />
            </div>
            <div className="h-px bg-[#E6E2D8]"/>
            {[
              [t('known_window', 'Known Window'),   clientData.baseLayer?.knownWindow],
              [t('anchor_days', 'Anchor Days'),    clientData.baseLayer?.anchorDays],
              [t('env_context', 'Env. Context'),   clientData.baseLayer?.environmentalContext],
              [t('medical_hx', 'Medical Hx'),     clientData.baseLayer?.medicalHistory],
            ].filter(([, v]) => v).map(([label, val]) => (
              <div key={label}>
                <div className="text-[9px] text-[#847E76] uppercase tracking-wide mb-1">{label}</div>
                <div className="text-[12px] text-[#2C2B2A] font-medium leading-relaxed">{val}</div>
              </div>
            ))}
          </div>

          {/* Center: Memory feed */}
          <div className="flex-1 flex flex-col bg-[#F9F8F6] min-w-0">
            <div className="flex-1 p-8 overflow-y-auto flex flex-col gap-6">
              {thisSessionCount > 0 && (
                <div className="text-center text-[12px] text-[#7A8B7D] font-bold">
                  ✓ {t('memories_saved', '{count} memories saved this session').replace('{count}', thisSessionCount).replace('memories', thisSessionCount === 1 ? t('memory_word_s', 'memory') : t('memory_word_p', 'memories'))}
                </div>
              )}
              {Object.keys(groupedDeposits).length === 0 && (
                <div className="text-center text-[#847E76] mt-16 text-sm space-y-2">
                  <p className="font-semibold text-[#2C2B2A] text-base">{t('no_memories', 'No memories recorded yet.')}</p>
                  <p className="text-[12px] text-[#847E76]/85 max-w-sm mx-auto leading-relaxed">{t('no_memories_hint', 'Describe what you remember below — in any order, in any detail.')}</p>
                </div>
              )}
              {Object.entries(groupedDeposits).map(([label, deps]) => (
                <div key={label} className="space-y-4">
                  <div className="flex items-center gap-4 py-2">
                    <div className="h-px bg-[#E6E2D8] flex-1"/>
                    <div className="text-[10px] font-bold text-[#847E76] uppercase tracking-wider bg-[#F0EEE9] px-3.5 py-1.5 rounded-xl">{label}</div>
                    <div className="h-px bg-[#E6E2D8] flex-1"/>
                  </div>
                  <div className="flex flex-col gap-4">
                    {deps.map(d => (
                      <div key={d.id} className="bg-[#FCFBF9] border border-[#E6E2D8] p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex gap-4 transition-all hover:border-[#7A8B7D]/60">
                        <div className="bg-[#F0EEE9] w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[#7A8B7D]">{d.icon}</div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#2C2B2A] text-[13px]">{d.type}</span>
                              <button 
                                onClick={() => handleDeleteDeposit(d.sessionId, d.id)}
                                className="text-[#847E76] hover:text-red-600 transition-colors p-1"
                                title={t('delete_memory', 'Delete Memory')}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                            <span className="text-[10px] text-[#847E76]">{d.time}</span>
                          </div>
                          <div className="text-[#2C2B2A] leading-relaxed text-[13px]">{d.text}</div>
                          {d.attachments?.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {d.attachments.map((a, i) => (
                                a.mimeType?.startsWith('image/')
                                  ? <a key={i} href={a.url} target="_blank" rel="noopener noreferrer">
                                      <img src={a.url} alt={a.originalName} className="w-14 h-14 object-cover rounded-xl border border-[#E6E2D8] hover:opacity-80 transition"/>
                                    </a>
                                  : <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                                       className="text-[11px] text-[#7A8B7D] underline flex items-center gap-1"><FileText size={13}/> {a.originalName}</a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Input area */}
            <div className="bg-[#FCFBF9] border-t border-[#E6E2D8] p-6 shrink-0 space-y-4">
              {/* Sense tags */}
              <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Sensory Tags">
                {TAGS.map(t => (
                  <button key={t.name} onClick={() => setActiveTag(t.name)}
                    aria-pressed={activeTag === t.name}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
                      activeTag === t.name
                        ? 'bg-[#7A8B7D] text-[#FCFBF9] border-[#7A8B7D]'
                        : 'bg-transparent text-[#847E76] border-[#E6E2D8] hover:border-[#847E76]/50'
                    }`}>
                    {t.icon} {t.name}
                  </button>
                ))}
              </div>

              {/* Pending file previews */}
              {pendingAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 bg-[#F0EEE9] p-3 rounded-xl">
                  {pendingAttachments.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 bg-[#FCFBF9] border border-[#E6E2D8] rounded-xl px-3 py-1.5 shadow-none">
                      {f.mimeType?.startsWith('image/')
                        ? <img src={f.url} alt={f.originalName} className="w-7 h-7 object-cover rounded-lg"/>
                        : <FileText size={14} className="text-[#847E76]"/>}
                      <span className="text-[11px] text-[#2C2B2A] truncate max-w-[120px]">{f.originalName}</span>
                      <button onClick={() => setPendingAttachments(p => p.filter((_, j) => j !== i))}
                        className="text-red-400 hover:text-red-600 text-xs font-bold ml-1">✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Forensic AI Card */}
              {forensicSuggestion && (
                <ForensicIntelCard
                  intel={forensicSuggestion.intel}
                  matchedDeposit={forensicSuggestion.matchedDeposit}
                  onAccept={() => {
                    const summary = forensicSuggestion.intel.summary || '';
                    setInputText(prev => prev ? `${prev}\n${summary}` : summary);
                    setForensicSuggestion(null);
                  }}
                  onDismiss={() => setForensicSuggestion(null)}
                />
              )}

              {/* Text input inline with attachments */}
              <div className="flex gap-3">
                {speechError && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-red-50 text-red-600 px-3 py-1 rounded-xl text-xs animate-bounce shadow-sm">
                    {t('mic_error', 'Microphone error. Please check permissions.')}
                  </div>
                )}
                <label className="cursor-pointer flex items-center justify-center p-3.5 text-[#2C2B2A] bg-[#F0EEE9] hover:bg-[#E6E2D8]/80 rounded-xl transition-colors shrink-0" title={t('attach_tooltip', 'Attach photo or document')}>
                  <Paperclip size={18} />
                  <input ref={fileInputRef} type="file" multiple
                    accept="image/*,.pdf"
                    className="hidden" onChange={handleFileSelect}
                    disabled={uploading} />
                </label>
                <button
                  onClick={(e) => { e.preventDefault(); toggleListening(); }}
                  title={isListening ? t('stop_dictation', 'Stop Dictation') : t('start_dictation', 'Start Dictation')}
                  disabled={uploading}
                  className={`flex items-center justify-center p-3.5 rounded-xl transition-colors shrink-0 ${isListening ? 'bg-red-50 text-red-500 animate-pulse border border-red-200' : 'bg-[#F0EEE9] text-[#2C2B2A] hover:bg-[#E6E2D8]/80'}`}>
                  {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                <textarea
                  rows={2}
                  value={inputText + (isListening && interimText ? (inputText ? ' ' : '') + interimText : '')}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAdd())}
                  placeholder={t('input_placeholder', "Describe what you remember — in any order, any detail.")}
                  aria-label={t('input_placeholder', "Describe what you remember")}
                  className="flex-1 border-none bg-[#F0EEE9] text-[#2C2B2A] placeholder-[#847E76]/70 rounded-xl px-4 py-3 text-[13px] outline-none focus:ring-1 focus:ring-[#7A8B7D] resize-none leading-relaxed"
                />
                <button onClick={handleAdd}
                  disabled={uploading}
                  className="bg-[#7A8B7D] text-[#FCFBF9] rounded-xl px-6 text-[13px] font-bold uppercase tracking-wider hover:bg-[#68776B] transition-colors self-stretch disabled:opacity-50">
                  {t('save_btn', 'Save')}
                </button>
              </div>
            </div>
          </div>

          {/* Right: AI statistics panel */}
          <div className="w-[200px] border-l border-[#E6E2D8] bg-[#FCFBF9] p-5 flex flex-col pt-8 hidden lg:flex shrink-0 space-y-6">
            <div className="text-[10px] tracking-widest text-[#847E76] uppercase font-bold">{t('session_panel', 'Session')}</div>
            <div className="bg-[#F0EEE9] rounded-2xl p-5 text-center">
              <div className="font-serif text-[36px] text-[#2C2B2A] font-bold leading-none">{deposits.length}</div>
              <div className="text-[10px] text-[#847E76] font-semibold mt-1.5 uppercase tracking-wide">{t('memories_logged', 'memories logged')}</div>
            </div>
            <div className="flex flex-col gap-3">
              {TAGS.map(tData => (
                <div key={tData.name} className="flex justify-between text-xs text-[#847E76] border-b border-[#E6E2D8] pb-1.5">
                  <span className="flex items-center gap-1.5">{tData.icon} {t(`tag_${tData.name.toLowerCase()}`, tData.name)}</span>
                  <span className="text-[#2C2B2A] font-bold">{deposits.filter(d => d.type === tData.name).length}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs text-[#847E76] border-b border-[#E6E2D8] pb-1.5">
                <span className="flex items-center gap-1.5"><FileText size={12}/> {t('media_label', 'Media')}</span>
                <span className="text-[#2C2B2A] font-bold">
                  {deposits.reduce((n, d) => n + (d.attachments?.filter(a => a.mimeType?.startsWith('image/')).length || 0), 0)}
                </span>
              </div>
            </div>
            <button onClick={() => navigate(`/case/${encodeURIComponent(id)}/chronology`)}
              className="bg-[#7A8B7D] text-[#FCFBF9] w-full rounded-xl py-3.5 text-[11px] font-bold uppercase tracking-wider hover:bg-[#68776B] transition-colors shadow-none mt-auto">
              {t('view_timeline', 'View Timeline ↗')}
            </button>
          </div>
        </div>
      </div>
    </Shell>
  );
}
