import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { getItemImageFitClass } from '../utils/imageUtils';

const OCCASIONS = ['Casual', 'Formal', 'Date Night', 'Workplace', 'Gym'];

export default function EditOutfitModal({ isOpen, onClose, onSuccess, outfit, closetItems = [] }) {
  const [name, setName] = useState('');
  const [occasion, setOccasion] = useState('Casual');
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [swappingItem, setSwappingItem] = useState(null);

  useEffect(() => {
    if (outfit) {
      setName(outfit.name || '');
      setOccasion(outfit.occasion || 'Casual');
      const itemsList = outfit.outfitItems ? outfit.outfitItems.map(item => item.clothingItem) : [];
      setSelectedItems(itemsList);
      setError('');
      setShowConfirmDelete(false);
      setSwappingItem(null);
      setWearSuccess(false);
    }
  }, [outfit, isOpen]);

  if (!isOpen || !outfit) return null;

  const handleRemoveItem = (itemId) => {
    if (selectedItems.length <= 1) {
      setError('An outfit must contain at least 1 item.');
      return;
    }
    setSelectedItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleReplaceItem = (newItem) => {
    if (!swappingItem) return;
    setSelectedItems(prev => prev.map(item => item.id === swappingItem.id ? newItem : item));
    setSwappingItem(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const clothingItemIds = selectedItems.map(item => item.id);

      await apiClient.put(`/outfits/${outfit.id}`, {
        name,
        occasion,
        clothingItemIds,
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const executeDelete = async () => {
    setDeleting(true);
    setError('');

    try {
      await apiClient.delete(`/outfits/${outfit.id}`);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
      setShowConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const [wearSuccess, setWearSuccess] = useState(false);

  const handleWearToday = async () => {
    setLoading(true);
    setError('');

    try {
      const todayStr = new Date().toISOString().split('T')[0];

      await apiClient.post('/calendar', {
        date: todayStr,
        outfitId: outfit.id,
      });

      setWearSuccess(true);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-[#0F172A] border border-slate-900 rounded-3xl p-8 shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-900">
          <div>
            <span className="text-[9px] uppercase tracking-[0.25em] font-medium text-brand-bronze block mb-1">Lookbook Portfolio</span>
            <h3 className="font-serif text-2xl text-brand-cream italic font-normal">
              {showConfirmDelete ? 'Remove Lookbook' : 'Edit Outfit'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer p-1.5 hover:bg-slate-900 rounded-full transition-all">
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {wearSuccess && (
          <div className="bg-brand-emerald/10 border border-brand-emerald/20 text-emerald-400 text-xs p-3 rounded-xl mb-4">
            ✓ Logged as today's worn outfit in your calendar!
          </div>
        )}

        {showConfirmDelete ? (
          /* Custom Premium Deletion Confirmation Screen */
          <div className="space-y-6 text-center py-4">
            <div className="w-14 h-14 rounded-full bg-red-950/20 border border-red-900/30 flex items-center justify-center mx-auto">
              <svg className="w-5 h-5 text-red-450" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium uppercase tracking-widest text-slate-350">Confirm Deletion</h4>
              <p className="text-[11px] text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed font-light">
                Are you sure you want to remove "{outfit.name}" from your Lookbooks? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1 py-3 bg-slate-950 border border-slate-900 text-xs uppercase tracking-widest font-semibold rounded-full text-slate-455 hover:text-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                disabled={deleting}
                className="flex-1 py-3 bg-red-800 hover:bg-red-700 text-xs uppercase tracking-widest font-semibold rounded-full text-white shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Delete Outfit'}
              </button>
            </div>
          </div>
        ) : (
          /* Form Edit Layout */
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-2">
                  Outfit Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Summer Night Vibes"
                  className="w-full bg-[#0A0E1A] border border-slate-900 rounded-xl px-4 py-2.5 text-xs focus:border-brand-bronze/50 outline-none text-slate-350"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-2">
                  Occasion
                </label>
                <select
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  className="w-full bg-[#0A0E1A] border border-slate-900 rounded-xl px-4 py-2.5 text-xs focus:border-brand-bronze/50 outline-none text-slate-350"
                >
                  {OCCASIONS.map(occ => (
                    <option key={occ} value={occ}>{occ}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Assembled Items List */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-3">
                Included Pieces ({selectedItems.length})
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {selectedItems.map(item => (
                  <div key={item.id} className="bg-slate-950 border border-slate-850 p-2.5 rounded-2xl flex flex-col relative group">
                    <div className="aspect-[3/4] rounded-xl overflow-hidden bg-[#0C0F18]">
                      <img
                        src={item.imageUrl}
                        alt={item.category}
                        className={`h-full w-full ${getItemImageFitClass(item.category, 'p-2')}`}
                      />
                    </div>
                    <div className="pt-2 px-1 flex flex-col">
                      <span className="text-[8px] uppercase tracking-widest font-mono text-brand-bronze">{item.category}</span>
                      <span className="text-[11px] font-semibold text-slate-300 truncate mt-0.5">{item.subCategory || 'Standard'}</span>
                    </div>

                    <div className="flex gap-1.5 mt-2 pt-2 border-t border-slate-900">
                      <button
                        type="button"
                        onClick={() => setSwappingItem(item)}
                        className="flex-1 py-1 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-[8px] uppercase tracking-wider font-mono text-slate-300 rounded-md transition-colors"
                      >
                        Swap
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="px-2 py-1 bg-red-950/30 border border-red-900/40 hover:bg-red-950 text-[8px] uppercase tracking-wider font-mono text-red-400 rounded-md transition-colors"
                        title="Remove piece"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Swap Piece Selection Drawer */}
            {swappingItem && (
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-900 space-y-3 transition-all">
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
                      !selectedItems.some(i => i.id === item.id)
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
                            className={`h-full w-full ${getItemImageFitClass(alternativeItem.category, 'p-1')}`}
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
                    !selectedItems.some(i => i.id === item.id)
                  ).length === 0 && (
                    <span className="text-[11px] text-slate-500 italic py-3 font-light">
                      No alternative {swappingItem.category} options in your closet.
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-4 pt-4 border-t border-slate-900">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleWearToday}
                  disabled={loading || wearSuccess}
                  className="px-4 py-3 bg-brand-emerald/20 hover:bg-brand-emerald border border-brand-emerald/40 text-emerald-300 hover:text-white text-xs uppercase tracking-widest font-bold rounded-full transition-all disabled:opacity-50 cursor-pointer"
                >
                  {wearSuccess ? "✓ Logged Today" : "Wear Today"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-slate-950 border border-slate-900 text-xs uppercase tracking-widest font-semibold rounded-full text-slate-455 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-brand-emerald hover:bg-[#20362D] text-xs uppercase tracking-widest font-semibold rounded-full text-brand-cream shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
              
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="w-full py-3 bg-[#1E0F15] hover:bg-[#34121F] border border-red-950/40 hover:border-red-900/60 text-red-400 text-xs uppercase tracking-widest font-semibold rounded-full transition-all cursor-pointer"
              >
                Delete Outfit
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
