import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api';
import Shell from '../components/Shell';

const makeFloatKey = (ev) =>
  ev.sourceIds?.length > 0 ? [...ev.sourceIds].sort().join('|') : (ev.desc || '').slice(0, 60);

const buildMerged = (anchored, floating, placements) => {
  const result = [];
  floating.forEach(fev => {
    if (placements[makeFloatKey(fev)] === '__start__')
      result.push({ ...fev, isPlaced: true });
  });
  anchored.forEach(ev => {
    result.push(ev);
    floating.forEach(fev => {
      const key = makeFloatKey(fev);
      if (placements[key] === ev.date)
        result.push({ ...fev, isPlaced: true });
    });
  });
  return result;
};

export default function Narrative() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [narrative,  setNarrative]  = useState('');
  const [truncated,  setTruncated]  = useState(false);
  const [meta,       setMeta]       = useState({});
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [isReq,      setIsReq]      = useState(false);
  const [countdown,  setCountdown]  = useState(0);

  /* Restore state from stitch cache + placements from case */
  const getTimelineFromCache = useCallback(() => {
    const cached = sessionStorage.getItem(`prama_stitch_${id}`);
    if (!cached) return null;
    const data = JSON.parse(cached);
    const evs = (data.timeline || []).map((ev, i) => ({ ...ev, id: i, desc: ev.event }));
    const anchored   = evs.filter(e => !e.isFloating);
    const floating   = evs.filter(e =>  e.isFloating);
    const savedPl    = data.meta?.placements || [];
    const anchorDates = new Set(anchored.map(e => e.date));
    const placements = {};
    savedPl.forEach(({ floatingKey, insertAfterDate }) => {
      if (insertAfterDate === '__start__' || anchorDates.has(insertAfterDate))
        placements[floatingKey] = insertAfterDate;
    });
    const merged   = buildMerged(anchored, floating, placements);
    const unplaced = floating.filter(fev => !(makeFloatKey(fev) in placements));
    return { merged, unplaced, meta: data.meta || {} };
  }, [id]);

  const loadNarrative = useCallback(async (force = false) => {
    if (isReq) return;

    // Check narrative cache
    const narrativeCacheKey = `prama_narrative_${id}`;
    if (!force) {
      const cached = sessionStorage.getItem(narrativeCacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        setNarrative(parsed.narrative);
        setTruncated(parsed.truncated || false);
        setMeta(parsed.meta || {});
        setLoading(false);
        return;
      }
    }

    setIsReq(true); setLoading(true); setError(null);

    // Get timeline from stitch cache or fetch stitch first
    let timelineData = getTimelineFromCache();
    if (!timelineData) {
      try {
        const res = await apiClient.post(`/api/cases/${encodeURIComponent(id)}/stitch/generate`);
        sessionStorage.setItem(`prama_stitch_${id}`, JSON.stringify(res.data));
        timelineData = getTimelineFromCache();
      } catch (err) {
        const st = err.response?.status;
        if (st === 429) setCountdown(90);
        setError({ msg: err.response?.data?.error || err.message, isQuota: st === 429 });
        setIsReq(false); setLoading(false);
        return;
      }
    }

    const { merged, unplaced, meta: stitchMeta } = timelineData;
    setMeta(stitchMeta);

    try {
      const res = await apiClient.post(`/api/cases/${encodeURIComponent(id)}/stitch/narrative`, {
        mergedTimeline:  merged,
        unplacedFloating: unplaced,
        clientName:  stitchMeta.clientName,
        hearingDate: stitchMeta.hearingDate,
        baseLayer:   stitchMeta.baseLayer,
      });
      setNarrative(res.data.narrative);
      setTruncated(res.data.truncated || false);
      // Cache the narrative
      sessionStorage.setItem(narrativeCacheKey, JSON.stringify({
        narrative: res.data.narrative,
        truncated: res.data.truncated,
        meta: stitchMeta,
      }));
    } catch (err) {
      const st = err.response?.status;
      if (st === 429) setCountdown(90);
      setError({ msg: err.response?.data?.error || err.message, isQuota: st === 429 });
    } finally {
      setIsReq(false); setLoading(false);
    }
  }, [id, isReq, getTimelineFromCache]);

  useEffect(() => { loadNarrative(); }, [id]);
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const clientName  = meta.clientName  || id;
  const hearingDate = meta.hearingDate
    ? new Date(meta.hearingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  // Parse narrative into paragraphs
  const paragraphs = useMemo(() => {
    if (!narrative) return [];
    return narrative.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  }, [narrative]);

  // Rich text: bold dates on new lines, red uncertainty phrases
  const renderRichParagraph = (text) => {
    // Matches: "25 November 2025", "Nov 25, 2025", "mid-December 2025", "Christmas 2025", plain month names
    const DATE_RE = /\b((?:early\s+|mid-|late\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s*\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s*\d{4}|(?:early\s+|mid-|late\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December)(?:\s+\d{4})?|(?:Thanksgiving|Christmas|New\s+Year'?s?)(?:\s+\d{4})?)\b/gi;
    // Matches uncertainty language
    const UNCERTAIN_RE = /\b(approximately|around|estimated|unknown|unconfirmed|inferred|unclear|believed to be|likely|probably|uncertain|cannot be confirmed|could not be placed|exact timing[^)]*?\)|impossible to determine|insufficient evidence|unable to confirm)\b/gi;

    // Build a combined segment list
    const tokens = [];
    let working = text;
    let offset = 0;

    // Run both regexes and collect all matches with positions
    const matches = [];
    let m;
    const dateRe = new RegExp(DATE_RE.source, 'gi');
    const uncertRe = new RegExp(UNCERTAIN_RE.source, 'gi');
    while ((m = dateRe.exec(text)) !== null) matches.push({ start: m.index, end: m.index + m[0].length, text: m[0], type: 'date' });
    while ((m = uncertRe.exec(text)) !== null) matches.push({ start: m.index, end: m.index + m[0].length, text: m[0], type: 'uncertain' });

    // Sort by position, remove overlaps
    matches.sort((a, b) => a.start - b.start);
    const filtered = [];
    let cursor = 0;
    for (const match of matches) {
      if (match.start >= cursor) { filtered.push(match); cursor = match.end; }
    }

    // Build segments
    let pos = 0;
    const segments = [];
    for (const match of filtered) {
      if (match.start > pos) segments.push({ type: 'text', content: text.slice(pos, match.start) });
      segments.push({ type: match.type, content: match.text });
      pos = match.end;
    }
    if (pos < text.length) segments.push({ type: 'text', content: text.slice(pos) });

    // Render
    return segments.map((seg, i) => {
      if (seg.type === 'date') {
        const isFirst = i === 0;
        return (
          <React.Fragment key={i}>
            {!isFirst && <><br/><br/></>}
            <strong className="font-bold text-slate">{seg.content}</strong>
          </React.Fragment>
        );
      }
      if (seg.type === 'uncertain') {
        return <span key={i} className="text-red-600 font-semibold">{seg.content}</span>;
      }
      return <span key={i}>{seg.content}</span>;
    });
  };

  return (
    <Shell>
      <div className="flex flex-col flex-1 w-full bg-cream overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

        {/* Top bar */}
        <div className="px-5 py-2.5 border-b border-border bg-card-bg flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted font-mono hidden sm:inline truncate max-w-[180px]">{id}</span>
            <span className="text-border hidden sm:inline">·</span>
            <div className="bg-[#F0F0EC] p-0.5 rounded-md flex">
              <button
                onClick={() => navigate(`/case/${encodeURIComponent(id)}/chronology`)}
                className="text-[11px] px-3 py-1 rounded text-muted hover:text-slate font-medium transition-colors">
                Chronology
              </button>
              <button className="text-[11px] px-3 py-1 rounded bg-white text-slate font-semibold shadow-sm">
                Narrative
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              style={{ fontFamily:"'Inter',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'.04em', textTransform:'uppercase', padding:'6px 14px', borderRadius:'6px', color:'#64748b', border:'1px solid #e2e8f0', background:'transparent', cursor:'pointer' }}
              disabled={isReq}
              onClick={() => {
                if (window.confirm('Regenerate the narrative?\n\nThis will re-call the AI to rewrite the story based on your current timeline.')) {
                  sessionStorage.removeItem(`prama_narrative_${id}`);
                  loadNarrative(true);
                }
              }}>
              ↺ Regenerate
            </button>
            <button
              style={{ fontFamily:"'Inter',sans-serif", fontSize:'11px', fontWeight:700, letterSpacing:'.05em', textTransform:'uppercase', padding:'6px 16px', borderRadius:'6px', color:'#fff', background:'#3B4F8C', border:'none', cursor:'pointer' }}
              onClick={() => navigate(`/case/${encodeURIComponent(id)}/session`)}>
              + Add Deposit
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 md:px-10 py-12">

            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center py-36 gap-5">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
                <p className="text-slate text-base font-medium">
                  Writing legal narrative…
                </p>
                <p className="text-xs text-muted">The AI is composing the full story of this case</p>
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div className={`mb-8 p-4 rounded-xl border ${error.isQuota ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                <p className={`text-sm font-bold mb-2 ${error.isQuota ? 'text-amber-800' : 'text-red-800'}`}>
                  {error.isQuota ? '⏳ Rate Limited' : '❌ Error'}
                </p>
                <p className="text-xs text-muted mb-3">{error.msg}</p>
                <button
                  style={{ fontSize:'11px', fontWeight:700, letterSpacing:'.05em', textTransform:'uppercase', padding:'6px 16px', borderRadius:'6px', color:'#fff', background:'#3B4F8C', border:'none', cursor:'pointer' }}
                  onClick={() => loadNarrative(true)} disabled={isReq || countdown > 0}>
                  {countdown > 0 ? `Wait ${countdown}s…` : '↺ Retry'}
                </button>
              </div>
            )}

            {!loading && !error && narrative && (
              <>
                {/* ── Legal Document Header ── */}
                <div className="text-center mb-12 pb-8 border-b-2 border-slate/15">
                  <div className="text-[10px] tracking-[0.35em] text-muted uppercase font-semibold mb-4">
                    Prama Legal Workspace
                  </div>
                  <h1 className="text-3xl font-bold text-slate mb-3 leading-tight">
                    Statement of Facts
                  </h1>
                  <p className="text-lg text-slate/80 font-medium mb-5">
                    In the Matter of: <span className="font-bold text-slate">{clientName}</span>
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-muted">
                    <span className="font-mono">Case Ref: {id}</span>
                    {hearingDate && (
                      <>
                        <span className="text-border">·</span>
                        <span className="font-mono">Hearing: {hearingDate}</span>
                      </>
                    )}
                  </div>
                  {truncated && (
                    <div className="mt-4 inline-block text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 font-semibold">
                      ⚠ Timeline was abbreviated due to length — some later events may not appear in this narrative
                    </div>
                  )}
                </div>

                {/* ── Narrative prose ── */}
                <div className="space-y-6">
                  {paragraphs.map((para, i) => {
                    // Detect gap / unanchored markers in the text
                    const isGap = para.toLowerCase().includes('record is silent') ||
                                  para.toLowerCase().includes('could not be placed') ||
                                  para.toLowerCase().includes('gap');
                    const isConflict = para.toLowerCase().includes('conflicting accounts');
                    const isUnverified = para.toLowerCase().includes('exact timing') ||
                                        para.toLowerCase().includes('unconfirmed');
                    const isHeader = para === 'STATEMENT OF FACTS';

                    if (isHeader) return null; // already shown in the legal header above

                    if (isGap) {
                      return (
                        <div key={i} className="rounded-xl border-2 border-dashed border-red-300 bg-red-50/60 p-5 relative overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-400"/>
                          <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest mb-3 pl-2">◆ Temporal Gap</p>
                          <p className="text-[15px] text-red-900 leading-[1.9] pl-2 font-medium">
                            {renderRichParagraph(para)}
                          </p>
                        </div>
                      );
                    }

                    if (isConflict) {
                      return (
                        <div key={i} className="rounded-xl border border-red-200 bg-red-50/30 p-5">
                          <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest mb-3">⚠ Conflict</p>
                          <p className="text-[15px] text-slate leading-[1.9] font-medium">
                            {renderRichParagraph(para)}
                          </p>
                        </div>
                      );
                    }

                    if (isUnverified) {
                      return (
                        <div key={i} className="rounded-xl border border-amber-200 bg-amber-50/40 p-5">
                          <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-3">Placed — Unverified</p>
                          <p className="text-[15px] text-slate leading-[1.9] italic font-medium">
                            {renderRichParagraph(para)}
                          </p>
                        </div>
                      );
                    }

                    // Normal paragraph
                    return (
                      <p key={i}
                         className="text-[16px] text-slate leading-[1.95] text-justify font-medium">
                        {renderRichParagraph(para)}
                      </p>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="mt-14 pt-8 border-t-2 border-slate/10 text-center space-y-3">
                  <p className="font-mono text-[11px] text-muted tracking-widest uppercase">
                    End of Narrative Record
                  </p>
                  <button
                    onClick={() => navigate(`/case/${encodeURIComponent(id)}/chronology`)}
                    className="text-[11px] font-semibold text-primary hover:text-primary-dark underline underline-offset-2 transition-colors">
                    ← Return to Chronology Puzzle View
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
