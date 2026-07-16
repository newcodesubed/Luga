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

  // Pre-fill form when modal opens with a specific item
  useEffect(() => {
    if (item) {
      setCategory(item.category);
      setSubCategory(item.subCategory || '');
      setPrimaryColor(item.primaryColor);
      setAiDescription(item.aiDescription || '');
      setError('');
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

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this piece from your wardrobe?')) {
      return;
    }

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
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Edit Item Details
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

        <div className="flex gap-4 mb-6 p-4 bg-slate-950/40 border border-slate-800/60 rounded-2xl">
          <img src={item.imageUrl} alt="Preview" className="w-20 h-20 rounded-xl object-cover border border-slate-800" />
          <div className="flex flex-col justify-center">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Currently</span>
            <span className="text-sm font-semibold text-slate-300">{item.category}</span>
            {item.subCategory && <span className="text-xs text-slate-500">{item.subCategory}</span>}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Category */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:border-fuchsia-500 outline-none text-slate-300"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Subcategory */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Sub-Category (Optional)
            </label>
            <input
              type="text"
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              placeholder="e.g., Slim-fit, Hoodie, Denim"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:border-fuchsia-500 outline-none text-slate-300"
            />
          </div>

          {/* Primary Color */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Primary Color
            </label>
            <input
              type="text"
              required
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="e.g., Black, White, Red"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:border-fuchsia-500 outline-none text-slate-300"
            />
          </div>

          {/* AI / Custom Description */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={aiDescription}
              onChange={(e) => setAiDescription(e.target.value)}
              placeholder="Add details about fit, material or styling instructions"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:border-fuchsia-500 outline-none text-slate-300 h-20 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-slate-950 border border-slate-800 text-xs font-semibold rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || deleting}
                className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-xs font-semibold rounded-xl text-slate-100 shadow-md transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
            
            <button
              type="button"
              disabled={loading || deleting}
              onClick={handleDelete}
              className="w-full py-3 bg-red-950/20 border border-red-900/30 hover:border-red-900/60 hover:bg-red-950/40 text-red-400 text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              {deleting ? 'Deleting...' : 'Delete Piece'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
