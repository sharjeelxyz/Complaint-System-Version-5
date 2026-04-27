import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AdminLogin() {
  const [email, setEmail]     = useState('');
  const [pass,  setPass]      = useState('');
  const [show,  setShow]      = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { login, currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser || userProfile === null) return;
    navigate(userProfile.role === 'admin' ? '/admin/dashboard' : '/dashboard', { replace: true });
  }, [currentUser, userProfile, navigate]);

  async function submit(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(email, pass); }
    catch (err) {
      const m = {
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/user-not-found':      'No account found.',
        'auth/wrong-password':      'Incorrect password.',
        'auth/too-many-requests':   'Too many attempts. Try again later.',
      };
      setError(m[err.code] || 'Login failed.');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[380px] fade-in">

        <div className="flex flex-col items-center mb-8">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
            style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)', boxShadow:'0 4px 14px rgba(79,70,229,.4)' }}>
            <Shield className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-white">Admin Portal</h1>
          <p className="text-sm text-slate-400 mt-0.5">Authorised personnel only</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          {error && (
            <div className="flex items-start gap-2.5 bg-red-950/60 border border-red-900/60 text-red-400 rounded-lg px-3 py-2.5 mb-4 text-sm slide-up">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                <input type="email" required placeholder="admin@college.edu"
                  value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                  className="w-full pl-9 pr-3 py-2 text-sm text-white bg-slate-800 border border-slate-700 rounded-lg outline-none placeholder:text-slate-500
                             focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-150" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                <input type={show ? 'text' : 'password'} required placeholder="••••••••"
                  value={pass} onChange={e => { setPass(e.target.value); setError(''); }}
                  className="w-full pl-9 pr-9 py-2 text-sm text-white bg-slate-800 border border-slate-700 rounded-lg outline-none placeholder:text-slate-500
                             focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-150" />
                <button type="button" onClick={() => setShow(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-white rounded-lg mt-1
                         transition-all duration-150 disabled:opacity-50 active:scale-[0.98]"
              style={{ background:'linear-gradient(135deg,#2563eb,#4f46e5)', boxShadow:'0 2px 8px rgba(37,99,235,.35)' }}>
              {loading
                ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Signing in…</>
                : <>Access Dashboard <ArrowRight className="w-3.5 h-3.5" /></>}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-5">
          Made by <span className="font-semibold text-slate-500">Sharjeel</span>
          &nbsp;·&nbsp; CMS Admin © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
