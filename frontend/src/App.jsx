import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';

function LandingPage() {
  const token = localStorage.getItem('token');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-fuchsia-500 selection:text-white relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.1)_0,transparent_60%)] pointer-events-none" />

      <main className="relative z-10 max-w-4xl text-center flex flex-col items-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-fuchsia-500/30 bg-fuchsia-950/20 text-fuchsia-400 text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-fuchsia-400 animate-pulse" />
          Intelligent Fashion Management
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent drop-shadow-sm">
          Luga Wardrobe
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl font-light leading-relaxed">
          Catalog your clothing, plan custom outfits, and generate AI-driven fashion recommendations.
        </p>

        <div className="pt-4 flex items-center gap-4">
          {token ? (
            <Link
              to="/dashboard"
              className="px-6 py-3 rounded-xl font-medium bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 active:scale-95 transition-all shadow-lg shadow-fuchsia-950/50"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-6 py-3 rounded-xl font-medium bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 active:scale-95 transition-all shadow-lg shadow-fuchsia-950/50"
              >
                Get Started
              </Link>
              <Link
                to="/signup"
                className="px-6 py-3 rounded-xl font-medium bg-slate-900 border border-slate-800 hover:bg-slate-800/80 active:scale-95 transition-all text-slate-300"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl pt-10">
          {[
            { name: "Smart Cataloging", desc: "Scan and organize clothes" },
            { name: "Outfit Builder", desc: "Create perfect combinations" },
            { name: "AI Recommendations", desc: "Personalized styling advice" },
            { name: "Cloud Sync", desc: "Secure multi-device access" }
          ].map((tech) => (
            <div key={tech.name} className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md hover:border-slate-700 transition-colors text-left">
              <div className="font-semibold text-slate-200">{tech.name}</div>
              <div className="text-xs text-slate-500 mt-1">{tech.desc}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
