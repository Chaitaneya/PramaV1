import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api';
import Shell from '../components/Shell';
import TraumaGuideCarousel from '../components/TraumaGuideCarousel';
import { Search, Trash2, FolderSearch } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('upcoming');

  useEffect(() => {
    // Only fetch active cases
    apiClient.get('/api/cases?status=Collecting,Under Review')
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
        await apiClient.delete(`/api/cases/${caseId}`);
        setCases(cases.filter(c => c.caseId !== caseId));
      } catch (err) {
        console.error("Failed to delete case", err);
      }
    }
  };

  const filteredCases = cases.filter(c => 
    c.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.caseId.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
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
        <div className="flex-1 overflow-y-auto bg-cream pb-12 relative">
          
          {/* Aura Background Watermark */}
          {/* Note: You can adjust the transparency below by changing the opacity inside style={{ opacity: ... }} */}
          <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
            <img 
              src="/assests/watermark.png" 
              alt="Dashboard Watermark" 
              className="w-[800px] md:w-[1000px] h-auto object-contain" 
              style={{ opacity: 0.09 }} 
            />
          </div>

          <div className="max-w-[1600px] mx-auto w-full p-6 md:p-8 relative z-10">
            
            {/* Command Center Search Bar */}
            <div className="mb-10 w-full max-w-3xl">
              <h1 className="font-serif text-[28px] font-medium text-slate tracking-tight mb-4">Command Center</h1>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-muted group-focus-within:text-primary transition-colors">
                  <Search size={20} />
                </div>
                <input
                  type="text"
                  placeholder="Query litigation matters by Client Name or Case ID..."
                  className="w-full bg-card-bg border-[1.5px] border-border text-slate placeholder-muted text-[15px] rounded-2xl pl-14 pr-6 py-4 outline-none focus:border-primary focus:ring-[3px] focus:ring-primary-light transition-all shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Filter and Metrics Row */}
            {cases.length > 0 && (
              <div className="flex items-center justify-between mb-6 border-b border-border/50 pb-4 relative z-20">
                 <div className="text-[14px] text-muted font-medium">{filteredCases.length} matters mapped</div>
                 <div className="flex items-center gap-3 relative">
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
            )}

          {filteredCases.length === 0 ? (
            <div className="text-center py-20 bg-card-bg border-2 border-dashed border-border rounded-3xl mx-auto mt-10 shadow-sm max-w-3xl">
              <div className="w-20 h-20 bg-primary-light text-primary-dark rounded-full flex items-center justify-center mx-auto mb-5 border-[6px] border-white shadow-sm hover:scale-105 transition-transform cursor-pointer">
                <FolderSearch size={32} />
              </div>
              <h3 className="font-serif text-2xl text-slate font-bold tracking-tight mb-2">No active cases found</h3>
              <div className="text-[14px] text-muted max-w-md mx-auto leading-relaxed">
                {searchQuery ? `We couldn't pull any logic files matching "${searchQuery}". Verify the Case ID or Client Name.` : "Your active litigation repository is clean. Start by dropping a New Case using the master protocol button (+)."}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 relative z-20">
              {filteredCases.map(c => (
                <div 
                  key={c._id} 
                  className="bg-card-bg border border-border rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(29,78,216,0.12)] hover:border-primary flex flex-col group"
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
                    <div className="flex items-center gap-2 bg-[#FEF3E2] text-[#B35900] px-3 py-1.5 rounded-lg text-xs font-semibold w-fit mb-4">
                      🗓 Hearing: {new Date(c.hearingDate).toLocaleDateString()}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-border mt-auto">
                    <div className="text-[11px] text-muted font-medium">Created: {new Date(c.createdAt).toLocaleDateString()}</div>
                    <div className="w-7 h-7 rounded-full bg-primary-light flex items-center justify-center text-[11px] font-bold text-primary-dark shadow-inner">
                      JS
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>

        {/* Right sidebar — Research Guide */}
        <div className="w-[280px] border-l border-border bg-card-bg p-5 hidden xl:flex flex-col gap-6 shrink-0 overflow-y-auto">
          <TraumaGuideCarousel />
        </div>

      </div>
    </Shell>
  );
}
