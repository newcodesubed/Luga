import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UploadModal from './UploadModal';

const CATEGORIES = ['All', 'Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Accessories'];

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const navigate = useNavigate();

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
  }, [navigate]);

  const fetchItems = async (token) => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Filter items based on selected category tab
  const filteredItems = selectedCategory === 'All'
    ? items
    : items.filter(item => item.category.toLowerCase() === selectedCategory.toLowerCase());

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative selection:bg-fuchsia-500 selection:text-white">
      {/* Background soft lighting */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-fuchsia-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/60 backdrop-blur-xl sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-violet-600 to-fuchsia-600 rounded-full flex items-center justify-center font-bold text-sm shadow-md shadow-fuchsia-500/10">
            {user.email[0].toUpperCase()}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Luga Wardrobe</h2>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsUploadOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-xs font-semibold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
          >
            + Add Item
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 border border-slate-800 hover:bg-slate-900 text-xs font-semibold rounded-xl transition-all active:scale-95 text-slate-400 cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 flex flex-col gap-8 relative z-10">
        
        {/* Curated Category Filter Tabs */}
        <div className="flex items-center justify-between border-b border-slate-900 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {CATEGORIES.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === category
                    ? 'bg-slate-900 text-slate-100 border border-slate-800'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          <span className="text-xs font-mono text-slate-600 hidden sm:inline">
            Showing {filteredItems.length} items
          </span>
        </div>

        {/* Loading Skeleton State */}
        {loading ? (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
            {[280, 360, 310, 420, 300, 350, 390, 270].map((height, idx) => (
              <div
                key={idx}
                style={{ height: `${height}px` }}
                className="w-full bg-slate-900/30 border border-slate-900/60 rounded-3xl animate-pulse flex flex-col justify-end p-6 break-inside-avoid"
              >
                <div className="h-4 bg-slate-800/50 rounded-md w-1/3 mb-2" />
                <div className="h-3 bg-slate-800/30 rounded-md w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          
          /* Minimal Curated Empty State */
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-6 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-3xl border border-slate-900 bg-slate-900/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-slate-300">Intentionally Empty</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Your wardrobe is a curated collection. Start uploading your favorite pieces to assemble a visually balanced and organized digital library.
              </p>
            </div>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="px-5 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold rounded-xl text-slate-300 transition-all active:scale-95 cursor-pointer"
            >
              Add Your First Piece
            </button>
          </div>
        ) : (
          
          /* Pinterest-style Masonry Gallery */
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
            {filteredItems.map(item => (
              <div
                key={item.id}
                className="group relative bg-slate-900/20 border border-slate-900/60 rounded-3xl overflow-hidden break-inside-avoid hover:border-slate-800/80 transition-all duration-300 flex flex-col"
              >
                {/* Lazy loaded image container */}
                <div className="overflow-hidden bg-slate-950 relative">
                  <img
                    src={item.imageUrl}
                    alt={item.category}
                    loading="lazy"
                    className="w-full object-cover group-hover:scale-102 transition-transform duration-500"
                  />
                  {/* Subtle hover overlay */}
                  <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                {/* Card Details */}
                <div className="p-5 flex flex-col gap-2 bg-slate-900/10 backdrop-blur-sm border-t border-slate-950">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-500">
                      {item.category}
                    </span>
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-slate-800/60"
                      style={{ backgroundColor: item.primaryColor.toLowerCase() }}
                      title={item.primaryColor}
                    />
                  </div>
                  {item.subCategory && (
                    <span className="text-sm font-medium text-slate-300">
                      {item.subCategory}
                    </span>
                  )}
                  {item.aiDescription && (
                    <p className="text-xs text-slate-500 italic font-light leading-relaxed mt-1">
                      "{item.aiDescription}"
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => fetchItems(localStorage.getItem('token'))}
      />
    </div>
  );
}
