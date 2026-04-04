import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api';
import Shell from '../components/Shell';
import { jsPDF } from 'jspdf';
import { Eye, Ear, Wind, Activity, FileText, Link, ShieldCheck } from 'lucide-react';
import SharePanel from '../components/SharePanel';
import { useLanguage } from '../i18n';
/* ─── Sensory colours ────────────────────────────────────────────── */
const SENSORY = {
  Visual:    { bg: '#EEF2FF', text: '#4338CA', dot: '#6366F1', border: '#C7D2FE' },
  Auditory:  { bg: '#FFF7ED', text: '#C2410C', dot: '#F97316', border: '#FED7AA' },
  Olfactory: { bg: '#F0FDF4', text: '#166534', dot: '#22C55E', border: '#BBF7D0' },
  Somatic:   { bg: '#FDF4FF', text: '#86198F', dot: '#D946EF', border: '#F0ABFC' },
  General:   { bg: '#F8FAFC', text: '#475569', dot: '#94A3B8', border: '#E2E8F0' },
};

/* ─── Helpers ────────────────────────────────────────────────────── */
const makeFloatKey = (ev) =>
  ev.sourceIds?.length > 0
    ? [...ev.sourceIds].sort().join('|')
    : (ev.desc || '').slice(0, 60);

const fmtDate = (raw) => {
  if (!raw || raw === 'Unanchored' || raw === '__start__') return raw || '—';
  const d = new Date(raw);
  if (!isNaN(d)) return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return raw; // keep AI-formatted strings like "Late March 2023" as-is
};

const buildMerged = (anchored, floating, placements) => {
  const result = [];
  floating.forEach(fev => {
    if (placements[makeFloatKey(fev)] === '__start__')
      result.push({ ...fev, isPlaced: true, floatKey: makeFloatKey(fev) });
  });
  anchored.forEach(ev => {
    result.push(ev);
    floating.forEach(fev => {
      const key = makeFloatKey(fev);
      if (placements[key] === ev.date)
        result.push({ ...fev, isPlaced: true, floatKey: key });
    });
  });
  return result;
};

/* ─── Precision badge ────────────────────────────────────────────── */
function PrecisionBadge({ prec, isPlaced, isConflict }) {
  if (isConflict) return <span className="badge-red">⚠ Conflict</span>;
  if (isPlaced)   return <span className="badge-amber">Placed</span>;
  const cls =
    prec === 'Exact'        ? 'badge-blue'   :
    prec === 'Approximate'  ? 'badge-indigo' :
    prec === 'Relative'     ? 'badge-slate'  :
    prec === 'Temporal Gap' ? 'badge-amber'  : 'badge-slate';
  return <span className={cls}>{prec}</span>;
}

