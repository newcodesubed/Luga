import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import UploadModal from './UploadModal';
import EditModal from './EditModal';
import StyleMeModal from './StyleMeModal';
import EditOutfitModal from './EditOutfitModal';
import CalendarView from './CalendarView';
import WardrobeCard from './WardrobeCard';
import OutfitCard from './OutfitCard';
import Toast from './Toast';

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
    fetchItems(false);
    fetchOutfits(false);
  }, [navigate]);

  const fetchOutfits = async (isSilent = false) => {
    if (!isSilent) setLoadingOutfits(true);
    try {
      const data = await apiClient.get('/outfits');
      setOutfits(data.data || []);
    } catch (err) {
      console.error('Error fetching outfits:', err);
    } finally {
      if (!isSilent) setLoadingOutfits(false);
    }
  };

  const fetchItems = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await apiClient.get('/clothing');
      setItems(data.data || []);
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
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      await apiClient.post('/calendar', {
        date: todayStr,
        outfitId: outfitId,
      });
      showToast("✓ Outfit logged as today's outfit in your calendar!");
      fetchItems(true);
      fetchOutfits(true);
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
      {/* Editorial background highlights */}
      <div className="absolute top-0 right-10 w-[600px] h-[600px] bg-brand-sand/5 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[500px] h-[500px] bg-brand-emerald/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Floating Header */}
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
              fetchOutfits(true);
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
            
            {/* Loading Skeletons */}
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
              /* Empty State */
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
              /* Wardrobe Grid */
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {filteredItems.map(item => (
                  <WardrobeCard
                    key={item.id}
                    item={item}
                    onClick={() => { setSelectedItem(item); setIsEditOpen(true); }}
                  />
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
                <OutfitCard
                  key={outfit.id}
                  outfit={outfit}
                  onClick={() => { setSelectedOutfit(outfit); setIsEditOutfitOpen(true); }}
                  onWearToday={handleWearOutfitToday}
                />
              ))}
            </div>
          )
        )}

        {/* 3. OUTFIT CALENDAR LOG VIEW */}
        {currentView === 'calendar' && (
          <CalendarView
            outfits={outfits}
            closetItems={items}
            onLogChange={() => {
              fetchItems(true);
              fetchOutfits(true);
            }}
          />
        )}
      </main>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => fetchItems(true)}
      />

      <EditModal
        isOpen={isEditOpen}
        onClose={() => { setIsEditOpen(false); setSelectedItem(null); }}
        onSuccess={() => fetchItems(true)}
        item={selectedItem}
      />

      <StyleMeModal
        isOpen={isStyleMeOpen}
        onClose={() => setIsStyleMeOpen(false)}
        closetItems={items}
        onGenerationSuccess={() => {
          fetchItems(true);
          fetchOutfits(true);
        }}
      />

      <EditOutfitModal
        isOpen={isEditOutfitOpen}
        onClose={() => { setIsEditOutfitOpen(false); setSelectedOutfit(null); }}
        onSuccess={() => fetchOutfits(true)}
        outfit={selectedOutfit}
        closetItems={items}
      />

      {/* Floating Toast Notification */}
      <Toast message={toastMessage} />
    </div>
  );
}
