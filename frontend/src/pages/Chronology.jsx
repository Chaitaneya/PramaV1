import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Shell from '../components/Shell';
import { jsPDF } from 'jspdf';

export default function Chronology() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeEvent, setActiveEvent] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [allDeposits, setAllDeposits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.post(`http://localhost:5000/api/cases/${id}/stitch/generate`)
      .then(res => {
        const data = res.data;
        setTimeline((data.timeline || []).map((ev, i) => ({
          id: i,
          date: ev.date,
          desc: ev.event,
          tag: ev.timePrecision || 'AI',
          tagBg: ev.timePrecision === 'Exact' ? 'bg-green-50' : 'bg-[#EEF2FF]',
          tagColor: ev.timePrecision === 'Exact' ? 'text-green-700' : 'text-[#5C6BC0]',
          isConflict: ev.isConflict || false,
          sourceIds: ev.sourceIds || [],
          conflictDetails: ev.conflictDetails
        })));
        setAlerts(data.forensicAlerts || []);
        setLoading(false);
      })
      .catch(err => {
        setLoading(false);
        console.error(err);
        alert(err.response?.data?.error || "Failed to generate narrative via Gemini APIs.");
      });

    // Also fetch sessions to cross-reference
    axios.get(`http://localhost:5000/api/cases/${id}/sessions`).then(res => {
      const flat = [];
      res.data.forEach(s => s.deposits.forEach(d => flat.push(d)));
      setAllDeposits(flat);
    });
  }, [id]);

  const handleExport = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Affidavit / Statement of Facts: ${id}`, 20, 20);
    doc.setFontSize(11);
    
    let y = 35;
    timeline.forEach(ev => {
      // Split text to fit line
      const textLines = doc.splitTextToSize(`[${ev.date}] ${ev.desc}`, 170);
      doc.text(textLines, 20, y);
      y += (10 * textLines.length);
    });
    
    doc.save(`${id}_Affidavit.pdf`);
  };

  return (
    <Shell>
      <div className="flex flex-col flex-1 w-full bg-cream relative overflow-hidden">
        <div className="px-4 py-2 border-b border-border bg-card-bg flex items-center justify-between z-10">
          <div className="text-xs text-muted font-medium flex items-center gap-4">
            {id} · Chronology
            <div className="bg-[#F0F0EC] p-0.5 rounded-md flex hidden md:flex">
              <button className="text-[11px] px-3 py-1 rounded bg-card-bg text-slate font-medium shadow-sm">Chronology</button>
              <button className="text-[11px] px-3 py-1 rounded text-muted hover:text-slate">Narrative</button>
              <button className="text-[11px] px-3 py-1 rounded text-muted hover:text-slate">Conflicts</button>
            </div>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <button 
              onClick={() => navigate(`/case/${id}/session`)}
              className="bg-primary text-white text-[11px] font-bold tracking-wide px-4 py-2 rounded-md hover:bg-primary-dark shadow-sm transition-all transform hover:-translate-y-0.5"
            >
              + ADD DEPOSIT
            </button>
            <button 
              disabled={loading || timeline.length === 0}
              onClick={handleExport}
              className="bg-primary text-white text-[11px] font-semibold tracking-wide px-4 py-2 rounded-md hover:bg-primary-dark shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Export Affidavit ↓
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto w-full max-w-2xl mx-auto p-6 md:p-8 flex flex-col min-w-0">
            <div className="flex justify-between items-end mb-8 shrink-0">
              <h2 className="font-serif text-xl tracking-wide text-slate">Event Chronology</h2>
              <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-muted mt-2 md:mt-0">
                <div className="flex items-center gap-1.5"><div className="w-2 relative h-2 rounded-full bg-primary"></div>Verified</div>
                <div className="flex items-center gap-1.5"><div className="w-2 relative h-2 rounded-full bg-[#E67E22]"></div>Conflict</div>
              </div>
            </div>

            <div className="relative pl-7 pb-10 flex-1">
              <div className="absolute left-[9px] top-2 bottom-0 w-[1.5px] bg-border z-0"></div>
              
              {loading && <div className="text-sm text-muted animate-pulse">Running Prama Narrative Architect...</div>}
              {!loading && timeline.length === 0 && <div className="text-sm text-muted">No events stitched. Please record deposits first.</div>}
              
              {timeline.map((ev, idx) => (
                <div 
                  key={ev.id} 
                  onClick={() => setActiveEvent(activeEvent === ev.id ? null : ev.id)}
                  className={`relative pl-8 pb-8 border-l-[1.5px] group cursor-pointer
                  ${ev.isConflict ? 'border-[#E67E22]' : 'border-primary'}`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${ev.isConflict ? 'bg-[#E67E22]' : 'bg-primary'} absolute -left-[6px] top-1.5 ring-4 ring-cream group-hover:scale-110 transition-transform`}></div>
                  
                  <div className={`bg-card-bg border rounded-xl p-4 transition-all
                    ${ev.isConflict ? 'border-[#E67E22]/30 bg-[#FFFAF5]' : 'border-border hover:border-primary/50'}
                    ${activeEvent === ev.id ? 'border-primary border-[1.5px] shadow-sm transform -translate-y-[1px]' : ''}`}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="text-[11px] text-muted font-medium tracking-wide">{ev.date}</div>
                      {ev.isConflict && <span className="text-[9px] bg-[#FEF3E2] text-[#E67E22] font-bold px-2 py-0.5 rounded-full shadow-sm">⚠ Conflict</span>}
                    </div>
                    <div className="text-[13px] text-slate leading-relaxed mb-3">{ev.desc}</div>
                    <div className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider ${ev.tagBg} ${ev.tagColor}`}>
                      {ev.tag}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-[320px] border-l border-border bg-card-bg flex flex-col shrink-0 hidden lg:flex relative z-10 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.03)]">
            <div className="p-4 border-b border-border shrink-0 bg-card-bg/50 backdrop-blur z-20">
              <div className="text-[10px] tracking-widest text-muted uppercase font-semibold mb-1">Prama Analysis</div>
              <div className="font-serif text-[15px] text-slate">Case Forensics</div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
              
              {/* Alerts Section */}
              {alerts.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] text-muted font-bold uppercase tracking-widest">Forensic Alerts ({alerts.length})</div>
                  {alerts.map((alert, i) => (
                    <div key={i} className="bg-red-50/50 border border-red-100 rounded-lg p-3 text-[11px] text-red-800 leading-relaxed shadow-sm">
                      <div className="font-bold mb-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                        {alert.type}
                      </div>
                      {alert.description}
                    </div>
                  ))}
                </div>
              )}

              <hr className="border-border/50" />

              <div>
                <div className="text-[10px] text-muted font-bold uppercase tracking-widest mb-3">Source Trace</div>
                {!activeEvent && activeEvent !== 0 && (
                  <div className="text-[11px] text-muted text-center py-10 opacity-70 border border-dashed border-border rounded-xl">Select an event to view deposits</div>
                )}

                {(activeEvent || activeEvent === 0) && timeline.find(t => t.id === activeEvent) && (() => {
                  const ev = timeline.find(t => t.id === activeEvent);
                  const linkedDeposits = allDeposits.filter(d => ev.sourceIds.includes(d._id));

                  if (linkedDeposits.length === 0) return <div className="text-xs text-muted py-5 text-center bg-gray-50 rounded-lg">AI Hallucination Lock: No exact source match found.</div>;

                  return (
                    <div className="space-y-3">
                      {linkedDeposits.map((rawObj, idx) => (
                        <div key={rawObj._id} className={`border-l-[3px] rounded-lg p-3 text-xs leading-relaxed text-slate shadow-sm bg-primary-light/30 border-primary`}>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[9px] font-bold text-[#5C6BC0]">{new Date(rawObj.addedAt).toLocaleString()}</span>
                            <span className="text-[9px] bg-[#EEF2FF] text-[#5C6BC0] px-1.5 py-0.5 rounded font-bold uppercase">{rawObj.sensoryTag}</span>
                          </div>
                          "{rawObj.content}"
                        </div>
                      ))}
                      
                      {ev.isConflict && ev.conflictDetails && (
                        <div className="bg-[#FEF3E2] rounded-lg p-3 text-[11px] leading-relaxed text-[#8B4513] mt-2 border border-[#E67E22]/20 shadow-inner">
                          <strong className="block text-[#E67E22] mb-1 font-bold">Conflict Analysis</strong>
                          {ev.conflictDetails}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
