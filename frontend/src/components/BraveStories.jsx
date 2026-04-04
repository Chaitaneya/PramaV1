import React, { useState } from 'react';
import { ShieldCheck, Heart, Landmark, ChevronRight, ChevronLeft, Quote } from 'lucide-react';

const stories = [
  {
    id: 'harish',
    title: 'Breaking the Silence',
    survivor: 'Harish Iyer',
    type: 'Male Survivor & Pioneer',
    image: '/assets/stories/male.png',
    color: 'from-[#3B4F8C]/10 to-[#3B4F8C]/5',
    accent: 'text-[#3B4F8C]',
    bg: 'bg-white',
    summary: 'After 11 years of silence, Harish embraced his truth, leading to a national legal reckoning.',
    proof: 'POCSO Act 2012',
    impact: 'Directly influenced the drafting of gender-neutral language in the POCSO Act to protect male victims.',
    quote: "I channeled my trauma into advocacy so no other child feels isolated."
  },
  {
    id: 'maya',
    title: 'From Silence to Power',
    survivor: 'Maya',
    type: 'Designer & Advocate',
    image: '/assets/stories/female.png',
    color: 'from-[#3B4F8C]/10 to-[#3B4F8C]/5',
    accent: 'text-[#3B4F8C]',
    bg: 'bg-white',
    summary: 'Drugged and assaulted, Maya found the courage on the 4th day to break the silence.',
    proof: 'DNA Evidence Conviction',
    impact: 'Reclaimed her power by testifying against her attacker, resulting in a full prison sentence.',
    quote: "Success wasn't just the verdict; it was the restoration of my dignity."
  }
];

export default function BraveStories() {
  const [current, setCurrent] = useState(0);

  const next = () => setCurrent((prev) => (prev + 1) % stories.length);
  const prev = () => setCurrent((prev) => (prev - 1 + stories.length) % stories.length);

  const s = stories[current];

  return (
    <div className="w-full bg-[#fdfdfd] border border-border/40 rounded-[40px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.05)] relative group mb-10 transition-all hover:shadow-[0_40px_80px_rgba(59,79,140,0.08)]">
      
      {/* Background Accent Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${s.color} opacity-20 pointer-events-none transition-all duration-700`} />

      <div className="flex flex-col lg:flex-row h-full relative z-10 p-6 md:p-8 lg:p-10">
        
        {/* Visual Panel with Padding! */}
        <div className="lg:w-[45%] h-[300px] lg:h-[480px] relative overflow-hidden rounded-[32px] shadow-2xl transition-transform duration-700 group-hover:scale-[1.02]">
          <img 
            src={s.image} 
            alt={s.survivor} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-end p-8">
            <div className="mt-auto">
               <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#3B4F8C] rounded-full text-[10px] font-bold text-white uppercase tracking-widest mb-4 shadow-lg border border-white/20">
                 Justice Verified
               </span>
               <h2 className="text-4xl font-serif text-white font-bold tracking-tight mb-1" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>{s.survivor}</h2>
               <p className="text-white/90 text-sm font-medium tracking-wide uppercase">{s.type}</p>
            </div>
          </div>
        </div>

        {/* Content Panel */}
        <div className="flex-1 lg:pl-12 pt-8 lg:pt-0 flex flex-col justify-between">
          <div className="max-w-xl">
            <div className={`flex items-center gap-3 mb-8 ${s.accent}`}>
              <ShieldCheck size={24} strokeWidth={1.5} />
              <span className="text-[11px] font-bold uppercase tracking-[0.3em]">The Victory Path</span>
            </div>

            <div className="mb-10 relative">
              <Quote className={`absolute -left-6 -top-6 opacity-5 ${s.accent}`} size={80} />
              <p className="text-2xl md:text-3xl font-serif italic text-slate/90 leading-[1.4] mb-8 font-medium">
                "{s.quote}"
              </p>
              <div className="text-[16px] text-muted leading-relaxed font-medium">
                {s.summary}
              </div>
            </div>

            {/* Proof Highlight - Prama Styled */}
            <div className="flex items-start gap-4 p-6 bg-white border border-border/60 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <div className={`w-12 h-12 rounded-2xl bg-[#EEF2FF] shadow-inner flex items-center justify-center shrink-0 text-[#3B4F8C]`}>
                <Landmark size={22} />
              </div>
              <div>
                <div className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-2">Legal Impact & Proof</div>
                <div className="text-[13px] font-bold text-slate mb-1">{s.proof}</div>
                <p className="text-[14px] text-muted/80 leading-relaxed font-medium">
                  {s.impact}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between mt-12">
             <div className="flex gap-3">
               {stories.map((_, i) => (
                 <button 
                  key={i} 
                  onClick={() => setCurrent(i)}
                  className={`h-1.5 rounded-full transition-all duration-500 ${i === current ? 'w-12 bg-[#3B4F8C]' : 'w-3 bg-slate/10 hover:bg-slate/20'}`} 
                 />
               ))}
             </div>
             <div className="flex gap-4">
               <button onClick={prev} className="w-12 h-12 rounded-full border border-border bg-white flex items-center justify-center text-muted hover:bg-[#3B4F8C] hover:text-white hover:border-[#3B4F8C] transition-all shadow-sm">
                 <ChevronLeft size={20} />
               </button>
               <button onClick={next} className="w-12 h-12 rounded-full border border-border bg-white flex items-center justify-center text-muted hover:bg-[#3B4F8C] hover:text-white hover:border-[#3B4F8C] transition-all shadow-sm">
                 <ChevronRight size={20} />
               </button>
             </div>
          </div>
        </div>
      </div>

    </div>
  );
}
