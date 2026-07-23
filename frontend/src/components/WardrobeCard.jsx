import { getItemImageFitClass } from '../utils/imageUtils';

export default function WardrobeCard({ item, onClick }) {
  return (
    <div
      onClick={onClick}
      className="group relative bg-slate-900/10 border border-slate-900/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-slate-800/80 transition-all duration-300 flex flex-col cursor-pointer"
    >
      {/* Portrait Image frame */}
      <div className="aspect-[3/4] overflow-hidden bg-[#0A0D14] relative">
        <img
          src={item.imageUrl}
          alt={item.category}
          loading="lazy"
          className={`w-full h-full group-hover:scale-105 transition-transform duration-700 ease-out ${getItemImageFitClass(
            item.category,
            'p-3'
          )}`}
        />
        {/* Category Tag Badge */}
        <span className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur-sm border border-slate-900 text-[9px] uppercase tracking-widest font-mono text-slate-300 px-2.5 py-1 rounded-full">
          {item.category}
        </span>
        {/* Floating Wear Count Badge */}
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
          <span>
            Worn: <strong className="text-brand-sand font-bold">{item.wearCount || 0}x</strong>
          </span>
          <span>
            {item.lastWornAt ? `Last: ${new Date(item.lastWornAt).toLocaleDateString()}` : 'Unworn'}
          </span>
        </div>
      </div>
    </div>
  );
}
