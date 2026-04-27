import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, User, Mail, Lock, GraduationCap, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const DEPARTMENTS = [
  'Computer Science', 'Mechanical Engineering', 'Civil Engineering',
  'Electronics & Communication', 'Information Technology',
  'Electrical Engineering', 'Chemical Engineering', 'MBA', 'MCA', 'Other',
];

export default function AuthPage() {
  const [mode,    setMode]    = useState('login');
  const [form,    setForm]    = useState({ name:'', department:'', email:'', password:'', confirm:'' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sp,      setSp]      = useState(false);
  const [sp2,     setSp2]     = useState(false);
  const { signup, login }     = useAuth();
  const navigate              = useNavigate();

  function sf(k, v) { setForm(f => ({ ...f, [k]: v })); setError(''); }

  function switchMode(m) {
    setMode(m); setError('');
    setForm({ name:'', department:'', email:'', password:'', confirm:'' });
  }

  async function submit(e) {
    e.preventDefault(); setError('');
    if (mode === 'signup') {
      if (!form.name.trim())             return setError('Full name is required.');
      if (!form.department)              return setError('Please select your department.');
      if (form.password.length < 6)      return setError('Password must be at least 6 characters.');
      if (form.password !== form.confirm) return setError('Passwords do not match.');
    }
    setLoading(true);
    try {
      if (mode === 'signup') await signup({ name: form.name.trim(), department: form.department, email: form.email, password: form.password });
      else                   await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      const m = {
        'auth/email-already-in-use': 'This email is already registered.',
        'auth/user-not-found':       'No account found with this email.',
        'auth/wrong-password':       'Incorrect password.',
        'auth/invalid-email':        'Please enter a valid email address.',
        'auth/invalid-credential':   'Invalid email or password.',
        'auth/too-many-requests':    'Too many attempts. Try again later.',
      };
      setError(m[err.code] || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">

      {/* Card */}
      <div className="w-full max-w-[400px] fade-in">

        {/* Logo mark */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center mb-3 shadow-sm">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">CMS Portal</h1>
          <p className="text-sm text-slate-500 mt-0.5">College Complaint Management</p>
        </div>

        <div className="card p-6">
          {/* Tab switcher */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 mb-6">
            {[['login','Sign In'],['signup','Create Account']].map(([m, label]) => (
              <button key={m} type="button" onClick={() => switchMode(m)}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all duration-150
                  ${mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2.5 mb-4 text-sm slide-up">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={submit} className="flex flex-col gap-4">

            {mode === 'signup' && (
              <>
                <div>
                  <label className="lbl">Full Name <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <input type="text" placeholder="Your full name" required
                      value={form.name} onChange={e => sf('name', e.target.value)}
                      className="inp pl-9" />
                  </div>
                </div>
                <div>
                  <label className="lbl">Department <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select required value={form.department} onChange={e => sf('department', e.target.value)}
                      className="inp pr-8 appearance-none">
                      <option value="">Select your department…</option>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="lbl">Email Address <span className="text-red-500">*</span></label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input type="email" placeholder="you@college.edu" required
                  value={form.email} onChange={e => sf('email', e.target.value)}
                  className="inp pl-9" />
              </div>
            </div>

            <div>
              <label className="lbl">Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input type={sp ? 'text' : 'password'} placeholder="••••••••" required
                  value={form.password} onChange={e => sf('password', e.target.value)}
                  className="inp pl-9 pr-9" />
                <button type="button" onClick={() => setSp(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {sp ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="lbl">Confirm Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input type={sp2 ? 'text' : 'password'} placeholder="••••••••" required
                    value={form.confirm} onChange={e => sf('confirm', e.target.value)}
                    className="inp pl-9 pr-9" />
                  <button type="button" onClick={() => setSp2(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {sp2 ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
              {loading
                ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing…</>
                : <>{mode === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight className="w-3.5 h-3.5" /></>}
            </button>
          </form>
        </div>

        {/* Footer credit */}
        <p className="text-center text-xs text-slate-400 mt-5">
          Made by <span className="font-semibold text-slate-500">Sharjeel</span>
          &nbsp;·&nbsp; CMS Portal © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
