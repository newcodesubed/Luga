import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-fuchsia-500 selection:text-white">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.1)_0,transparent_60%)] pointer-events-none" />

      <main className="relative z-10 max-w-4xl text-center flex flex-col items-center space-y-8">
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-fuchsia-500/30 bg-fuchsia-950/20 text-fuchsia-400 text-sm font-medium animate-pulse">
          <span className="w-2 h-2 rounded-full bg-fuchsia-400" />
          Tailwind v4 & React Scaffolding Complete
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent drop-shadow-sm">
          Luga Wardrobe
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl font-light leading-relaxed">
          Your intelligent digital wardrobe. Seamlessly catalog clothing, manage outfits, and generate AI-driven fashion recommendations.
        </p>

        {/* Interactive Element */}
        <div className="pt-4 flex flex-col items-center gap-4">
          <button
            onClick={() => setCount((c) => c + 1)}
            className="px-6 py-3 rounded-xl font-medium bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 active:scale-95 transition-all shadow-lg shadow-fuchsia-950/50 cursor-pointer"
          >
            Interactions Logged: {count}
          </button>
          
          <div className="text-xs text-slate-500 font-mono">
            Vite HMR is active. Edit <span className="text-fuchsia-400">src/App.jsx</span> to update.
          </div>
        </div>

        {/* Tech Stack Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl pt-10">
          {[
            { name: "React", desc: "Component Library" },
            { name: "Vite", desc: "Build Tooling" },
            { name: "Tailwind v4", desc: "Styling Framework" },
            { name: "PostgreSQL", desc: "Data Persistence" }
          ].map((tech) => (
            <div key={tech.name} className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md hover:border-slate-700 transition-colors">
              <div className="font-semibold text-slate-200">{tech.name}</div>
              <div className="text-xs text-slate-500 mt-1">{tech.desc}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default App
