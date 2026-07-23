import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UploadModal from './UploadModal';
import EditModal from './EditModal';
import StyleMeModal from './StyleMeModal';
import EditOutfitModal from './EditOutfitModal';
import CalendarView from './CalendarView';

const CATEGORIES = ['All', 'Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Accessories'];

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isStyleMeOpen, setIsStyleMeOpen] = useState(false);
  const [currentView, setCurrentView] = useState('closet'); // 'closet', 'outfits', or 'calendar'
  const [outfits, setOutfits] = useState([]);
  const [loadingOutfits, setLoadingOutfits] = useState(false);
  const [selectedOutfit, setSelectedOutfit] = useState(null);
  const [isEditOutfitOpen, setIsEditOutfitOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const navigate = useNavigate();

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (!token || !savedUser) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
      return;
    }

    setUser(JSON.parse(savedUser));
    fetchItems(token);
    fetchOutfits(token);
  }, [navigate]);

  const fetchOutfits = async (token, isSilent = false) => {
    if (!isSilent) setLoadingOutfits(true);
    try {
      const res = await fetch('http://localhost:5000/api/outfits', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setOutfits(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching outfits:', err);
    } finally {
      if (!isSilent) setLoadingOutfits(false);
    }
  };

  const fetchItems = async (token, isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/clothing', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setItems(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching clothing items:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleWearOutfitToday = async (outfitId) => {
    const token = localStorage.getItem('token');
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Instant Optimistic UI Update (0ms delay, no skeleton flash)
    setOutfits(prev => prev.map(o => o.id === outfitId ? { ...o, wearCount: (o.wearCount || 0) + 1, lastWornAt: todayStr } : o));

    const targetOutfit = outfits.find(o => o.id === outfitId);
    if (targetOutfit && targetOutfit.outfitItems) {
      const wornIds = targetOutfit.outfitItems.map(oi => oi.clothingItem.id);
      setItems(prev => prev.map(item => wornIds.includes(item.id) ? { ...item, wearCount: (item.wearCount || 0) + 1, lastWornAt: todayStr } : item));
    }

    showToast("✓ Outfit logged as today's outfit in your calendar!");

    // 2. Silent API Sync in background
    try {
      const res = await fetch('http://localhost:5000/api/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: todayStr,
          outfitId: outfitId,
        }),
      });

      if (res.ok) {
        fetchItems(token, true);
        fetchOutfits(token, true);
      }
    } catch (err) {
      console.error('Error logging outfit today:', err);
    }
  };

  const filteredItems = selectedCategory === 'All'
    ? items
    : items.filter(item => item.category.toLowerCase() === selectedCategory.toLowerCase());

  const hasTop = items.some(item => item.category.toLowerCase() === 'tops');
  const hasBottom = items.some(item => item.category.toLowerCase() === 'bottoms');
  const isStyleMeDisabled = !hasTop || !hasBottom;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F8FAF9] flex flex-col font-sans relative selection:bg-brand-bronze selection:text-[#F8FAF9]">
      {/* Editorial subtle light background highlight */}
      <div className="absolute top-0 right-10 w-[600px] h-[600px] bg-brand-sand/5 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[500px] h-[500px] bg-brand-emerald/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Frosted Luxury Floating Header */}
      <header className="border-b border-slate-900 bg-[#0F172A]/70 backdrop-blur-md sticky top-0 z-50 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 border border-brand-bronze/45 rounded-full flex items-center justify-center font-serif text-lg text-brand-bronze font-bold">
            {user.email[0].toUpperCase()}
          </div>
          <div>
            <h2 className="text-xs uppercase tracking-[0.2em] font-medium text-[#F8FAF9]/85">Luga</h2>
            <p className="text-[10px] text-slate-500 tracking-wider font-mono">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            disabled={isStyleMeDisabled}
            onClick={() => setIsStyleMeOpen(true)}
            title={isStyleMeDisabled ? "Upload at least 1 top and 1 bottom to enable AI generation." : "Generate AI Outfit"}
            className={`px-5 py-2.5 rounded-full text-xs tracking-wider transition-all transform hover:-translate-y-0.5 font-medium cursor-pointer ${
              isStyleMeDisabled
                ? 'opacity-40 cursor-not-allowed border border-slate-800 text-slate-500'
                : 'bg-brand-bronze text-[#F8FAF9] hover:bg-[#836746] shadow-md shadow-brand-bronze/10'
            }`}
          >
            ✨ Style Me
          </button>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="px-5 py-2.5 border border-brand-emerald text-brand-cream hover:bg-brand-emerald/20 rounded-full text-xs tracking-wider font-medium transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            + Add Piece
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-[11px] uppercase tracking-widest rounded-full transition-all text-slate-400 hover:text-[#F8FAF9] cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-8 py-12 flex flex-col gap-10 relative z-10">
        
        {/* Editorial Sub-navigation view selector */}
        <div className="flex items-center gap-8 border-b border-slate-900 pb-3">
          <button
            onClick={() => setCurrentView('closet')}
            className={`pb-3 text-sm font-medium tracking-widest uppercase border-b-2 transition-all duration-300 cursor-pointer ${
              currentView === 'closet'
                ? 'border-brand-bronze text-brand-bronze'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            Closet Gallery
          </button>
          <button
            onClick={() => {
              setCurrentView('outfits');
              fetchOutfits(localStorage.getItem('token'));
            }}
            className={`pb-3 text-sm font-medium tracking-widest uppercase border-b-2 transition-all duration-300 cursor-pointer ${
              currentView === 'outfits'
                ? 'border-brand-bronze text-brand-bronze'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            Saved Lookbooks
          </button>
          <button
            onClick={() => setCurrentView('calendar')}
            className={`pb-3 text-sm font-medium tracking-widest uppercase border-b-2 transition-all duration-300 cursor-pointer ${
              currentView === 'calendar'
                ? 'border-brand-bronze text-brand-bronze'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            Outfit Calendar
          </button>
        </div>

        {/* 1. CLOSET GALLERY VIEW */}
        {currentView === 'closet' && (
          <>
            {/* Category Filter Tabs */}
            <div className="flex items-center justify-between border-b border-slate-900/50 pb-5">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {CATEGORIES.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-full text-xs tracking-wider transition-all duration-300 cursor-pointer whitespace-nowrap ${
                      selectedCategory === category
                        ? 'bg-slate-900 border border-brand-sand/20 text-[#F8FAF9]'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <span className="text-[10px] font-mono text-slate-500 hidden sm:inline uppercase tracking-widest">
                {filteredItems.length} curated pieces
              </span>
            </div>
            
            {/* Shimmer Placeholder Skeletons */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6].map((_, idx) => (
                  <div
                    key={idx}
                    className="w-full aspect-[3/4] bg-slate-900/40 border border-slate-800/40 rounded-2xl animate-pulse p-4 flex flex-col justify-end"
                  >
                    <div className="h-3 bg-slate-800/60 rounded w-1/3 mb-2" />
                    <div className="h-2 bg-slate-800/30 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              /* Minimalistic Curated Empty State */
              <div className="flex-1 flex flex-col items-center justify-center py-24 text-center space-y-6 max-w-sm mx-auto">
                <div className="w-14 h-14 rounded-full border border-slate-800 bg-slate-900/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-650" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium uppercase tracking-widest text-slate-350">Aesthetic Blank</h3>
                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed font-light">
                    Build your luxury collection. Upload photos of your wardrobe pieces to assemble your catalog.
                  </p>
                </div>
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="px-5 py-2 border border-slate-850 hover:bg-slate-900 text-[10px] uppercase tracking-widest rounded-full text-slate-400 hover:text-brand-cream transition-colors cursor-pointer"
                >
                  Upload Piece
                </button>
              </div>
            ) : (
              /* Sleek 3:4 Portrait Fashion Grid */
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {filteredItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => { setSelectedItem(item); setIsEditOpen(true); }}
                    className="group relative bg-slate-900/10 border border-slate-900/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-slate-800/80 transition-all duration-300 flex flex-col cursor-pointer"
                  >
                    {/* Portrait Image frame */}
                    <div className="aspect-[3/4] overflow-hidden bg-[#0A0D14] relative">
                      <img
                        src={item.imageUrl}
                        alt={item.category}
                        loading="lazy"
                        className={`w-full h-full group-hover:scale-105 transition-transform duration-700 ease-out ${
                          ['shoes', 'accessories'].includes(item.category.toLowerCase())
                            ? 'object-contain p-3'
                            : 'object-cover'
                        }`}
                      />
                      {/* Floating Monospace Tag Badge */}
                      <span className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur-sm border border-slate-900 text-[9px] uppercase tracking-widest font-mono text-slate-300 px-2.5 py-1 rounded-full">
                        {item.category}
                      </span>
                      {/* Top Right Floating Wear Count Badge */}
                      <div className="absolute top-3 right-3 bg-slate-950/85 backdrop-blur-sm border border-brand-sand/20 text-[9px] font-mono text-brand-sand font-semibold px-2.5 py-1 rounded-full">
                        Worn {item.wearCount || 0}x
                      </div>
                    </div>

                    {/* Minimal details block */}
                    <div className="p-4 flex flex-col gap-1.5 border-t border-slate-950 bg-slate-900/5 backdrop-blur-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-200 uppercase tracking-wide truncate pr-2">
                          {item.subCategory || 'Standard'}
                        </span>
                        <span
                          className="w-3 h-3 rounded-full border border-slate-800/50"
                          style={{ backgroundColor: item.primaryColor }}
                          title={item.primaryColor}
                        />
                      </div>
                      {item.aiDescription && (
                        <p className="text-[10px] text-slate-500 italic font-light line-clamp-2 mt-0.5">
                          "{item.aiDescription}"
                        </p>
                      )}

                      {/* Wear Count & Last Worn Badge */}
                      <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-900/60 text-[9px] font-mono text-slate-500">
                        <span>Worn: <strong className="text-brand-sand font-bold">{item.wearCount || 0}x</strong></span>
                        <span>
                          {item.lastWornAt
                            ? `Last: ${new Date(item.lastWornAt).toLocaleDateString()}`
                            : 'Unworn'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* 2. SAVED LOOKBOOKS VIEW */}
        {currentView === 'outfits' && (
          loadingOutfits ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[1, 2].map((_, idx) => (
                <div key={idx} className="w-full h-72 bg-slate-900/40 border border-slate-900/60 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : outfits.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-24 text-center space-y-6 max-w-sm mx-auto">
              <div className="w-14 h-14 rounded-full border border-slate-800 bg-slate-900/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-650" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium uppercase tracking-widest text-slate-350">Lookbooks Empty</h3>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed font-light">
                  No saved styles in your portfolio. Initiate AI generation to build and document curated looks.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {outfits.map(outfit => (
                <div
                  key={outfit.id}
                  onClick={() => { setSelectedOutfit(outfit); setIsEditOutfitOpen(true); }}
                  className="bg-slate-900/10 border border-slate-900/80 hover:border-slate-800/80 rounded-3xl p-6 flex flex-col gap-6 transition-all duration-300 cursor-pointer group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-serif text-2xl text-brand-sand italic font-normal tracking-wide">{outfit.name}</h4>
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-[9px] uppercase tracking-widest font-mono text-brand-bronze bg-brand-bronze/10 px-2.5 py-1 rounded-full border border-brand-bronze/20 inline-block">
                          {outfit.occasion}
                        </span>
                        <span className="text-[9px] font-mono text-brand-sand bg-brand-sand/10 px-2.5 py-1 rounded-full border border-brand-sand/20 inline-block">
                          Worn {outfit.wearCount || 0}x
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
                        {new Date(outfit.createdAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWearOutfitToday(outfit.id);
                        }}
                        className="px-3 py-1 bg-brand-emerald/20 hover:bg-brand-emerald border border-brand-emerald/40 text-emerald-300 hover:text-white text-[9px] uppercase tracking-widest font-mono rounded-full transition-all cursor-pointer"
                      >
                        Wear Today
                      </button>
                    </div>
                  </div>
                  
                  {/* Polaroid Asymmetric overlapping grid style inside container */}
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    {outfit.outfitItems.map(item => (
                      <div key={item.clothingItem.id} className="bg-slate-950 border border-slate-850/80 p-2 rounded-xl flex flex-col shadow-sm">
                        <div className="aspect-[3/4] rounded-lg overflow-hidden relative bg-[#0D111A]">
                          <img
                            src={item.clothingItem.imageUrl}
                            alt={item.clothingItem.category}
                            className={`h-full w-full ${
                              ['shoes', 'accessories'].includes(item.clothingItem.category.toLowerCase())
                                ? 'object-contain p-2'
                                : 'object-cover'
                            }`}
                          />
                        </div>
                        <div className="pt-2 px-1 text-left">
                          <span className="text-[8px] uppercase tracking-widest font-mono text-slate-500 block truncate">{item.clothingItem.category}</span>
                          {item.clothingItem.subCategory && (
                            <span className="text-[10px] font-semibold text-slate-300 block truncate mt-0.5">{item.clothingItem.subCategory}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* 3. OUTFIT CALENDAR LOG VIEW */}
        {currentView === 'calendar' && (
          <CalendarView outfits={outfits} closetItems={items} />
        )}
      </main>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => fetchItems(localStorage.getItem('token'), true)}
      />

      <EditModal
        isOpen={isEditOpen}
        onClose={() => { setIsEditOpen(false); setSelectedItem(null); }}
        onSuccess={() => fetchItems(localStorage.getItem('token'), true)}
        item={selectedItem}
      />

      <StyleMeModal
        isOpen={isStyleMeOpen}
        onClose={() => setIsStyleMeOpen(false)}
        closetItems={items}
        onGenerationSuccess={() => {
          const token = localStorage.getItem('token');
          fetchItems(token, true);
          fetchOutfits(token, true);
        }}
      />

      <EditOutfitModal
        isOpen={isEditOutfitOpen}
        onClose={() => { setIsEditOutfitOpen(false); setSelectedOutfit(null); }}
        onSuccess={() => fetchOutfits(localStorage.getItem('token'), true)}
        outfit={selectedOutfit}
        closetItems={items}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-50 bg-[#0F172A] border border-brand-emerald/40 text-emerald-400 text-xs px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fade-in border-slate-850">
          <span className="w-2 h-2 rounded-full bg-brand-emerald animate-pulse" />
          <span className="font-medium tracking-wide">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
