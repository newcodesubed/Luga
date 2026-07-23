import { useState, useEffect } from 'react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarView({ outfits = [], closetItems = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null); // Date string (YYYY-MM-DD)
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logType, setLogType] = useState('outfit'); // 'outfit' or 'items'
  const [selectedOutfitId, setSelectedOutfitId] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-indexed

  useEffect(() => {
    fetchCalendarLogs(year, month);
  }, [year, month]);

  const fetchCalendarLogs = async (y, m) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/calendar?year=${y}&month=${m}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setLogs(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching calendar logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  // Calendar Grid Math
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOffset = new Date(year, month - 1, 1).getDay(); // 0=Sun

  // Map logs by day string (YYYY-MM-DD)
  const logsMap = {};
  logs.forEach(log => {
    const d = new Date(log.date);
    const dayStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    logsMap[dayStr] = log;
  });

  const openLogForDay = (dayNum) => {
    const formattedDay = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    setSelectedDay(formattedDay);
    
    // Check if existing log exists
    const existing = logsMap[formattedDay];
    if (existing) {
      if (existing.outfitId) {
        setLogType('outfit');
        setSelectedOutfitId(existing.outfitId);
        setSelectedItemIds([]);
      } else {
        setLogType('items');
        setSelectedOutfitId('');
        setSelectedItemIds(existing.items ? existing.items.map(i => i.id) : []);
      }
    } else {
      setLogType('outfit');
      setSelectedOutfitId(outfits[0]?.id || '');
      setSelectedItemIds([]);
    }
    
    setIsLogModalOpen(true);
  };

  const handleSaveLog = async (e) => {
    e.preventDefault();
    if (!selectedDay) return;
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const payload = {
        date: selectedDay,
        outfitId: logType === 'outfit' ? selectedOutfitId : null,
        clothingItemIds: logType === 'items' ? selectedItemIds : []
      };

      const res = await fetch('http://localhost:5000/api/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        fetchCalendarLogs(year, month);
        setIsLogModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to log outfit to calendar:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLog = async (logId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/calendar/${logId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (res.ok) {
        fetchCalendarLogs(year, month);
        setIsLogModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to delete calendar log:', err);
    }
  };

  // Mini Outfit Canvas Component renderer inside day cell
  const renderMiniOutfitCanvas = (log) => {
    if (!log) return null;

    let itemsToDisplay = [];
    if (log.outfit && log.outfit.outfitItems) {
      itemsToDisplay = log.outfit.outfitItems.map(oi => oi.clothingItem);
    } else if (log.items) {
      itemsToDisplay = log.items;
    }

    if (itemsToDisplay.length === 0) return null;

    return (
      <div className="w-full h-full flex items-center justify-center p-1 relative group">
        <div className="grid grid-cols-2 gap-1 w-full max-w-[70px] aspect-square p-1 rounded-lg bg-slate-950/80 border border-slate-850/80 shadow-md">
          {itemsToDisplay.slice(0, 4).map((item, idx) => (
            <div key={item.id || idx} className="overflow-hidden rounded bg-[#0C0F18] aspect-square flex items-center justify-center">
              <img
                src={item.imageUrl}
                alt={item.category}
                className={`w-full h-full ${
                  ['shoes', 'accessories'].includes(item.category?.toLowerCase())
                    ? 'object-contain p-0.5'
                    : 'object-cover'
                }`}
              />
            </div>
          ))}
        </div>
        
        {/* Subtle tooltip on hover */}
        <div className="absolute inset-0 bg-slate-950/90 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center p-2 text-center z-10 pointer-events-none">
          <span className="text-[9px] font-bold text-brand-sand truncate max-w-full">
            {log.outfit?.name || 'Custom Log'}
          </span>
          <span className="text-[8px] font-mono text-slate-400 mt-0.5">
            {itemsToDisplay.length} pieces
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-4">
        <div className="flex items-center gap-4">
          <h3 className="font-serif text-3xl text-brand-cream italic font-normal tracking-wide">
            {MONTH_NAMES[month - 1]} {year}
          </h3>
          {loading && <span className="text-xs font-mono text-brand-bronze animate-pulse">Syncing...</span>}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevMonth}
            className="p-2.5 rounded-full border border-slate-850 hover:bg-slate-900 text-slate-400 hover:text-brand-cream transition-colors cursor-pointer"
          >
            ←
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2.5 rounded-full border border-slate-850 hover:bg-slate-900 text-slate-400 hover:text-brand-cream transition-colors cursor-pointer"
          >
            →
          </button>
        </div>
      </div>

      {/* 7-Column CSS Grid Calendar Layout */}
      <div className="border border-slate-900 rounded-3xl overflow-hidden bg-slate-950/40 backdrop-blur-sm shadow-xl">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-slate-900 bg-[#0A0E1A]">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="py-3 text-center text-[10px] uppercase font-mono tracking-widest text-slate-500">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid Cells */}
        <div className="grid grid-cols-7 auto-rows-fr">
          {/* Offset Padding Cells */}
          {Array.from({ length: firstDayOffset }).map((_, idx) => (
            <div key={`offset-${idx}`} className="min-h-[110px] border-b border-r border-slate-900/60 bg-slate-950/20" />
          ))}

          {/* Actual Month Days */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const logForDay = logsMap[dayStr];
            const isToday = new Date().toISOString().split('T')[0] === dayStr;

            return (
              <div
                key={dayStr}
                onClick={() => openLogForDay(dayNum)}
                className={`min-h-[110px] border-b border-r border-slate-900/60 p-2 flex flex-col justify-between transition-all duration-200 cursor-pointer relative group ${
                  isToday ? 'bg-brand-sand/5' : 'hover:bg-slate-900/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-mono font-medium ${isToday ? 'text-brand-bronze font-bold' : 'text-slate-500'}`}>
                    {dayNum}
                  </span>
                  {logForDay && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald" title="Outfit Logged" />
                  )}
                </div>

                {/* Render Mini Canvas inside cell */}
                <div className="flex-1 flex items-center justify-center my-1">
                  {renderMiniOutfitCanvas(logForDay)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Log Modal */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setIsLogModalOpen(false)} />

          <div className="relative w-full max-w-lg bg-[#0F172A] border border-slate-900 rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-900">
              <div>
                <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-brand-bronze block mb-1">Calendar Log</span>
                <h4 className="font-serif text-2xl text-brand-cream italic font-normal">
                  {selectedDay}
                </h4>
              </div>
              <button onClick={() => setIsLogModalOpen(false)} className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLog} className="space-y-6">
              {/* Type Switcher */}
              <div className="flex gap-3 p-1 bg-slate-950 border border-slate-900 rounded-xl">
                <button
                  type="button"
                  onClick={() => setLogType('outfit')}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                    logType === 'outfit'
                      ? 'bg-slate-900 text-brand-sand border border-slate-850'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Saved Lookbook Outfit
                </button>
                <button
                  type="button"
                  onClick={() => setLogType('items')}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                    logType === 'items'
                      ? 'bg-slate-900 text-brand-sand border border-slate-850'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Individual Clothes
                </button>
              </div>

              {logType === 'outfit' ? (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-2">
                    Select Outfit to Log
                  </label>
                  {outfits.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No saved outfits. Generate or save an outfit first!</p>
                  ) : (
                    <select
                      value={selectedOutfitId}
                      onChange={(e) => setSelectedOutfitId(e.target.value)}
                      className="w-full bg-[#0A0E1A] border border-slate-900 rounded-xl px-4 py-3 text-xs focus:border-brand-bronze/50 outline-none text-slate-350"
                    >
                      {outfits.map(o => (
                        <option key={o.id} value={o.id}>{o.name} ({o.occasion})</option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-2">
                    Select Clothes Worn
                  </label>
                  <div className="grid grid-cols-3 gap-3 max-h-48 overflow-y-auto p-1 no-scrollbar">
                    {closetItems.map(item => {
                      const isChecked = selectedItemIds.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            setSelectedItemIds(prev => 
                              isChecked ? prev.filter(id => id !== item.id) : [...prev, item.id]
                            );
                          }}
                          className={`border p-2 rounded-xl cursor-pointer flex flex-col items-center transition-all ${
                            isChecked ? 'border-brand-bronze bg-brand-bronze/10' : 'border-slate-850 bg-slate-950/40 opacity-60'
                          }`}
                        >
                          <img src={item.imageUrl} alt={item.category} className="h-14 w-full object-cover rounded-lg" />
                          <span className="text-[8px] uppercase tracking-widest font-mono text-slate-400 mt-1 truncate">{item.category}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4 border-t border-slate-900">
                {logsMap[selectedDay] && (
                  <button
                    type="button"
                    onClick={() => handleDeleteLog(logsMap[selectedDay].id)}
                    className="py-3 px-5 border border-red-950/40 hover:bg-red-950/30 text-red-400 text-xs uppercase tracking-widest font-semibold rounded-full transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-brand-emerald text-brand-cream hover:bg-[#20362D] text-xs uppercase tracking-widest font-semibold rounded-full shadow-lg transition-all cursor-pointer"
                >
                  {submitting ? 'Logging...' : 'Save Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
