import { getItemImageFitClass } from '../utils/imageUtils';

const ROTATIONS = [
  'rotate-[-6deg] z-10 group-hover:rotate-0',
  'rotate-[4deg] z-20 group-hover:rotate-0',
  'rotate-[9deg] z-30 group-hover:rotate-0',
  'rotate-[-2deg] z-40 group-hover:rotate-0',
];

export default function OutfitCard({ outfit, onClick, onWearToday }) {
  return (
    <div
      onClick={onClick}
      className="bg-slate-900/10 border border-slate-900/80 hover:border-slate-800/80 rounded-3xl p-6 flex flex-col gap-6 transition-all duration-500 cursor-pointer group overflow-hidden"
    >
      {/* Header section */}
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-serif text-2xl text-brand-sand italic font-normal tracking-wide group-hover:text-brand-cream transition-colors">
            {outfit.name}
          </h4>
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
              if (onWearToday) onWearToday(outfit.id);
            }}
            className="px-3.5 py-1 bg-brand-emerald/20 hover:bg-brand-emerald border border-brand-emerald/40 text-emerald-300 hover:text-white text-[9px] uppercase tracking-widest font-mono rounded-full transition-all cursor-pointer shadow-sm"
          >
            Wear Today
          </button>
        </div>
      </div>

      {/* Playful Stacked Deck Fan-Out Container */}
      <div className="flex items-center justify-start py-4 px-2 overflow-x-auto no-scrollbar min-h-[220px]">
        {outfit.outfitItems.map((item, idx) => (
          <div
            key={item.clothingItem.id}
            className={`w-28 sm:w-32 flex-shrink-0 bg-slate-950 border border-slate-850 p-2.5 rounded-2xl shadow-xl transition-all duration-500 ease-out transform ${
              idx > 0 ? '-ml-14 sm:-ml-16 group-hover:ml-3' : ''
            } ${ROTATIONS[idx % ROTATIONS.length]} group-hover:scale-105 group-hover:shadow-2xl`}
          >
            <div className="aspect-[3/4] rounded-xl overflow-hidden bg-[#0D111A]">
              <img
                src={item.clothingItem.imageUrl}
                alt={item.clothingItem.category}
                className={`h-full w-full ${getItemImageFitClass(item.clothingItem.category, 'p-2')}`}
              />
            </div>
            <div className="pt-2 px-1 text-left">
              <span className="text-[8px] uppercase tracking-widest font-mono text-brand-bronze block truncate">
                {item.clothingItem.category}
              </span>
              {item.clothingItem.subCategory && (
                <span className="text-[10px] font-semibold text-slate-300 block truncate mt-0.5">
                  {item.clothingItem.subCategory}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
