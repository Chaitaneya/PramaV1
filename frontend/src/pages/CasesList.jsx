import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Shell from '../components/Shell';
import { Trash2 } from 'lucide-react';

export default function CasesList() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');
  const [sortBy, setSortBy] = useState('upcoming');
  const [cases, setCases] = useState([]);

  useEffect(() => {
    // Fetch all cases to allow local filtering
    axios.get('http://localhost:5000/api/cases')
      .then(res => setCases(res.data))
      .catch(err => console.error("Error fetching cases:", err));
  }, []);

  const getBadgeStyle = (status) => {
    switch(status) {
      case 'Synthesized': 
      case 'Finalized': return 'bg-emerald-100 text-emerald-800';
      case 'Collecting': return 'bg-blue-100 text-blue-800';
      case 'Under Review': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleDelete = async (caseId, clientName) => {
    if (window.confirm(`Crucial Protocol: Are you absolutely sure you want to permanently delete ALL deposits and intelligence logic associated with ${clientName}?`)) {
      try {
        await axios.delete(`http://localhost:5000/api/cases/${caseId}`);
        setCases(cases.filter(c => c.caseId !== caseId));
      } catch (err) {
        console.error("Failed to delete case", err);
      }
    }
  };

  const filteredCases = cases.filter(c => {
    if (activeTab === 'In-Progress') return ['Collecting', 'Under Review'].includes(c.status);
    if (activeTab === 'Closed') return ['Synthesized', 'Finalized'].includes(c.status);
    return true; // All
  }).sort((a, b) => {
    if (sortBy === 'upcoming') {
      const dateA = a.hearingDate ? new Date(a.hearingDate).getTime() : Infinity;
      const dateB = b.hearingDate ? new Date(b.hearingDate).getTime() : Infinity;
      return dateA - dateB;
    }
    if (sortBy === 'client') {
      return a.clientName.localeCompare(b.clientName);
    }
    if (sortBy === 'status') {
      return a.status.localeCompare(b.status);
    }
    return 0;
  });

  return (
    <Shell updateTrigger={cases.length}>
      <div className="flex flex-1 overflow-hidden h-full">
        <div className="flex-1 overflow-y-auto bg-cream relative">
          
          {/* Background Watermark */}
          <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
            <img 
              src="/assests/watermark.png" 
              alt="Watermark" 
              className="w-[800px] md:w-[1000px] h-auto object-contain" 
              style={{ opacity: 0.09 }} 
            />
          </div>

          <div className="max-w-[1600px] mx-auto w-full p-6 md:p-8 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h1 className="font-serif text-[26px] font-medium text-slate">Case Repository</h1>
            </div>
          
            {/* Filter and Metrics Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-border/50 pb-4 relative z-20 gap-4">
               
               {/* Left Controls */}
               <div className="flex items-center gap-6">
                 <div className="flex gap-1.5 bg-gray-100/80 backdrop-blur-sm p-1 rounded-xl border border-border">
                   {['In-Progress', 'Closed', 'All'].map(tab => (
                     <button 
                       key={tab}
                       onClick={() => setActiveTab(tab)}
                       className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${activeTab === tab ? 'bg-white text-slate shadow-sm' : 'text-muted hover:text-slate hover:bg-white/50'}`}
                     >
                       {tab}
                     </button>
                   ))}
                 </div>
                 <div className="text-[14px] text-muted font-medium hidden lg:block">{filteredCases.length} matters found</div>
               </div>

               {/* Right Sort Controls */}
               <div className="flex items-center gap-3">
                 <span className="text-[11px] font-bold text-muted uppercase tracking-wider hidden sm:block">Sort Matrix</span>
                 <select 
                   value={sortBy} 
                   onChange={(e) => setSortBy(e.target.value)}
                   className="bg-card-bg/90 backdrop-blur-sm border border-border text-slate font-medium text-sm rounded-xl py-2 pl-4 pr-10 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer shadow-sm appearance-none transition-all hover:bg-white"
                   style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg fill="none" stroke="%2364748b" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>')`, backgroundSize: '16px', backgroundPosition: 'right 12px center', backgroundRepeat: 'no-repeat' }}
                 >
                   <option value="upcoming">Upcoming Hearing</option>
                   <option value="client">Client Name (A-Z)</option>
                   <option value="status">Pipeline Status</option>
                 </select>
               </div>
            </div>

          {filteredCases.length === 0 ? (
            <div className="text-center py-20 text-muted">No cases found in this category.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 relative z-20">
              {filteredCases.map(c => (
                <div 
                  key={c._id} 
                  className="bg-card-bg border border-border rounded-xl p-5 cursor-pointer transition-all duration-300 hover:border-primary hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(29,78,216,0.12)] group flex flex-col"
                  onClick={() => navigate(`/case/${c.caseId}/session`)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="text-[11px] font-bold tracking-widest text-muted uppercase">{c.caseId}</div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(c.caseId, c.clientName); }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                        title="Delete Case"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className={`text-[10px] px-3 py-1 rounded-full font-bold tracking-wide uppercase ${getBadgeStyle(c.status)}`}>
                        {c.status}
                      </div>
                    </div>
                  </div>
                  <div className="font-serif text-[20px] font-bold text-charcoal mb-1 tracking-tight">{c.clientName}</div>
                  <div className="text-[13px] text-muted mb-4 leading-relaxed">{c.baseLayer?.jurisdiction || 'Jurisdiction Pending'}</div>
                  
                  {c.hearingDate && (
                    <div className="flex items-center gap-2 bg-[#FEF3E2] text-[#B35900] px-3 py-1.5 rounded-lg text-xs font-semibold w-fit mb-2">
                      🗓 Hearing: {new Date(c.hearingDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
