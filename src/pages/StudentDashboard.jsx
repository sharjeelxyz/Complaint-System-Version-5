import { useState, useEffect } from 'react';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import {
  LogOut, Plus, Clock, CheckCircle2, AlertTriangle, FileText,
  ChevronDown, ChevronUp, Send, UserCheck, MessageSquare,
  GraduationCap, X, AlertCircle,
} from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { format } from 'date-fns';

const CATS = [
  'Infrastructure','Academic','Administration','Hostel','Canteen / Mess',
  'Library','Transport','Sports & Recreation','IT / Internet','Safety & Security','Other',
];
const PRI = [
  { v:'low',    l:'Low',    cls:'badge-green'  },
  { v:'medium', l:'Medium', cls:'badge-yellow' },
  { v:'high',   l:'High',   cls:'badge-red'    },
];
const EMPTY = { title:'', category:'', priority:'medium', description:'', location:'' };

export default function StudentDashboard() {
  const { currentUser, userProfile, logout } = useAuth();
  const [tab,  setTab]  = useState('submit');
  const [data, setData] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [ok,   setOk]   = useState(false);
  const [err,  setErr]  = useState('');
  const [exp,  setExp]  = useState(null);   // expanded row id
  const [mob,  setMob]  = useState(false);  // mobile sidebar open

  useEffect(() => {
    if (!currentUser) return;
    return onSnapshot(
      query(collection(db,'complaints'), where('userId','==',currentUser.uid), orderBy('createdAt','desc')),
      s => setData(s.docs.map(d => ({ id:d.id, ...d.data() }))),
      e => console.error(e),
    );
  }, [currentUser]);

  function sf(k,v) { setForm(p=>({...p,[k]:v})); setErr(''); }

  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim())               return setErr('Please enter a complaint title.');
    if (!form.category)                   return setErr('Please select a category.');
    if (form.description.trim().length<20) return setErr('Description must be at least 20 characters.');
    setBusy(true); setErr('');
    try {
      await addDoc(collection(db,'complaints'), {
        userId:currentUser.uid, userName:userProfile?.name||'Unknown',
        department:userProfile?.department||'Unknown', email:currentUser.email,
        title:form.title.trim(), category:form.category, priority:form.priority,
        description:form.description.trim(), location:form.location.trim(),
        status:'pending', adminNote:'', assignedTo:null,
        createdAt:serverTimestamp(), updatedAt:serverTimestamp(),
      });
      setForm(EMPTY); setOk(true); setTab('history');
      setTimeout(()=>setOk(false),5000);
    } catch(e){ console.error(e); setErr('Submission failed. Please try again.'); }
    finally { setBusy(false); }
  }

  const stats = {
    total:      data.length,
    pending:    data.filter(c=>c.status==='pending').length,
    inProgress: data.filter(c=>c.status==='in_progress').length,
    completed:  data.filter(c=>c.status==='completed').length,
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/10 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
          <GraduationCap className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm leading-tight">CMS Portal</p>
          <p className="text-blue-200 text-xs">Student</p>
        </div>
      </div>

      {/* User */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-white font-bold text-xs">
          {userProfile?.name?.[0]?.toUpperCase()||'S'}
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">{userProfile?.name||'Student'}</p>
          <p className="text-blue-200 text-xs truncate">{userProfile?.department}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 flex flex-col gap-0.5">
        <button onClick={()=>{setTab('submit');setMob(false);}}
          className={`nav-item ${tab==='submit'?'active':''}`}>
          <Plus className="w-4 h-4 shrink-0" /> New Complaint
        </button>
        <button onClick={()=>{setTab('history');setMob(false);}}
          className={`nav-item ${tab==='history'?'active':''}`}>
          <Clock className="w-4 h-4 shrink-0" /> My Complaints
          {stats.total>0 && (
            <span className="ml-auto bg-white/20 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full">
              {stats.total}
            </span>
          )}
        </button>
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/10">
        <button onClick={logout}
          className="nav-item w-full text-red-300 hover:bg-red-500/20 hover:text-red-200">
          <LogOut className="w-4 h-4 shrink-0" /> Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-56 flex-col fixed top-0 left-0 h-full z-30 shrink-0"
        style={{ background:'linear-gradient(180deg,#1e3a8a,#1d4ed8)' }}>
        <SidebarContent />
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      {mob && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setMob(false)} />
          <aside className="absolute left-0 top-0 h-full w-56 flex flex-col z-50"
            style={{ background:'linear-gradient(180deg,#1e3a8a,#1d4ed8)' }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── Main ── */}
      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">

        {/* Mobile topbar */}
        <header className="md:hidden sticky top-0 z-20 bg-white border-b border-slate-200 px-4 h-12 flex items-center justify-between">
          <button onClick={()=>setMob(true)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <span className="font-semibold text-sm text-slate-900">CMS Portal</span>
          <button onClick={logout} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500">
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        <main className="flex-1 p-4 md:p-6 max-w-5xl w-full mx-auto">

          {/* Page heading */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="ptitle">{tab==='submit' ? 'New Complaint' : 'My Complaints'}</h1>
              <p className="text-slate-500 text-sm mt-0.5">
                {tab==='submit' ? 'Fill out the form to submit a new complaint' : 'Track status of your submitted complaints'}
              </p>
            </div>
          </div>

          {/* ── Stat row ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { l:'Total',       v:stats.total,       c:'text-slate-900' },
              { l:'Pending',     v:stats.pending,     c:'text-amber-600' },
              { l:'In Progress', v:stats.inProgress,  c:'text-blue-600'  },
              { l:'Completed',   v:stats.completed,   c:'text-emerald-600' },
            ].map(s=>(
              <div key={s.l} className="stat-card">
                <p className={`text-2xl font-bold ${s.c}`}>{s.v}</p>
                <p className="text-xs text-slate-500 font-medium">{s.l}</p>
              </div>
            ))}
          </div>

          {/* Success */}
          {ok && (
            <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-3 py-2.5 mb-4 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Complaint submitted successfully!
              <button onClick={()=>setOk(false)} className="ml-auto text-emerald-500 hover:text-emerald-700"><X className="w-4 h-4"/></button>
            </div>
          )}

          {/* ══════ SUBMIT FORM ══════ */}
          {tab==='submit' && (
            <div className="card fade-in">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <FileText className="w-4 h-4 text-blue-500" />
                <span className="stitle">Submit Complaint</span>
              </div>
              <div className="p-5">
                {err && (
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2.5 mb-4 text-sm slide-up">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{err}
                  </div>
                )}
                <form onSubmit={submit} className="flex flex-col gap-4">
                  <div>
                    <label className="lbl">Complaint Title <span className="text-red-500">*</span></label>
                    <input type="text" placeholder="e.g. Broken projector in Room 204"
                      value={form.title} onChange={e=>sf('title',e.target.value)} className="inp" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="lbl">Category <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <select value={form.category} onChange={e=>sf('category',e.target.value)}
                          className="inp pr-8 appearance-none">
                          <option value="">Select category…</option>
                          {CATS.map(c=><option key={c} value={c}>{c}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="lbl">Priority</label>
                      <div className="flex gap-2">
                        {PRI.map(p=>(
                          <button type="button" key={p.v} onClick={()=>sf('priority',p.v)}
                            className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all duration-150
                              ${form.priority===p.v
                                ? p.v==='high'   ? 'bg-red-50 border-red-300 text-red-700'
                                : p.v==='medium' ? 'bg-amber-50 border-amber-300 text-amber-700'
                                :                  'bg-emerald-50 border-emerald-300 text-emerald-700'
                                : 'border-slate-200 text-slate-500 bg-white hover:bg-slate-50'}`}>
                            {p.l}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="lbl">
                      Location / Area
                      <span className="text-slate-400 font-normal ml-1">(optional)</span>
                    </label>
                    <input type="text" placeholder="e.g. Block A – Room 204"
                      value={form.location} onChange={e=>sf('location',e.target.value)} className="inp" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="lbl mb-0">Description <span className="text-red-500">*</span></label>
                      <span className={`text-xs font-medium ${form.description.length<20?'text-red-400':'text-emerald-600'}`}>
                        {form.description.length} chars {form.description.length>=20?'✓':'(min 20)'}
                      </span>
                    </div>
                    <textarea rows={5}
                      placeholder="Describe the issue in detail — what happened, when, how it affects you, and what resolution you expect."
                      value={form.description} onChange={e=>sf('description',e.target.value)}
                      className="inp" />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button type="submit" disabled={busy} className="btn-primary flex-1">
                      {busy
                        ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>Submitting…</>
                        : <><Send className="w-3.5 h-3.5"/>Submit Complaint</>}
                    </button>
                    <button type="button" onClick={()=>setForm(EMPTY)} className="btn-secondary px-4">Clear</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ══════ HISTORY TABLE ══════ */}
          {tab==='history' && (
            <div className="card fade-in overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="stitle">Complaint History</span>
                </div>
                <span className="badge badge-slate">{data.length} total</span>
              </div>

              {data.length===0 ? (
                <div className="p-16 text-center">
                  <FileText className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                  <p className="font-medium text-slate-400 text-sm mb-1">No complaints yet</p>
                  <p className="text-slate-300 text-xs mb-4">Submit your first complaint to get started</p>
                  <button onClick={()=>setTab('submit')} className="btn-primary btn-sm mx-auto">New Complaint</button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map(c=>{
                        const isExp = exp===c.id;
                        const pc = PRI.find(p=>p.v===c.priority);
                        return (
                          <>
                            <tr key={c.id} className="cursor-pointer" onClick={()=>setExp(isExp?null:c.id)}>
                              <td className="max-w-[200px]">
                                <p className="font-medium text-slate-900 truncate">{c.title}</p>
                                {c.location && <p className="text-xs text-slate-400 mt-0.5 truncate">📍 {c.location}</p>}
                              </td>
                              <td><span className="badge badge-slate">{c.category}</span></td>
                              <td><span className={`badge ${pc?.cls||'badge-slate'}`}>{pc?.l||c.priority}</span></td>
                              <td><StatusBadge status={c.status} /></td>
                              <td className="whitespace-nowrap text-slate-400 text-xs">
                                {c.createdAt?.toDate ? format(c.createdAt.toDate(),'dd MMM yyyy') : '—'}
                              </td>
                              <td className="text-right">
                                {isExp
                                  ? <ChevronUp className="w-4 h-4 text-slate-400 inline"/>
                                  : <ChevronDown className="w-4 h-4 text-slate-400 inline"/>}
                              </td>
                            </tr>
                            {isExp && (
                              <tr key={c.id+'-exp'} className="!border-b-0 !hover:bg-white">
                                <td colSpan={6} className="bg-slate-50 px-5 py-4 !border-b border-slate-200">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description</p>
                                      <p className="text-sm text-slate-700 leading-relaxed">{c.description}</p>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                      {c.assignedTo && (
                                        <div className="flex items-center gap-2.5 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2.5">
                                          <UserCheck className="w-4 h-4 text-purple-500 shrink-0" />
                                          <div>
                                            <p className="text-xs font-semibold text-purple-700">Assigned To</p>
                                            <p className="text-sm text-purple-900">{c.assignedTo.name} <span className="text-purple-400">· {c.assignedTo.role}</span></p>
                                          </div>
                                        </div>
                                      )}
                                      {c.adminNote ? (
                                        <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
                                          <MessageSquare className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                          <div>
                                            <p className="text-xs font-semibold text-blue-700 mb-1">Admin Response</p>
                                            <p className="text-sm text-blue-900">{c.adminNote}</p>
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-xs text-slate-400 italic">No admin response yet.</p>
                                      )}
                                      {c.updatedAt?.toDate && c.status!=='pending' && (
                                        <p className="text-xs text-slate-400">
                                          Last updated: {format(c.updatedAt.toDate(),'dd MMM yyyy, hh:mm a')}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Footer credit */}
          <p className="text-center text-xs text-slate-400 mt-6">
            Made by <span className="font-semibold text-slate-500">Sharjeel</span>
            &nbsp;·&nbsp; CMS Portal © {new Date().getFullYear()}
          </p>
        </main>
      </div>
    </div>
  );
}