/* ─── Main component ─────────────────────────────────────────────── */
export default function Chronology() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();

  const [timeline,   setTimeline]   = useState([]);
  const [alerts,     setAlerts]     = useState([]);
  const [depositMap, setDepositMap] = useState({});
  const [meta,       setMeta]       = useState({});
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [isReq,      setIsReq]      = useState(false);
  const [countdown,  setCountdown]  = useState(0);
  const [placements, setPlacements] = useState({});
  const [saving,     setSaving]     = useState(false);
  const [activeId,   setActiveId]   = useState(null);
  const [openMenu,   setOpenMenu]   = useState(null);
  const [middleTab,  setMiddleTab]  = useState('puzzle');
  const [isSharePanelOpen, setIsSharePanelOpen] = useState(false);

  const allMedia = useMemo(() => {
    const arr = [];
    Object.values(depositMap).forEach(d => {
      (d.attachments || []).forEach(a => {
        arr.push({ ...a, depositId: d.id, depositTag: d.tag, date: d.timestamp });
      });
    });
    return arr;
  }, [depositMap]);

  const anchored  = useMemo(() => timeline.filter(e => !e.isFloating), [timeline]);
  const floating  = useMemo(() => timeline.filter(e =>  e.isFloating), [timeline]);
  const unplaced  = useMemo(() => floating.filter(fev => !(makeFloatKey(fev) in placements)), [floating, placements]);
  const merged    = useMemo(() => buildMerged(anchored, floating, placements), [anchored, floating, placements]);
  const activeEv  = merged.find(e => e.id === activeId);
  const linkedDeps = useMemo(() => (activeEv?.sourceIds || []).map(s => depositMap[s]).filter(Boolean), [activeEv, depositMap]);

  /* ── Persist placements ───────────────────────────────── */
  const savePlacements = useCallback(async (next) => {
    setSaving(true);
    try {
      const payload = Object.entries(next).map(([floatingKey, insertAfterDate]) => ({ floatingKey, insertAfterDate }));
      await apiClient.put(`/api/cases/${encodeURIComponent(id)}/placements`, { placements: payload });
    } catch (e) { console.error('Placement save failed:', e); }
    finally { setSaving(false); }
  }, [id]);

  const placeEvent = useCallback(async (key, afterDate) => {
    const next = { ...placements, [key]: afterDate };
    setPlacements(next);
    setOpenMenu(null);
    await savePlacements(next);
  }, [placements, savePlacements]);

  const unplaceEvent = useCallback(async (key) => {
    const { [key]: _, ...rest } = placements;
    setPlacements(rest);
    await savePlacements(rest);
  }, [placements, savePlacements]);

  /* ── Process stitch data ──────────────────────────────── */
  const processData = useCallback((data) => {
    setDepositMap(data.deposits || {});
    setMeta(data.meta || {});
    setAlerts(data.forensicAlerts || []);
    const evs = (data.timeline || []).map((ev, i) => ({ ...ev, id: i, desc: ev.event }));
    setTimeline(evs);
    const saved = data.meta?.placements || [];
    if (saved.length) {
      const anchorDates = new Set(evs.filter(e => !e.isFloating).map(e => e.date));
      const restored = {};
      saved.forEach(({ floatingKey, insertAfterDate }) => {
        if (insertAfterDate === '__start__' || anchorDates.has(insertAfterDate))
          restored[floatingKey] = insertAfterDate;
      });
      setPlacements(restored);
    }
  }, []);

  /* ── Load / cache ─────────────────────────────────────── */
  const load = useCallback(async (force = false) => {
    if (isReq) return;
    if (!force) {
      const cached = sessionStorage.getItem(`prama_stitch_${id}`);
      if (cached) { processData(JSON.parse(cached)); setLoading(false); return; }
    }
    setIsReq(true); setLoading(true); setError(null);
    try {
      const endpoint = `/api/cases/${encodeURIComponent(id)}/stitch/generate${force ? '?force=true' : ''}`;
      const res = await apiClient.post(endpoint);
      sessionStorage.setItem(`prama_stitch_${id}`, JSON.stringify(res.data));
      processData(res.data);
    } catch (err) {
      const st = err.response?.status;
      if (st === 429) setCountdown(90);
      setError({ msg: err.response?.data?.error || err.message, st, isQuota: st === 429 });
    } finally { setIsReq(false); setLoading(false); }
  }, [id, isReq, processData]);

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);
  useEffect(() => {
    if (!openMenu) return;
    const h = (e) => { if (!e.target.closest('[data-placement-menu]')) setOpenMenu(null); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [openMenu]);

  /* ── PDF Export ───────────────────────────────────────── */
  const exportPDF = () => {
    const doc = new jsPDF();
    const name = (meta.clientName || id).toUpperCase();
    const hDate = meta.hearingDate
      ? new Date(meta.hearingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'To Be Determined';
    doc.setFont('times', 'bold'); doc.setFontSize(14);
    doc.text('STATEMENT OF FACTS', 105, 22, { align: 'center' });
    doc.setFontSize(11);
    doc.text(`IN THE MATTER OF: ${name}`, 105, 32, { align: 'center' });
    doc.setFont('times', 'normal'); doc.setFontSize(9);
    doc.text(`Case Reference: ${id}`, 105, 40, { align: 'center' });
    doc.text(`Hearing Date: ${hDate}`, 105, 46, { align: 'center' });
    doc.line(20, 52, 190, 52);
    let y = 60; doc.setFontSize(10);
    merged.forEach((ev, i) => {
      const label = ev.isPlaced ? ' [UNVERIFIED — PLACED BY COUNSEL]' : ev.isConflict ? ' [CONFLICT]' : '';
      const lines = doc.splitTextToSize(`${i + 1}. [${fmtDate(ev.date)}]${label}  ${ev.desc}`, 170);
      if (y + lines.length * 6 > 270) { doc.addPage(); y = 20; }
      doc.text(lines, 20, y); y += lines.length * 6 + 3;
    });
    if (unplaced.length) {
      if (y + 14 > 270) { doc.addPage(); y = 20; } y += 8;
      doc.setFont('times', 'bold'); doc.text('APPENDIX — UNANCHORED DEPOSITS', 20, y);
      doc.setFont('times', 'normal'); y += 7;
      unplaced.forEach((ev, i) => {
        const lines = doc.splitTextToSize(`${i + 1}. ${ev.desc}`, 170);
        if (y + lines.length * 6 > 270) { doc.addPage(); y = 20; }
        doc.text(lines, 20, y); y += lines.length * 6 + 3;
      });
    }

    if (y + 15 > 270) { doc.addPage(); y = 20; }
    y += 10;
    doc.setDrawColor(200);
    doc.line(20, y, 190, y);
    y += 8;
    doc.setFont("times", "bold");
    doc.setFontSize(8);
    doc.text("LANGUAGE CERTIFICATION", 20, y);
    y += 5;
    doc.setFont("times", "italic");
    const certText = "This document was prepared using Prama Legal Workspace. The capture interface was operated in Hindi to facilitate trauma-informed documentation. All legal output has been generated in English. Original memory deposits are preserved in their source language and are available for verification upon request.";
    const splitCert = doc.splitTextToSize(certText, 170);
    doc.text(splitCert, 20, y);

    doc.save(`${id}_Statement_of_Facts.pdf`);
  };

  /* ── Render ───────────────────────────────────────────── */
  return (
    <Shell>
      <style>{`
        /* ── Badge system ── */
        .badge-blue   { font-size:9px; font-weight:700; padding:2px 8px; border-radius:999px; text-transform:uppercase; letter-spacing:.06em; background:#DBEAFE; color:#1D4ED8; }
        .badge-indigo { font-size:9px; font-weight:700; padding:2px 8px; border-radius:999px; text-transform:uppercase; letter-spacing:.06em; background:#E0E7FF; color:#4338CA; }
        .badge-slate  { font-size:9px; font-weight:700; padding:2px 8px; border-radius:999px; text-transform:uppercase; letter-spacing:.06em; background:#F1F5F9; color:#475569; }
        .badge-amber  { font-size:9px; font-weight:700; padding:2px 8px; border-radius:999px; text-transform:uppercase; letter-spacing:.06em; background:#FEF3C7; color:#B45309; }
        .badge-red    { font-size:9px; font-weight:700; padding:2px 8px; border-radius:999px; text-transform:uppercase; letter-spacing:.06em; background:#FEE2E2; color:#B91C1C; }
        /* ── Btn system ── */
        .btn-ghost  { font-family:'Inter',sans-serif; font-size:11px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; padding:6px 14px; border-radius:6px; color:#64748b; border:1px solid #e2e8f0; background:transparent; cursor:pointer; transition:all .15s; }
        .btn-ghost:hover { background:#f8fafc; color:#1e293b; border-color:#cbd5e1; }
        .btn-ghost:disabled { opacity:.4; cursor:not-allowed; }
        .btn-primary { font-family:'Inter',sans-serif; font-size:11px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; padding:6px 16px; border-radius:6px; color:#fff; background:#5F9EA0; border:none; cursor:pointer; transition:all .15s; }
        .btn-primary:hover { background:#4f8e90; }
        .btn-primary:disabled { opacity:.4; cursor:not-allowed; }
        .btn-dark   { font-family:'Inter',sans-serif; font-size:11px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; padding:6px 16px; border-radius:6px; color:#fff; background:#8FBC8F; border:none; cursor:pointer; transition:all .15s; }
        .btn-dark:hover { background:#7AAB7A; }
        .btn-dark:disabled { opacity:.4; cursor:not-allowed; }
        .btn-amber  { font-family:'Inter',sans-serif; font-size:10px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; padding:5px 12px; border-radius:6px; color:#fff; background:#B45309; border:none; cursor:pointer; transition:all .15s; width:100%; }
        .btn-amber:hover { background:#92400e; }
      `}</style>

      <div className="flex flex-col flex-1 w-full bg-cream overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

        {/* ── Top bar ─────────────────────────────────────── */}
        <div className="px-5 py-2.5 border-b border-border bg-card-bg flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted font-mono hidden sm:inline truncate max-w-[180px]">{id}</span>
            <span className="text-border hidden sm:inline">·</span>
            <div className="bg-[#F0F0EC] p-0.5 rounded-md flex">
              <button className="text-[11px] px-3 py-1 rounded bg-white text-slate font-semibold shadow-sm">{t('chronology_tab', 'Chronology')}</button>
              <button
                onClick={() => navigate(`/case/${encodeURIComponent(id)}/narrative`)}
                className="text-[11px] px-3 py-1 rounded text-muted hover:text-slate font-medium transition-colors">
                {t('narrative_tab', 'Narrative')}
              </button>
            </div>
            {saving && <span className="text-[10px] text-muted italic">{t('saving', 'Saving…')}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost" disabled={isReq}
              onClick={() => {
                if (window.confirm(t('resynthesize_confirm', 'Re-synthesise will re-run the AI analysis.'))) {
                  sessionStorage.removeItem(`prama_stitch_${id}`);
                  load(true);
                }
              }}>
              {t('resynthesize', '↺ Re-synthesise')}
            </button>
            <button className="btn-primary" onClick={() => navigate(`/case/${encodeURIComponent(id)}/session`)}>
              {t('add_deposit', '+ Add Deposit')}
            </button>
            <button className="btn-ghost" onClick={() => setIsSharePanelOpen(true)}>
              {t('share_case', '🔗 Share')}
            </button>
            <button className="btn-dark" disabled={loading || merged.length === 0} onClick={exportPDF}>
              {t('export_affidavit', 'Export Affidavit')}
            </button>
          </div>
        </div>

        {/* ── Three columns ───────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ─── LEFT: Anchored Timeline ──────────────────── */}
          <div className="flex-1 overflow-y-auto border-r border-border min-w-0">
            <div className="max-w-xl mx-auto px-6 md:px-8 py-8">

              {/* Section heading */}
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h2 className={`text-xl font-bold text-slate tracking-tight ${lang === 'hi' ? 'font-sans text-2xl' : ''}`} style={{ fontFamily: lang === 'hi' ? 'Inter, sans-serif' : "'Playfair Display', serif" }}>
                    {t('event_chronology', 'Event Chronology')}
                  </h2>
                  {!loading && (
                    <p className="text-[11px] text-muted mt-0.5">
                      {anchored.length} {t('anchored', 'anchored')} · {Object.keys(placements).length} {t('placed', 'placed')} · {unplaced.length} {t('unanchored', 'unanchored')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted uppercase tracking-wider">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"/>{t('verified', 'Verified')}
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted uppercase tracking-wider">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"/>{t('conflict', 'Conflict')}
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted uppercase tracking-wider">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"/>{t('gap', 'Gap')}
                  </span>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className={`mb-6 p-4 rounded-xl border ${error.isQuota ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                  <p className={`text-sm font-bold mb-1 ${error.isQuota ? 'text-amber-800' : 'text-red-800'}`}>
                    {error.isQuota ? '⏳ Rate Limited' : '❌ Error'}
                  </p>
                  <p className="text-xs text-muted mb-3">{error.msg}</p>
                  <button className="btn-primary" onClick={() => { setCountdown(0); load(true); }} disabled={isReq}>
                    {countdown > 0 ? `Retry Now (Wait ${countdown}s)` : '↺ Retry'}
                  </button>
                </div>
              )}

              {/* Loading */}
              {loading && (
                <div className="flex flex-col items-center py-28 gap-5">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
                  <p className="text-slate text-sm font-medium">
                    Running Prama Narrative Architect…
                  </p>
                </div>
              )}

              {/* Empty */}
              {!loading && !error && merged.length === 0 && (
                <p className="text-center py-20 text-muted text-sm">{t('no_events', 'No events synthesised. Record deposits first.')}</p>
              )}

              {/* Timeline */}
              {!loading && merged.length > 0 && (
                <div className="relative mb-10">
                  {merged.map((ev, idx) => {
                    const sel      = activeId === ev.id;
                    const conflict = ev.isConflict;
                    const placed   = ev.isPlaced;

                    const dotBg = conflict ? '#EF4444' : placed ? '#F59E0B' : '#3B82F6';
                    const cardBg = conflict
                      ? 'border-red-200 bg-red-50/20 hover:border-red-300'
                      : placed
                      ? 'border-amber-200 bg-amber-50/30 hover:border-amber-400'
                      : sel
                      ? 'border-blue-400 bg-white shadow-md'
                      : 'border-border bg-card-bg hover:border-blue-300 hover:shadow-sm';

                    return (
                      <div key={`${ev.id}-${idx}`} className="relative flex gap-3 pb-7 group cursor-pointer"
                        onClick={() => setActiveId(sel ? null : ev.id)}>

                        {/* Spine segment */}
                        {idx !== merged.length - 1 && (
                          <div className="absolute left-[21px] top-6 w-px bg-border bottom-0" />
                        )}

                        {/* Dot — centered on spine */}
                        <div className="flex flex-col items-center shrink-0 pt-4 w-5 pl-2">
                          <div
                            className="w-3 h-3 rounded-full z-10 shrink-0 transition-transform group-hover:scale-125"
                            style={{
                              backgroundColor: dotBg,
                              boxShadow: `0 0 0 2px white, 0 0 0 4px ${dotBg}55`,
                            }}
                          />
                        </div>

                        {/* Card */}
                        <div className={`flex-1 rounded-xl border transition-all p-4 relative overflow-hidden ${cardBg}`}>
                          {/* Left accent bar for conflict/placed */}
                          {conflict && <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-red-400"/>}
                          {placed   && !conflict && <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-amber-400"/>}

                          {/* Date + badges row */}
                          <div className="flex items-center justify-between mb-2.5 gap-2 flex-wrap pl-1">
                            <span className="font-mono text-[11px] text-muted font-semibold tracking-wide">
                              {fmtDate(ev.date)}
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* ONE badge only — conflict > placed > precision */}
                              {conflict
                                ? <span className="badge-red" style={{ fontWeight: 800 }}>⚠ CONFLICT</span>
                                : placed
                                ? <span className="badge-amber">PLACED</span>
                                : <PrecisionBadge prec={ev.timePrecision} isPlaced={false} isConflict={false}/>}
                            </div>
                            <div className="flex gap-1 ml-auto">
                              {Array.from(new Set((ev.sourceIds || []).map(sid => depositMap[sid]?.tag).filter(Boolean))).map(tag => (
                                <span key={tag} className="text-muted opacity-70" title={tag}>
                                  {tag === 'Visual' ? <Eye size={12} strokeWidth={1.5}/> :
                                   tag === 'Auditory' ? <Ear size={12} strokeWidth={1.5}/> :
                                   tag === 'Olfactory' ? <Wind size={12} strokeWidth={1.5}/> :
                                   tag === 'Somatic' ? <Activity size={12} strokeWidth={1.5}/> :
                                   <FileText size={12} strokeWidth={1.5}/>}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Event text */}
                          <p className="text-[14px] font-semibold text-slate leading-[1.75] pl-1">
                            {ev.desc}
                          </p>

                          {placed && (
                            <div className="mt-3 flex items-center gap-3 pl-1">
                              <span className="text-[10px] text-amber-600 italic">{t('tentative_placed', 'Tentatively placed — timing unconfirmed.')}</span>
                              <button
                                className="text-[10px] font-bold text-amber-700 hover:text-red-600 uppercase tracking-wide border border-amber-300 hover:border-red-300 rounded-lg px-2 py-0.5 transition-colors shrink-0"
                                onClick={(e) => { e.stopPropagation(); unplaceEvent(ev.floatKey); }}>
                                {t('remove_btn', '✕ Remove')}
                              </button>
                            </div>
                          )}
                          {ev.sourceIds?.length > 0 && (
                            <div className="mt-2 pl-1">
                              <button
                                className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                                  sel ? 'bg-[#8FBC8F] text-white border-[#8FBC8F]' : 'bg-gray-50 text-slate hover:bg-gray-100 border-border'
                                }`}
                                onClick={(e) => { e.stopPropagation(); setActiveId(sel ? null : ev.id); }}>
                                <Link size={11} /> {ev.sourceIds.length} {t('source_label', 'Source')}{ev.sourceIds.length > 1 && lang !== 'hi' ? 's' : ''}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ─── MIDDLE: Unanchored Evidence & Media ──────────────── */}
          <div className="w-[300px] border-r border-border flex flex-col shrink-0 hidden md:flex" style={{ background: '#FEFBF3' }}>
            <div className="px-4 py-4 border-b border-amber-100 shrink-0" style={{ background: '#FDF6E3' }}>
              <div className="flex bg-[#F6D860]/30 p-1 rounded-lg mb-3">
                <button onClick={() => setMiddleTab('puzzle')} className={`flex-1 text-[11px] font-bold py-1.5 rounded-md transition-colors ${middleTab === 'puzzle' ? 'bg-white text-[#92400E] shadow-sm border border-amber-200' : 'text-amber-700 hover:bg-amber-50/50'}`}>Unanchored</button>
                <button onClick={() => setMiddleTab('media')} className={`flex-1 text-[11px] font-bold py-1.5 rounded-md transition-colors ${middleTab === 'media' ? 'bg-white text-[#92400E] shadow-sm border border-amber-200' : 'text-amber-700 hover:bg-amber-50/50'}`}>Media ({allMedia.length})</button>
              </div>
              <p className="text-[15px] font-bold text-slate">
                {middleTab === 'puzzle' ? (loading ? '…' : unplaced.length === 0 && floating.length > 0 ? 'All Placed ✓' : `${unplaced.length} Unanchored`) : 'Case Media Evidence'}
              </p>
              <p className="text-[11px] text-amber-700/80 mt-1 leading-snug">
                {middleTab === 'puzzle' ? 'Place these into the timeline when you feel they fit.' : 'Evidence attachments from all deposits.'}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {middleTab === 'media' ? (
                <div className="grid grid-cols-2 gap-2">
                  {allMedia.length === 0 && !loading && <div className="col-span-2 text-center py-6 text-amber-700 text-[11px]">No media attached to deposits.</div>}
                  {allMedia.map((m, i) => (
                    <div key={i} className="border border-amber-200 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col">
                      {m.mimeType?.startsWith('image/') ? (
                        <a href={m.url} target="_blank" rel="noopener noreferrer" className="flex-1">
                          <img src={m.url} alt={m.originalName} className="w-full h-24 object-cover hover:opacity-90 transition"/>
                        </a>
                      ) : (
                        <a href={m.url} target="_blank" rel="noopener noreferrer" className="flex-1 flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                          <span className="text-2xl mb-1">📄</span>
                          <span className="text-[9px] text-blue-600 font-medium truncate w-full text-center">{m.originalName}</span>
                        </a>
                      )}
                      <div className="p-2 border-t border-amber-100 bg-amber-50">
                        <p className="text-[10px] font-semibold text-slate truncate" title={m.originalName}>{m.originalName}</p>
                        <p className="text-[9px] text-muted flex justify-between mt-0.5">
                           <span>{m.depositTag}</span> <span>{new Date(m.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {loading && <p className="text-[11px] text-muted text-center py-10">Loading…</p>}
                  {!loading && floating.length === 0 && <p className="text-[11px] text-muted text-center py-8">No unanchored deposits</p>}
                  {!loading && unplaced.length === 0 && floating.length > 0 && (
                    <div className="text-[11px] text-muted text-center py-8 border-2 border-dashed border-blue-200 rounded-xl bg-blue-50/40">
                      🎯 All evidence placed
                    </div>
                  )}

                  {unplaced.filter(fev => !(fev.sourceIds?.some(sid => depositMap[sid]?.attachments?.length > 0) && fev.desc.length < 50 && /picture|photo|image|video|attached|file/i.test(fev.desc))).map((fev, idx) => {
                    const key    = makeFloatKey(fev);
                const isOpen = openMenu === key;
                const fImages = (fev.sourceIds || []).flatMap(sid => depositMap[sid]?.attachments || []).filter(a => a.mimeType?.startsWith('image/'));
                return (
                  <div key={idx}
                       className="rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md"
                       style={{ border: '1.5px solid #F6D860', background: 'linear-gradient(135deg, #FFFBEA 0%, #FFF8E1 100%)' }}>

                    {/* Image strip removed in favour of Media tab */}

                    <div className="p-3.5">
                      {/* Tag row */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"/>
                        <span className="text-[9px] font-bold text-amber-700 uppercase tracking-widest">Unanchored</span>
                        {fev.sourceIds?.length > 0 && (
                          <span className="text-[9px] text-amber-600 ml-auto">{fev.sourceIds.length} source{fev.sourceIds.length > 1 ? 's' : ''}</span>
                        )}
                      </div>

                      {/* Memory text */}
                      <p className="text-[13px] text-slate leading-relaxed mb-2.5 font-medium">
                        {fev.desc}
                      </p>

                      {fev.reasonForGapping && (
                        <p className="text-[10px] text-amber-700/80 italic mb-2.5 leading-snug">{fev.reasonForGapping}</p>
                      )}

                      {/* Place button */}
                      <div className="relative" data-placement-menu>
                        <button
                          className="w-full text-[11px] font-bold uppercase tracking-wider py-2 px-3 rounded-xl transition-all"
                          style={{ background: isOpen ? '#F59E0B' : '#FDE68A', color: '#92400E', border: '1.5px solid #F6D860' }}
                          onClick={() => setOpenMenu(isOpen ? null : key)}>
                          {isOpen ? '▲ Cancel' : '→ Place in Timeline'}
                        </button>
                        {isOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden">
                            <p className="text-[9px] text-muted font-bold px-3 py-2.5 border-b border-slate-100 uppercase tracking-widest bg-slate-50">
                              Insert after:
                            </p>
                            <div className="max-h-52 overflow-y-auto">
                              <button
                                onClick={() => placeEvent(key, '__start__')}
                                className="w-full text-left px-3 py-3 hover:bg-blue-50 transition-colors border-b border-slate-100 text-[11px] font-semibold text-blue-600">
                                ⬆ Beginning of timeline
                              </button>
                              {anchored.map((av, i) => (
                                <button key={i}
                                  onClick={() => placeEvent(key, av.date)}
                                  className="w-full text-left px-3 py-2.5 hover:bg-amber-50 transition-colors border-b border-slate-100 last:border-0">
                                  <span className="font-mono text-[9px] text-amber-600 block mb-0.5">{fmtDate(av.date)}</span>
                                  <span className="text-[11px] text-slate leading-snug">
                                    {(av.desc || '').slice(0, 50)}{(av.desc || '').length > 50 ? '…' : ''}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

          {/* ─── RIGHT: Source Trace ──────────────────────── */}
          <div className="w-[265px] flex flex-col shrink-0 hidden lg:flex bg-card-bg border-l border-border">
            <div className="px-4 py-3 border-b border-border bg-card-bg/80 backdrop-blur-sm shrink-0">
              <p className="text-[9px] text-muted uppercase font-bold tracking-widest mb-0.5">Source Trace</p>
              <p className="text-[15px] font-bold text-slate flex items-center gap-1.5">
                {activeEv ? 'Memory Deposits' : <><ShieldCheck size={16} className="text-muted"/> Case Forensics</>}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Forensic alerts when no event selected */}
              {!activeEv && alerts.length > 0 && (
                <div>
                  <p className="text-[9px] text-muted font-bold uppercase tracking-widest mb-2">
                    Forensic Alerts ({alerts.length})
                  </p>
                  {alerts.map((a, i) => (
                    <div key={i} className="bg-red-50 border border-red-100 rounded-lg p-3 mb-2">
                      <p className="text-[9px] text-red-500 font-bold uppercase tracking-wider mb-1">{a.type}</p>
                      <p className="text-[11px] text-red-800 leading-relaxed">{a.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {!activeEv && (
                <div className="text-[11px] text-muted text-center py-10 border border-dashed border-border rounded-xl opacity-60">
                  Click any event to trace its source deposits
                </div>
              )}

              {activeEv && (
                <>
                  <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
                    <p className="text-[12px] font-semibold text-slate leading-snug mb-1">
                      {activeEv.desc}
                    </p>
                    <span className="font-mono text-[10px] text-muted">{fmtDate(activeEv.date)}</span>
                  </div>

                  {linkedDeps.length === 0
                    ? <div className="text-[11px] text-muted text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">No exact source match</div>
                    : linkedDeps.map((dep, i) => {
                        const c = SENSORY[dep.tag] || SENSORY.General;
                        // collect images from this deposit
                        const images = (dep.attachments || []).filter(a => a.mimeType?.startsWith('image/'));
                        const docs   = (dep.attachments || []).filter(a => !a.mimeType?.startsWith('image/'));
                        return (
                          <div key={i} className="rounded-lg border overflow-hidden" style={{ borderColor: c.border }}>
                            {/* Images first — prominent */}
                            {images.length > 0 && (
                              <div className="grid gap-0.5" style={{ gridTemplateColumns: images.length === 1 ? '1fr' : '1fr 1fr' }}>
                                {images.map((img, j) => (
                                  <a key={j} href={img.url} target="_blank" rel="noopener noreferrer">
                                    <img src={img.url} alt={img.originalName}
                                         className="w-full object-cover hover:opacity-90 transition"
                                         style={{ maxHeight: images.length === 1 ? 140 : 80 }}/>
                                  </a>
                                ))}
                              </div>
                            )}
                            <div className="p-3" style={{ backgroundColor: c.bg }}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.dot }}/>
                                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: c.text }}>{dep.tag}</span>
                                  <span className="text-[9px] text-muted">· S{dep.session}</span>
                                </div>
                                {dep.timestamp && (
                                  <span className="font-mono text-[9px] opacity-60" style={{ color: c.text }}>
                                    {new Date(dep.timestamp).toLocaleDateString('en-GB', { day:'2-digit', month:'short' })}
                                  </span>
                                )}
                              </div>
                              <p className="text-[12px] text-slate leading-relaxed font-medium">
                                "{dep.text}"
                              </p>
                              {/* Non-image attachments */}
                              {docs.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {docs.map((d, j) => (
                                    <a key={j} href={d.url} target="_blank" rel="noopener noreferrer"
                                       className="text-[9px] text-blue-600 underline">📄 {d.originalName}</a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                  }

                  {activeEv.isConflict && activeEv.conflictDetails && (
                    <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                      <p className="text-[9px] text-red-600 font-bold uppercase tracking-wider mb-1">⚠ Conflict Analysis</p>
                      <p className="text-[11px] text-red-800 leading-relaxed">
                        {typeof activeEv.conflictDetails === 'object' ? activeEv.conflictDetails.conflictingEvent : activeEv.conflictDetails}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer stats */}
            {!loading && meta.totalDeposits > 0 && (
              <div className="border-t border-border p-3 bg-card-bg/60 shrink-0">
                <div className="grid grid-cols-3 gap-1 text-center">
                  {[['Anchored', anchored.length], ['Placed', Object.keys(placements).length], ['Deposits', meta.totalDeposits]].map(([l, v]) => (
                    <div key={l}>
                      <div className="text-sm font-bold text-slate">{v}</div>
                      <div className="text-[9px] text-muted uppercase tracking-wide font-semibold">{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <SharePanel isOpen={isSharePanelOpen} onClose={() => setIsSharePanelOpen(false)} caseId={id} />
    </Shell>
  );
}
