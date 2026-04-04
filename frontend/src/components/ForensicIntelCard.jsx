import React from 'react';
import { useLanguage } from '../i18n';

/**
 * ForensicIntelCard
 * Props:
 *   intel         – { dates, names, locations, incident_keywords, summary }
 *   matchedDeposit – { text, date } | null
 *   onAccept      – () => void  (user wants to link this)
 *   onDismiss     – () => void  (user dismisses)
 */
export default function ForensicIntelCard({ intel, matchedDeposit, onAccept, onDismiss }) {
  const { t } = useLanguage();

  if (!intel) return null;

  return (
    <div
      className="mb-3 rounded-xl border overflow-hidden shadow-md animate-slideUp"
      style={{
        background: 'linear-gradient(135deg, #1e2a4a 0%, #2d3a5e 100%)',
        borderColor: '#3d4f7a',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(99,179,237,0.15)', color: '#63B3ED' }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: '#63B3ED' }}
            />
            {t('forensic_ai_label', '🔍 Forensic AI')}
          </span>
          <span className="text-[11px] text-blue-200/70">
            {t('forensic_found', 'Evidence extracted from your upload')}
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="text-white/40 hover:text-white/80 text-lg leading-none transition-colors"
          title={t('forensic_dismiss', 'Dismiss')}
        >
          ×
        </button>
      </div>

      {/* Summary */}
      <div className="px-4 py-3">
        <p className="text-[13px] text-blue-100 leading-relaxed mb-3">
          {intel.summary}
        </p>

        {/* Extracted tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {intel.dates?.map((d, i) => (
            <span key={`d-${i}`} className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: 'rgba(72,187,120,0.18)', color: '#68D391' }}>
              📅 {d}
            </span>
          ))}
          {intel.names?.map((n, i) => (
            <span key={`n-${i}`} className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: 'rgba(246,173,85,0.18)', color: '#F6AD55' }}>
              👤 {n}
            </span>
          ))}
          {intel.locations?.map((l, i) => (
            <span key={`l-${i}`} className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: 'rgba(183,148,246,0.18)', color: '#B794F4' }}>
              📍 {l}
            </span>
          ))}
          {intel.incident_keywords?.slice(0, 3).map((k, i) => (
            <span key={`k-${i}`} className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: 'rgba(252,129,74,0.18)', color: '#FC814A' }}>
              ⚡ {k}
            </span>
          ))}
        </div>

        {/* Matched deposit suggestion */}
        {matchedDeposit && (
          <div
            className="mb-3 px-3 py-2 rounded-lg text-[11px] text-amber-200 border"
            style={{ background: 'rgba(251,191,36,0.08)', borderColor: 'rgba(251,191,36,0.2)' }}
          >
            🔗 {t('forensic_match', 'This matches your memory')}: &ldquo;{matchedDeposit.text.slice(0, 80)}…&rdquo;
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={onAccept}
            className="flex-1 py-2 rounded-lg text-[12px] font-bold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #3182ce, #2b6cb0)' }}
          >
            ✓ {t('forensic_accept', 'Yes, add this to my memory')}
          </button>
          <button
            onClick={onDismiss}
            className="px-4 py-2 rounded-lg text-[12px] font-semibold text-blue-300 border border-blue-800 hover:bg-white/5 transition-all"
          >
            {t('forensic_dismiss', 'Dismiss')}
          </button>
        </div>
      </div>
    </div>
  );
}
