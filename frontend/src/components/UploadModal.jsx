import { useState } from 'react';
import apiClient from '../api/apiClient';

const CATEGORIES = ['Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Accessories'];

export default function UploadModal({ isOpen, onClose, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [category, setCategory] = useState('Tops');
  const [subCategory, setSubCategory] = useState('');
  const [primaryColor, setPrimaryColor] = useState('Black');
  const [aiDescription, setAiDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        setError('Please select an image file.');
        return;
      }
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select an image to upload.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Step 1: Request pre-signed URL from backend
      const presignedData = await apiClient.post('/upload/presigned-url', {
        fileType: file.type,
        fileName: file.name,
      });

      const { uploadUrl, publicUrl, key } = presignedData.data;

      // Step 2: Upload file binary directly to Cloudflare R2
      const r2UploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!r2UploadRes.ok) {
        throw new Error('Failed to upload file to storage server.');
      }

      // Step 3: Save metadata & imageUrl in PostgreSQL database
      await apiClient.post('/clothing', {
        imageUrl: publicUrl,
        key,
        category,
        subCategory: subCategory || null,
        primaryColor,
        aiDescription: aiDescription || null,
      });

      // Success
      onUploadSuccess();
      onClose();
      // Reset form
      setFile(null);
      setPreview('');
      setCategory('Tops');
      setSubCategory('');
      setPrimaryColor('Black');
      setAiDescription('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
            Add Clothing Piece
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

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* File Picker */}
          <div className="flex flex-col items-center justify-center border border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/50 rounded-2xl p-6 transition-colors relative group">
            {preview ? (
              <div className="relative w-full flex flex-col items-center">
                <img src={preview} alt="Preview" className="max-h-48 rounded-xl object-contain" />
                <button
                  type="button"
                  onClick={() => { setFile(null); setPreview(''); }}
                  className="absolute top-2 right-2 bg-slate-950/80 hover:bg-slate-950 text-xs px-2.5 py-1.5 rounded-lg border border-slate-800 text-slate-400 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center cursor-pointer py-4 w-full">
                <svg className="w-8 h-8 text-slate-500 mb-2 group-hover:text-slate-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs text-slate-400">Upload Image File</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
            )}
          </div>

          {/* Category SELECT */}
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
              placeholder="e.g., Black, White, Red, Blue"
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
              placeholder="Add details about fit, season, or material"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:border-fuchsia-500 outline-none text-slate-300 h-20 resize-none"
            />
          </div>

          {/* Action Buttons */}
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
              className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-xs font-semibold rounded-xl text-slate-100 shadow-md transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Uploading Piece...' : 'Save to Wardrobe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
