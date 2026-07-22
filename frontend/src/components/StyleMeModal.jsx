import { useState } from 'react';

const OCCASIONS = ['Casual', 'Formal', 'Date Night', 'Workplace', 'Gym'];
const WEATHERS = ['Sunny & Warm', 'Cold & Rainy', 'Snowy & Freezing', 'Mild & Windy', 'Hot & Humid'];

export default function StyleMeModal({ isOpen, onClose, onGenerationSuccess }) {
  const [occasion, setOccasion] = useState('Casual');
  const [weather, setWeather] = useState('Sunny & Warm');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    setSavedSuccess(false);

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

  const handleReset = () => {
    setResult(null);
    setError('');
    setSavedSuccess(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Style Me (AI Outfit Builder)
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer">
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {savedSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3 rounded-xl mb-4">
            ✓ Outfit saved to your Lookbook successfully!
          </div>
        )}

        {!result ? (
          /* Parameter Input State */
          <form onSubmit={handleGenerate} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Select Occasion
              </label>
              <select
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:border-fuchsia-500 outline-none text-slate-300"
              >
                {OCCASIONS.map((occ) => (
                  <option key={occ} value={occ}>{occ}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Weather Conditions
              </label>
              <select
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:border-fuchsia-500 outline-none text-slate-300"
              >
                {WEATHERS.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-slate-950 border border-slate-800 text-xs font-semibold rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-xs font-semibold rounded-xl text-slate-100 shadow-md transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Styling Your Look...
                  </>
                ) : (
                  'Generate Outfit'
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Output Success State */
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800">
              <h4 className="text-lg font-bold text-fuchsia-400">{result.outfitName}</h4>
              <p className="text-xs text-slate-400 mt-2 italic font-light leading-relaxed">
                "{result.rationale}"
              </p>
            </div>

            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Proposed Wardrobe Pieces
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {result.selectedItems.map((clothingItem) => (
                  <div
                    key={clothingItem.id}
                    className="bg-slate-950/60 border border-slate-850 rounded-2xl overflow-hidden flex flex-col"
                  >
                    <img
                      src={clothingItem.imageUrl}
                      alt={clothingItem.category}
                      className="h-32 w-full object-cover"
                    />
                    <div className="p-3 flex flex-col gap-1 mt-auto">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
                        {clothingItem.category}
                      </span>
                      {clothingItem.subCategory && (
                        <span className="text-xs font-medium text-slate-350 truncate">
                          {clothingItem.subCategory}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={handleReset}
                className="flex-1 py-3 bg-slate-950 border border-slate-800 text-xs font-semibold rounded-xl text-slate-450 hover:text-slate-200 transition-colors cursor-pointer"
              >
                Create Another
              </button>
              
              {!savedSuccess && (
                <button
                  onClick={handleSaveOutfit}
                  disabled={saving}
                  className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-xs font-semibold rounded-xl text-slate-100 shadow-md transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Saving Look...' : 'Save to Lookbook'}
                </button>
              )}

              {savedSuccess && (
                <button
                  onClick={onClose}
                  className="flex-1 py-3 border border-slate-800 hover:bg-slate-900 text-xs font-semibold rounded-xl text-slate-400 transition-colors cursor-pointer"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
