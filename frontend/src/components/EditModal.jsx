import { useState, useEffect } from 'react';

const CATEGORIES = ['Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Accessories'];

export default function EditModal({ isOpen, onClose, onSuccess, item }) {
  const [category, setCategory] = useState('Tops');
  const [subCategory, setSubCategory] = useState('');
  const [primaryColor, setPrimaryColor] = useState('Black');
  const [aiDescription, setAiDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Pre-fill form when modal opens with a specific item
  useEffect(() => {
    if (item) {
      setCategory(item.category);
      setSubCategory(item.subCategory || '');
      setPrimaryColor(item.primaryColor);
      setAiDescription(item.aiDescription || '');
      setError('');
      setShowConfirmDelete(false);
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/clothing/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          category,
          subCategory: subCategory || null,
          primaryColor,
          aiDescription: aiDescription || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to update clothing item');
      }

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
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/clothing/${item.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete clothing item');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
      setShowConfirmDelete(false); // Back to edit view on error so they see it
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Content - Luxury Editorial Theme */}
      <div className="relative w-full max-w-lg bg-[#0F172A] border border-slate-900 rounded-3xl p-8 shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-900">
          <div>
            <span className="text-[9px] uppercase tracking-[0.25em] font-medium text-brand-bronze block mb-1">Wardrobe Piece</span>
            <h3 className="font-serif text-2xl text-brand-cream italic font-normal">
              {showConfirmDelete ? 'Remove Piece' : 'Edit Details'}
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
                Are you sure you want to remove this piece? This action is permanent and will delete it from your gallery and saved lookbooks.
              </p>
            </div>
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1 py-3 bg-slate-950 border border-slate-900 text-xs uppercase tracking-widest font-semibold rounded-full text-slate-450 hover:text-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                disabled={deleting}
                className="flex-1 py-3 bg-red-800 hover:bg-red-700 text-xs uppercase tracking-widest font-semibold rounded-full text-white shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Delete Piece'}
              </button>
            </div>
          </div>
        ) : (
          /* Custom Form Edit Layout */
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex gap-4 p-3 bg-slate-950/40 border border-slate-900/60 rounded-2xl mb-2 items-center">
              <img src={item.imageUrl} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-slate-900" />
              <div className="flex flex-col text-left">
                <span className="text-[8px] uppercase tracking-widest font-mono text-slate-500">Current Category</span>
                <span className="text-xs font-semibold text-slate-350">{item.category}</span>
                {item.subCategory && <span className="text-[11px] text-slate-500 font-light mt-0.5">{item.subCategory}</span>}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#0A0E1A] border border-slate-900 rounded-xl px-4 py-2.5 text-xs focus:border-brand-bronze/50 outline-none text-slate-350"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Subcategory */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-2">
                Sub-Category (Optional)
              </label>
              <input
                type="text"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                placeholder="e.g., Slim-fit, Hoodie, Denim"
                className="w-full bg-[#0A0E1A] border border-slate-900 rounded-xl px-4 py-2.5 text-xs focus:border-brand-bronze/50 outline-none text-slate-350"
              />
            </div>

            {/* Primary Color */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-2">
                Primary Color
              </label>
              <input
                type="text"
                required
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="e.g., Black, White, Red"
                className="w-full bg-[#0A0E1A] border border-slate-900 rounded-xl px-4 py-2.5 text-xs focus:border-brand-bronze/50 outline-none text-slate-350"
              />
            </div>

            {/* AI / Custom Description */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={aiDescription}
                onChange={(e) => setAiDescription(e.target.value)}
                placeholder="Details about style, material, fit or brand"
                className="w-full bg-[#0A0E1A] border border-slate-900 rounded-xl px-4 py-2.5 text-xs focus:border-brand-bronze/50 outline-none text-slate-350 h-20 resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-4 pt-4 border-t border-slate-900">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-slate-950 border border-slate-900 text-xs uppercase tracking-widest font-semibold rounded-full text-slate-450 hover:text-slate-200 transition-colors cursor-pointer"
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
                Delete Piece
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
