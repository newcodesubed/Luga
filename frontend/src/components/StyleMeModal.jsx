import { useState } from 'react';

const OCCASIONS = ['Casual', 'Formal', 'Date Night', 'Workplace', 'Gym'];
const WEATHERS = ['Sunny & Warm', 'Cold & Rainy', 'Snowy & Freezing', 'Mild & Windy', 'Hot & Humid'];

export default function StyleMeModal({ isOpen, onClose, onGenerationSuccess, closetItems = [] }) {
  const [occasion, setOccasion] = useState('Casual');
  const [weather, setWeather] = useState('Sunny & Warm');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [swappingItem, setSwappingItem] = useState(null); // The item we want to swap

  if (!isOpen) return null;

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    setSavedSuccess(false);
    setSwappingItem(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/outfits/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          occasion,
          weather,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to generate outfit');
      }

      setResult(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReplaceItem = (newItem) => {
    if (!swappingItem || !result) return;

    // 1. Swap the ID in clothingItemIds
    const updatedIds = result.clothingItemIds.map(id => id === swappingItem.id ? newItem.id : id);

    // 2. Swap the item details in selectedItems
    const updatedItems = result.selectedItems.map(item => item.id === swappingItem.id ? newItem : item);

    setResult({
      ...result,
      clothingItemIds: updatedIds,
      selectedItems: updatedItems
    });

    setSwappingItem(null); // Clear swap selection state
  };

  const handleSaveOutfit = async () => {
    if (!result) return;
    setSaving(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/outfits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: result.outfitName,
          occasion: occasion,
          clothingItemIds: result.clothingItemIds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to save outfit');
      }

      setSavedSuccess(true);
      if (onGenerationSuccess) {
        onGenerationSuccess();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const [wearTodaySuccess, setWearTodaySuccess] = useState(false);

  const handleWearToday = async () => {
    if (!result) return;
    setSaving(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const todayStr = new Date().toISOString().split('T')[0];
      let outfitIdToLog = null;

      // Save outfit first
      const resOutfit = await fetch('http://localhost:5000/api/outfits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: result.outfitName,
          occasion: occasion,
          clothingItemIds: result.clothingItemIds,
        }),
      });

      const dataOutfit = await resOutfit.json();

      if (!resOutfit.ok) {
        throw new Error(dataOutfit.message || 'Failed to save outfit');
      }

      setSavedSuccess(true);
      outfitIdToLog = dataOutfit.data.id;

      // Log to calendar for today
      const resCalendar = await fetch('http://localhost:5000/api/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: todayStr,
          outfitId: outfitIdToLog,
        }),
      });

      if (!resCalendar.ok) {
        const dataCal = await resCalendar.json();
        throw new Error(dataCal.message || 'Failed to log to calendar');
      }

      setWearTodaySuccess(true);
      if (onGenerationSuccess) {
        onGenerationSuccess();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError('');
    setSavedSuccess(false);
    setWearTodaySuccess(false);
    setSwappingItem(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Card - Styled for Editorial Luxury */}
      <div className="relative w-full max-w-3xl bg-[#0F172A] border border-slate-900 rounded-3xl p-8 shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-900">
          <div>
            <span className="text-[9px] uppercase tracking-[0.25em] font-medium text-brand-bronze font-sans block mb-1">Interactive Styling</span>
            <h3 className="font-serif text-3xl text-brand-cream italic font-normal tracking-wide">
              Luga Stylist Canvas
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer p-1.5 hover:bg-slate-900 rounded-full transition-all">
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] p-4 rounded-xl mb-6">
            {error}
          </div>
        )}

        {savedSuccess && !wearTodaySuccess && (
          <div className="bg-brand-emerald/10 border border-brand-emerald/20 text-emerald-400 text-[11px] p-4 rounded-xl mb-6">
            ✓ Outfit saved to your saved lookbooks successfully.
          </div>
        )}

        {wearTodaySuccess && (
          <div className="bg-brand-emerald/10 border border-brand-emerald/20 text-emerald-400 text-[11px] p-4 rounded-xl mb-6">
            ✓ Outfit saved to lookbook & logged as today's worn outfit in your calendar!
          </div>
        )}

        {loading ? (
          /* Premium Shimmer Skeleton Loader */
          <div className="space-y-6 py-4">
            <div className="h-28 w-full bg-slate-900/60 border border-slate-850 rounded-2xl animate-pulse flex flex-col justify-center px-6">
              <div className="h-4 bg-slate-800/80 rounded w-1/3 mb-3" />
              <div className="h-3 bg-slate-800/40 rounded w-2/3" />
            </div>
            <div className="grid grid-cols-3 gap-6">
              {[1, 2, 3].map((_, idx) => (
                <div key={idx} className="aspect-[3/4] bg-slate-900/40 border border-slate-850 rounded-2xl animate-pulse" />
              ))}
            </div>
          </div>
        ) : !result ? (
          /* Parameter Input State */
          <form onSubmit={handleGenerate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-2">
                  Select Occasion
                </label>
                <select
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  className="w-full bg-[#0A0E1A] border border-slate-900 rounded-xl px-4 py-3 text-xs tracking-wider focus:border-brand-bronze/50 outline-none text-slate-350"
                >
                  {OCCASIONS.map((occ) => (
                    <option key={occ} value={occ}>{occ}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-2">
                  Weather Forecast
                </label>
                <select
                  value={weather}
                  onChange={(e) => setWeather(e.target.value)}
                  className="w-full bg-[#0A0E1A] border border-slate-900 rounded-xl px-4 py-3 text-xs tracking-wider focus:border-brand-bronze/50 outline-none text-slate-350"
                >
                  {WEATHERS.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-4 pt-6 border-t border-slate-900">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-slate-950 border border-slate-900 text-xs uppercase tracking-widest font-medium rounded-full text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-brand-emerald text-brand-cream hover:bg-[#20362D] text-xs uppercase tracking-widest font-semibold rounded-full shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
              >
                Generate Outfit
              </button>
            </div>
          </form>
        ) : result.noNewCombinations ? (
          /* No New Combinations Screen */
          <div className="space-y-6 text-center py-10">
            <div className="w-14 h-14 rounded-full border border-slate-800 bg-slate-900/20 flex items-center justify-center mx-auto">
              <span className="text-lg">✨</span>
            </div>
            <div>
              <h4 className="text-sm font-medium uppercase tracking-widest text-slate-350">Lookbook Exhausted</h4>
              <p className="text-[11px] text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed font-light">
                {result.message}
              </p>
            </div>
            <div className="flex gap-4 pt-6 border-t border-slate-900">
              <button
                onClick={handleReset}
                className="flex-1 py-3 bg-slate-950 border border-slate-900 text-xs uppercase tracking-widest font-medium rounded-full text-slate-455 hover:text-slate-200 transition-colors cursor-pointer"
              >
                Change filters
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-brand-bronze text-[#F8FAF9] hover:bg-[#836746] text-xs uppercase tracking-widest font-semibold rounded-full shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Editorial Lookbook Canvas Response */
          <div className="space-y-8">
            {/* Hero Header block */}
            <div className="p-6 rounded-2xl bg-slate-900/10 border border-slate-900/80 flex flex-col gap-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-brand-sand/5 rounded-full blur-xl pointer-events-none" />
              <h4 className="font-serif text-3xl italic text-brand-sand font-normal tracking-wide">{result.outfitName}</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-light mt-1 max-w-2xl">
                {result.rationale}
              </p>
            </div>

            {/* Asymmetrical / Carousel Collage Polaroid frame selection */}
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-4">
                Recommended Assembled Collage
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {result.selectedItems.map((clothingItem, index) => (
                  <div
                    key={clothingItem.id}
                    className={`bg-slate-950 border border-slate-850/80 p-3 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 flex flex-col transform ${
                      index % 2 === 1 ? 'translate-y-2' : '' // Subtle asymmetric offset
                    }`}
                  >
                    <div className="aspect-[3/4] rounded-xl overflow-hidden bg-[#0C0F18]">
                      <img
                        src={clothingItem.imageUrl}
                        alt={clothingItem.category}
                        className={`h-full w-full ${
                          ['shoes', 'accessories'].includes(clothingItem.category.toLowerCase())
                            ? 'object-contain p-2'
                            : 'object-cover'
                        }`}
                      />
                    </div>
                    <div className="pt-3 px-1 flex flex-col">
                      <span className="text-[8px] uppercase tracking-widest font-mono text-brand-bronze block">
                        {clothingItem.category}
                      </span>
                      {clothingItem.subCategory && (
                        <span className="text-xs font-semibold text-slate-200 block truncate mt-0.5">
                          {clothingItem.subCategory}
                        </span>
                      )}
                      
                      {/* Individual Swap Action Button */}
                      <button
                        type="button"
                        onClick={() => setSwappingItem(clothingItem)}
                        className="mt-3 py-1.5 border border-slate-800 hover:border-slate-700 bg-[#0F172A] hover:bg-slate-900 text-[9px] uppercase tracking-widest font-mono rounded-lg text-slate-400 hover:text-brand-cream transition-colors cursor-pointer"
                      >
                        Swap Piece
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Swap drawer - displayed below when an item is selected for swap */}
            {swappingItem && (
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-900 space-y-3 mt-4 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    Select alternative {swappingItem.category}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSwappingItem(null)}
                    className="text-[10px] uppercase tracking-wider font-semibold text-red-400 hover:text-red-300"
                  >
                    Cancel Swap
                  </button>
                </div>
                
                <div className="flex gap-4 overflow-x-auto py-1 no-scrollbar max-h-36">
                  {closetItems
                    .filter(item => 
                      item.category.toLowerCase() === swappingItem.category.toLowerCase() && 
                      item.id !== swappingItem.id &&
                      !result.clothingItemIds.includes(item.id) // Exclude items already in this outfit
                    )
                    .map(alternativeItem => (
                      <div
                        key={alternativeItem.id}
                        onClick={() => handleReplaceItem(alternativeItem)}
                        className="flex-shrink-0 w-24 border border-slate-850 hover:border-brand-bronze/60 bg-[#0F172A] p-2 rounded-xl cursor-pointer transition-all flex flex-col items-center shadow-sm hover:shadow-md"
                      >
                        <div className="h-16 w-16 overflow-hidden rounded-lg bg-[#0C0F18] relative">
                          <img
                            src={alternativeItem.imageUrl}
                            alt={alternativeItem.category}
                            className={`h-full w-full ${
                              ['shoes', 'accessories'].includes(alternativeItem.category.toLowerCase())
                                ? 'object-contain p-1'
                                : 'object-cover'
                            }`}
                          />
                        </div>
                        <span className="text-[9px] text-slate-400 mt-1.5 truncate max-w-full font-mono">
                          {alternativeItem.subCategory || 'Standard'}
                        </span>
                      </div>
                    ))}

                  {closetItems.filter(item => 
                    item.category.toLowerCase() === swappingItem.category.toLowerCase() && 
                    item.id !== swappingItem.id &&
                    !result.clothingItemIds.includes(item.id)
                  ).length === 0 && (
                    <span className="text-[11px] text-slate-500 italic py-3 font-light">
                      No alternative {swappingItem.category} options in your closet.
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-900">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleWearToday}
                  disabled={saving || wearTodaySuccess}
                  className="px-5 py-2.5 bg-brand-emerald/20 hover:bg-brand-emerald border border-brand-emerald/40 text-emerald-300 hover:text-white text-[10px] uppercase tracking-widest font-bold rounded-full transition-all disabled:opacity-50 cursor-pointer"
                >
                  {wearTodaySuccess ? "✓ Logged Today" : "Wear Today"}
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleReset}
                  className="px-5 py-2.5 bg-slate-950 border border-slate-900 text-[10px] uppercase tracking-widest font-semibold rounded-full text-slate-450 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Re-Style
                </button>
                
                {!savedSuccess && (
                  <button
                    onClick={handleSaveOutfit}
                    disabled={saving}
                    className="px-6 py-2.5 bg-brand-emerald text-brand-cream hover:bg-[#20362D] text-[10px] uppercase tracking-widest font-bold rounded-full shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? 'Saving Look...' : 'Save Lookbook'}
                  </button>
                )}

                {savedSuccess && (
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 bg-slate-900 border border-slate-800 text-[10px] uppercase tracking-widest font-semibold rounded-full text-slate-300 transition-colors cursor-pointer"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
