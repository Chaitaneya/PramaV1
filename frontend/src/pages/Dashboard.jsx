import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api';
import Shell from '../components/Shell';
import TraumaGuideCarousel from '../components/TraumaGuideCarousel';
import BraveStories from '../components/BraveStories';
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
        <div className="flex-1 overflow-y-auto bg-[#F9F8F6] pb-16 relative">
          
          {/* Aura Background Watermark */}
          <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
            <img 
              src="/assests/watermark.png" 
              alt="Dashboard Watermark" 
              className="w-[800px] md:w-[1000px] h-auto object-contain" 
              style={{ opacity: 0.02 }} 
            />
          </div>

          <div className="max-w-[1200px] mx-auto w-full px-8 py-10 relative z-10">
            
            {/* Command Center Search Bar */}
            <div className="mb-12 w-full">
              <h1 className="font-serif text-[36px] font-bold text-[#2C2B2A] tracking-tight mb-8">Sanctuary Workspace</h1>
              <div className="relative group mb-12">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-[#847E76]">
                  <Search size={20} />
                </div>
                <input
                  type="text"
                  placeholder="Find litigation matters by Client Name or Case ID..."
                  className="w-full bg-[#F0EEE9] text-[#2C2B2A] placeholder-[#847E76]/70 text-[16px] rounded-xl pl-14 pr-8 py-4 outline-none focus:ring-1 focus:ring-[#7A8B7D] transition-all border-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Brave Stories Section */}
              <BraveStories />
            </div>

            {/* Filter and Metrics Row */}
            {cases.length > 0 && (
              <div className="flex items-center justify-between mb-8 border-b border-[#E6E2D8] pb-5 relative z-20">
                 <div className="text-[13px] text-[#847E76] font-medium">{filteredCases.length} matters active</div>
                 <div className="flex items-center gap-3 relative">
                   <span className="text-[10px] font-bold text-[#847E76] uppercase tracking-wider hidden sm:block">Sort Matrix</span>
                   <select 
                     value={sortBy} 
                     onChange={(e) => setSortBy(e.target.value)}
                     className="bg-[#FCFBF9] border border-[#E6E2D8] text-[#2C2B2A] font-medium text-xs rounded-xl py-2.5 pl-4 pr-10 focus:ring-1 focus:ring-[#7A8B7D] outline-none cursor-pointer appearance-none transition-all hover:bg-[#F9F8F6]"
                     style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg fill="none" stroke="%23847e76" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>')`, backgroundSize: '14px', backgroundPosition: 'right 12px center', backgroundRepeat: 'no-repeat' }}
                   >
                     <option value="upcoming">Upcoming Hearing</option>
                     <option value="client">Client Name (A-Z)</option>
                     <option value="status">Pipeline Status</option>
                   </select>
                 </div>
              </div>
            )}

          {filteredCases.length === 0 ? (
            <div className="text-center py-20 bg-[#FCFBF9] border border-[#E6E2D8] rounded-2xl mx-auto mt-10 shadow-none max-w-2xl">
              <div className="w-16 h-16 bg-[#F0EEE9] text-[#7A8B7D] rounded-xl flex items-center justify-center mx-auto mb-6">
                <FolderSearch size={28} />
              </div>
              <h3 className="font-serif text-xl text-[#2C2B2A] font-semibold tracking-tight mb-2">No active cases found</h3>
              <div className="text-[13px] text-[#847E76] max-w-sm mx-auto leading-relaxed">
                {searchQuery ? `We couldn't pull any logic files matching "${searchQuery}". Verify the Case ID or Client Name.` : "Your active litigation repository is clean. Start by dropping a New Case using the master protocol button (+)."}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6 relative z-20">
              {filteredCases.map(c => (
                <div 
                  key={c._id} 
                  className="bg-[#FCFBF9] border border-[#E6E2D8] rounded-2xl p-8 cursor-pointer transition-all duration-300 hover:border-[#7A8B7D] hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-6 group"
                  onClick={() => navigate(`/case/${c.caseId}/session`)}
                >
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-mono tracking-wider text-[#847E76] uppercase bg-[#F0EEE9] px-2.5 py-1 rounded-md">{c.caseId}</span>
                      <span className={`text-[10px] px-2.5 py-1 rounded-md font-bold tracking-wide uppercase ${getBadgeStyle(c.status)}`}>
                        {c.status}
                      </span>
                    </div>
                    
                    <div className="font-serif text-[22px] font-bold text-[#2C2B2A] tracking-tight">{c.clientName}</div>
                    
                    <div className="text-[13px] text-[#847E76] leading-relaxed">{c.baseLayer?.jurisdiction || 'Jurisdiction Pending'}</div>
                    
                    {c.hearingDate && (
                      <div className="flex items-center gap-2 bg-[#F0EEE9] text-[#7A8B7D] px-3 py-1.5 rounded-lg text-xs font-semibold w-fit mt-2">
                        🗓 Hearing: {new Date(c.hearingDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <div className="flex md:flex-col items-end justify-between md:justify-center gap-4 border-t md:border-t-0 border-[#E6E2D8] pt-4 md:pt-0">
                    <div className="text-[11px] text-[#847E76]">Created: {new Date(c.createdAt).toLocaleDateString()}</div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(c.caseId, c.clientName); }}
                        className="opacity-0 group-hover:opacity-100 p-2 text-[#847E76] hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        title="Delete Case"
                      >
                        <Trash2 size={16} />
                      </button>
                      <div className="w-8 h-8 rounded-xl bg-[#F0EEE9] flex items-center justify-center text-[11px] font-bold text-[#7A8B7D] shadow-none">
                        JS
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>

        {/* Right sidebar — Research Guide */}
        <div className="w-[300px] border-l border-[#E6E2D8] bg-[#FCFBF9] p-6 hidden xl:flex flex-col gap-6 shrink-0 overflow-y-auto">
          <TraumaGuideCarousel />
        </div>

      </div>
    </Shell>
  );
}
