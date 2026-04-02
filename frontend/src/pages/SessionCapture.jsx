import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Shell from '../components/Shell';
import { Search } from 'lucide-react';

export default function SessionCapture() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deposits, setDeposits] = useState([]);
  const [clientData, setClientData] = useState({ name: 'Loading...', baseLayer: {} });
  const [inputText, setInputText] = useState('');
  const [activeTag, setActiveTag] = useState('General');
  const [searchQuery, setSearchQuery] = useState('');

  const tags = [
    { name: 'General', icon: '📝', color: 'text-gray-500', bg: 'bg-gray-100' },
    { name: 'Visual', icon: '👁️', color: 'text-[#5C6BC0]', bg: 'bg-[#EEF2FF]' },
    { name: 'Auditory', icon: '👂', color: 'text-[#B7950B]', bg: 'bg-[#FEF9E7]' },
    { name: 'Olfactory', icon: '👃', color: 'text-[#1E8449]', bg: 'bg-[#EAFAF1]' },
    { name: 'Somatic', icon: '✋', color: 'text-[#B35900]', bg: 'bg-[#FEF3E2]' }
  ];

  useEffect(() => {
    // Fetch case details
    axios.get(`http://localhost:5000/api/cases/${id}`).then(res => setClientData({ name: res.data.clientName, baseLayer: res.data.baseLayer, hearingDate: res.data.hearingDate ? res.data.hearingDate.split('T')[0] : '' })).catch(() => setClientData({ name: 'Unknown Client', baseLayer: {}, hearingDate: '' }));
    // Fetch sessions
    axios.get(`http://localhost:5000/api/cases/${id}/sessions`)
      .then(res => {
        const allDeps = [];
        res.data.forEach((s, index) => {
          const sessionLabel = `Session ${index + 1} : ${new Date(s.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;
          s.deposits.forEach(d => {
            allDeps.push({
              id: d._id,
              type: d.sensoryTag,
              icon: tags.find(t=>t.name===d.sensoryTag)?.icon || '',
              time: new Date(d.addedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              date: new Date(d.addedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
              sessionLabel: sessionLabel,
              text: d.content
            });
          });
        });
        setDeposits(allDeps);
      }).catch(err => console.error("Error fetching sessions:", err));
  }, [id]);

  const handleAdd = async () => {
    if (!inputText.trim()) return;
    const activeIcon = tags.find(t => t.name === activeTag).icon;
    
    try {
      await axios.post(`http://localhost:5000/api/cases/${id}/sessions`, {
        content: inputText,
        sensoryTag: activeTag
      });
      let currentLabel = `Session 1 : ${new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;
      if (deposits.length > 0) {
        currentLabel = deposits[deposits.length - 1].sessionLabel;
      }

      // Optimistic append
      setDeposits([...deposits, {
        id: Date.now(),
        type: activeTag,
        icon: activeIcon,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
        sessionLabel: currentLabel,
        text: inputText
      }]);
      setInputText('');
    } catch(err) {
      alert("Failed to save deposit");
    }
  };

  const handleEndSession = async () => {
    if (window.confirm("Close this session? Your next note will start a brand new session block.")) {
      try {
        await axios.post(`http://localhost:5000/api/cases/${id}/sessions/end`);
        navigate('/');
      } catch (err) {
        alert("Error closing session.");
      }
    }
  };

  const groupedDeposits = deposits.filter(d => 
    d.text.toLowerCase().includes(searchQuery.toLowerCase())
  ).reduce((acc, dep) => {
    const key = dep.sessionLabel || dep.date;
    if(!acc[key]) acc[key] = [];
    acc[key].push(dep);
    return acc;
  }, {});

  return (
    <Shell>
      <div className="flex flex-col flex-1 w-full bg-cream relative overflow-hidden">
        <div className="px-4 py-2 border-b border-border bg-card-bg flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-6">
            <div className="text-xs text-muted font-medium">{id} · Session Capture</div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                <Search size={14} />
              </div>
              <input 
                type="text" 
                placeholder="Search across sessions..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="text-[12px] font-medium border border-border bg-gray-50 rounded-full pl-9 pr-3 py-1 outline-none focus:border-primary focus:ring-1 focus:ring-primary w-48 md:w-64 transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-[#EEF2FF] text-[#5C6BC0] text-[11px] font-medium px-3 py-1 rounded-full items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#5C6BC0] animate-pulse"></div> In Progress
            </div>
            <button 
              onClick={handleEndSession}
              className="text-[11px] font-bold tracking-wide uppercase text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-700 px-4 py-1.5 rounded-full transition-colors shadow-sm"
            >
              End Session & Exit
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Skeleton Sidepanel */}
          <div className="w-[200px] border-r border-border bg-card-bg p-4 flex flex-col hidden md:flex shrink-0 overflow-y-auto">
            <div className="text-[10px] tracking-widest text-muted uppercase font-medium mb-4">Case Skeleton</div>
            <div className="mb-3">
              <div className="text-[10px] text-muted uppercase tracking-wide mb-1">Client</div>
              <div className="text-[14px] text-charcoal font-bold tracking-tight">{clientData.name}</div>
            </div>

            <div className="mb-3">
              <div className="text-[10px] text-muted uppercase tracking-wide mb-1">Upcoming Hearing</div>
              <input 
                type="date" 
                min={new Date().toISOString().split('T')[0]}
                value={clientData.hearingDate || ''}
                onChange={async (e) => {
                  const newDate = e.target.value;
                  setClientData({ ...clientData, hearingDate: newDate });
                  await axios.put(`http://localhost:5000/api/cases/${id}/hearing`, { hearingDate: newDate }).catch(console.error);
                }}
                className="w-full text-xs bg-gray-50 border border-border rounded p-1.5 focus:outline-none focus:border-primary"
              />
            </div>
            
            <div className="h-px bg-border my-2"></div>
            
            {clientData.baseLayer?.knownWindow && (
              <div className="my-2 text-left">
                <div className="text-[9px] text-muted uppercase tracking-wide mb-0.5">Known Window</div>
                <div className="text-[11px] text-slate font-medium leading-tight">{clientData.baseLayer.knownWindow}</div>
              </div>
            )}
            {clientData.baseLayer?.anchorDays && (
              <div className="my-2 text-left">
                <div className="text-[9px] text-muted uppercase tracking-wide mb-0.5">Anchor Days</div>
                <div className="text-[11px] text-slate font-medium leading-tight">{clientData.baseLayer.anchorDays}</div>
              </div>
            )}
            {clientData.baseLayer?.environmentalContext && (
              <div className="my-2 text-left">
                <div className="text-[9px] text-muted uppercase tracking-wide mb-0.5">Env. Context</div>
                <div className="text-[11px] text-slate font-medium leading-tight">{clientData.baseLayer.environmentalContext}</div>
              </div>
            )}
            {clientData.baseLayer?.medicalHistory && (
              <div className="my-2 text-left">
                <div className="text-[9px] text-muted uppercase tracking-wide mb-0.5">Medical Hx</div>
                <div className="text-[11px] text-slate font-medium leading-tight">{clientData.baseLayer.medicalHistory}</div>
              </div>
            )}
          </div>

          {/* Center Feed */}
          <div className="flex-1 flex flex-col bg-cream min-w-0">
            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
              
              {Object.keys(groupedDeposits).length === 0 && <div className="text-center text-muted mt-10">No sessions recorded. Start typing below.</div>}

              {Object.entries(groupedDeposits).map(([date, deps]) => (
                <div key={date} className="mb-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-px bg-border flex-1"></div>
                    <div className="text-xs font-bold text-muted uppercase tracking-wider bg-gray-50 px-3 py-1 rounded-full border border-border">{date}</div>
                    <div className="h-px bg-border flex-1"></div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {deps.map((d) => (
                      <div key={d.id} className="bg-card-bg border border-border p-3.5 rounded-xl shadow-sm text-sm flex gap-3">
                        <div className="bg-gray-50 w-8 h-8 rounded flex items-center justify-center shrink-0 border border-border">
                          {d.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-slate text-xs">{d.type} Deposit</span>
                            <span className="text-[10px] text-muted font-medium tracking-wide">{d.time}</span>
                          </div>
                          <div className="text-slate leading-relaxed text-[13px]">{d.text}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* End spacer */}
              <div className="h-4"></div>
            </div>
            
            <div className="bg-card-bg border-t border-border p-4 shrink-0">
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1 hidden-scrollbar">
                {tags.map(t => (
                  <button 
                    key={t.name}
                    onClick={() => setActiveTag(t.name)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors border ${
                      activeTag === t.name 
                      ? `bg-primary-light text-primary-dark border-primary` 
                      : `bg-transparent text-muted border-border hover:border-primary/50`
                    }`}
                  >
                    {t.icon} {t.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  placeholder="Type deposit note here..."
                  className="flex-1 border border-border rounded-lg px-4 py-2.5 text-[13px] bg-cream text-slate outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <button 
                  onClick={handleAdd}
                  className="bg-primary text-white rounded-lg px-5 py-2.5 text-[13px] font-medium hover:bg-primary-dark transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Right AI Panel */}
          <div className="w-[180px] border-l border-border bg-card-bg p-4 flex flex-col pt-6 hidden lg:flex shrink-0">
            <div className="text-[10px] tracking-widest text-muted uppercase font-medium mb-3">AI Ready</div>
            <div className="bg-primary-light rounded-xl p-4 text-center mb-4">
              <div className="font-serif text-[32px] text-slate leading-none">{deposits.length}</div>
              <div className="text-[10px] text-muted mt-1">deposits logged</div>
            </div>
            
            <div className="flex flex-col gap-2 mt-auto mb-4">
              {tags.map(t => (
                <div key={t.name} className="flex justify-between text-xs text-muted border-b border-border pb-1">
                  <span className="flex items-center gap-1.5">{t.icon} {t.name}</span>
                  <span className="text-slate font-medium">{deposits.filter(d=>d.type===t.name).length}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => navigate(`/case/${id}/chronology`)}
              className="bg-slate text-white w-full rounded-xl p-4 text-[13px] font-medium hover:bg-slate/90 transition-colors shadow-sm"
            >
              Generate<br/>Narrative ↗
            </button>
          </div>
        </div>
      </div>
    </Shell>
  );
}
