import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (!token || !savedUser) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    } else {
      setUser(JSON.parse(savedUser));
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center justify-center relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.06)_0,transparent_60%)] pointer-events-none" />

      <div className="w-full max-w-2xl bg-slate-900/40 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl relative z-10 text-center space-y-6">
        <div className="w-16 h-16 bg-gradient-to-tr from-violet-600 to-fuchsia-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto shadow-lg shadow-fuchsia-500/20">
          {user.email[0].toUpperCase()}
        </div>

        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
            Your Digital Wardrobe
          </h1>
          <p className="text-slate-400 mt-2">Logged in as: {user.email}</p>
        </div>

        <div className="border border-dashed border-slate-800 rounded-2xl p-6 bg-slate-950/40">
          <p className="text-sm text-slate-500">
            Welcome to Luga! Your smart dashboard will load catalogued clothes, custom outfits, and AI styling soon.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="px-6 py-3 bg-slate-900 border border-slate-800 hover:bg-slate-800/80 rounded-xl font-medium text-sm text-slate-300 active:scale-95 transition-all cursor-pointer"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
