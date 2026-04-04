import React, { useState } from 'react';

const SLIDES = [
  {
    tag: 'Survivor Story',
    title: "Jane's Courage",
    body: 'After 18 months of intimidation, Jane felt overwhelmed. The legal timeline, completely reconstructed from her scattered texts and memories, secured an immediate protection order.',
    cite: 'Case resolved: 4 days after synthesis.',
    bg: '#EEF2FF', accent: '#4338CA',
  },
  {
    tag: 'Survivor Story',
    title: "David's Stand",
    body: 'Male survivors often face unique stigma. By organizing 2 years of erratic workplace emails and isolated incidents, Prama helped secure a decisive legal settlement.',
    cite: 'Case resolved: 2 weeks after initial deposit.',
    bg: '#FFF7ED', accent: '#C2410C',
  },
  {
    tag: 'Survivor Story',
    title: "Aisha's Journey",
    body: 'Following 3 years of coercive control, Aisha struggled with memory sequence. Prama pieced together over 400 isolated sensory fragments into a seamless, court-ready 30-page affidavit.',
    cite: 'Case resolved: Full custody granted.',
    bg: '#F0FDF4', accent: '#166534',
  },
  {
    tag: 'Logistics Data',
    title: 'Platform Intelligence',
    body: 'Prama has successfully processed over 14,500 unstructured abusive messages and disjointed memories, mapping them into precise chronological evidence.',
    cite: 'System Metric: 98% Evidence Anchoring Rate',
    bg: '#FDF4FF', accent: '#86198F',
  },
  {
    tag: 'Legal Impact',
    title: 'Case Resolution',
    body: 'Standard legal systems often fail to process fragmented narratives. Our trauma-informed mapping architecture enables higher case progression and verifiable Statements of Fact.',
    cite: 'System Metric: 1,200+ Cases Navigated',
    bg: '#F0F9FF', accent: '#0369A1',
  },
];

export default function TraumaGuideCarousel() {
  const [current, setCurrent] = useState(0);
  const slide = SLIDES[current];

  return (
    <div className="w-full" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted mb-0.5">Community & Impact</p>
          <h3 className="text-[15px] font-bold text-slate" style={{ fontFamily: "'Playfair Display', serif" }}>
            Stories of Resilience
          </h3>
        </div>
        <div className="flex gap-1 items-center">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className="transition-all rounded-full"
              style={{
                width: i === current ? 16 : 6, height: 6,
                background: i === current ? slide.accent : '#CBD5E1',
              }}/>
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-5 transition-all duration-300 relative overflow-hidden"
           style={{ backgroundColor: slide.bg, minHeight: 170 }}>
        <span className="text-[9px] font-bold uppercase tracking-widest mb-2 block" style={{ color: slide.accent }}>
          {slide.tag}
        </span>
        <h4 className="text-[14px] font-bold text-slate mb-2 leading-snug pr-6"
            style={{ fontFamily: "'Playfair Display', serif" }}>
          {slide.title}
        </h4>
        <p className="text-[12px] text-slate/80 leading-relaxed mb-3">{slide.body}</p>
        <p className="text-[10px] italic" style={{ color: slide.accent, opacity: 0.7 }}>{slide.cite}</p>
        <div className="flex gap-2 mt-4">
          <button disabled={current === 0} onClick={() => setCurrent(c => c - 1)}
            className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all disabled:opacity-30"
            style={{ color: slide.accent, border: `1px solid ${slide.accent}40` }}>
            ← Prev
          </button>
          <button disabled={current === SLIDES.length - 1} onClick={() => setCurrent(c => c + 1)}
            className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all disabled:opacity-30"
            style={{ color: slide.accent, border: `1px solid ${slide.accent}40` }}>
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
