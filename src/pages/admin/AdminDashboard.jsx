import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection, query, orderBy, onSnapshot, updateDoc, doc,
  limit, startAfter, getDocs, where, addDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, BarChart3, LogOut, Shield,
  Clock, CheckCircle2, AlertCircle, TrendingUp, Search,
  ChevronDown, ChevronUp, X, MessageSquare, Calendar,
  Loader2, UserPlus, Users, Trash2, Plus, UserCheck,
  Wrench, RefreshCw,
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import { format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts';

/* ── Constants ── */
const PAGE_SIZE = 15;
const STATUSES  = ['pending','in_progress','completed','rejected'];
const S_LABELS  = { pending:'Pending', in_progress:'In Progress', completed:'Completed', rejected:'Rejected' };
const CATS = [
  'All','Infrastructure','Academic','Administration','Hostel','Canteen / Mess',
  'Library','Transport','Sports & Recreation','IT / Internet','Safety & Security','Other',
];
const W_ROLES = [
  'Electrician','Plumber','Carpenter','IT Technician','Housekeeping',
  'Security','Maintenance Staff','Academic Coordinator','Administrative Staff','Transport Staff','Other',
];
const CC = ['#3b82f6','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4'];
const TICK = { fontFamily:'Inter,sans-serif', fontSize:11, fill:'#94a3b8' };
const TT   = { fontFamily:'Inter,sans-serif', fontSize:12, border:'1px solid #e2e8f0', borderRadius:8, boxShadow:'0 2px 8px rgb(0 0 0/.08)' };

const PRI_CFG = {
  high:   { cls:'badge-red',    l:'High'   },
  medium: { cls:'badge-yellow', l:'Medium' },
  low:    { cls:'badge-green',  l:'Low'    },
};

const NAV = [
  { id:'dashboard',  l:'Dashboard',  I:LayoutDashboard },
  { id:'complaints', l:'Complaints', I:FileText        },
  { id:'workers',    l:'Workers',    I:Users           },
  { id:'analytics',  l:'Analytics',  I:BarChart3       },
];

export default function AdminDashboard() {
  const { logout } = useAuth();
  const nav        = useNavigate();
  const [tab,  setTab]  = useState('dashboard');
  const [mob,  setMob]  = useState(false);

  /* dashboard */
  const [recent, setRecent] = useState([]);
  const [ov,     setOv]     = useState({ total:0, pending:0, inProgress:0, completed:0, rejected:0 });

  /* complaints */
  const [rows,      setRows]      = useState([]);
  const [lastDoc,   setLastDoc]   = useState(null);
  const [hasMore,   setHasMore]   = useState(true);
  const [busy,      setBusy]      = useState(false);
  const [fStatus,   setFStatus]   = useState('all');
  const [fCat,      setFCat]      = useState('All');
  const [search,    setSearch]    = useState('');
  const [expId,     setExpId]     = useState(null);
  const [noteVal,   setNoteVal]   = useState('');
  const [updId,     setUpdId]     = useState(null);
  const [savNote,   setSavNote]   = useState(false);
  const loaderRef = useRef(null);

  /* workers */
  const [workers,   setWorkers]   = useState([]);
  const [wForm,     setWForm]     = useState(false);
  const [wf,        setWf]        = useState({ name:'', role:'', phone:'' });
  const [wBusy,     setWBusy]     = useState(false);
  const [wErr,      setWErr]      = useState('');

  /* assign */
  const [assigning, setAssigning] = useState(null);
  const [assLoad,   setAssLoad]   = useState(false);

  /* analytics */
  const [aData, setAData] = useState(null);

  /* ── real-time: overview + recent ── */
  useEffect(() => {
    const u1 = onSnapshot(
      query(collection(db,'complaints'), orderBy('createdAt','desc'), limit(5)),
      s => setRecent(s.docs.map(d=>({id:d.id,...d.data()}))),
    );
    const u2 = onSnapshot(query(collection(db,'complaints')), s => {
      const a = s.docs.map(d=>d.data());
      setOv({ total:a.length, pending:a.filter(c=>c.status==='pending').length,
               inProgress:a.filter(c=>c.status==='in_progress').length,
               completed:a.filter(c=>c.status==='completed').length,
               rejected:a.filter(c=>c.status==='rejected').length });
    });
    return ()=>{ u1(); u2(); };
  }, []);

  /* ── workers ── */
  useEffect(() => {
    return onSnapshot(query(collection(db,'workers'), orderBy('name','asc')),
      s => setWorkers(s.docs.map(d=>({id:d.id,...d.data()}))));
  }, []);

  /* ── complaints pagination ── */
  const buildQ = useCallback((after=null)=>{
    const col = collection(db,'complaints');
    const cs  = [orderBy('createdAt','desc')];
    if (fStatus!=='all') cs.unshift(where('status','==',fStatus));
    if (after) cs.push(startAfter(after));
    cs.push(limit(PAGE_SIZE));
    return query(col,...cs);
  },[fStatus]);

  const loadInit = useCallback(async()=>{
    setBusy(true);
    try {
      const s = await getDocs(buildQ());
      setRows(s.docs.map(d=>({id:d.id,...d.data()})));
      setLastDoc(s.docs[s.docs.length-1]??null);
      setHasMore(s.docs.length===PAGE_SIZE);
    } finally { setBusy(false); }
  },[buildQ]);

  useEffect(()=>{
    if (tab!=='complaints') return;
    setRows([]); setLastDoc(null); setHasMore(true); setExpId(null);
    loadInit();
  },[tab,fStatus]); // eslint-disable-line

  async function loadMore() {
    if (!hasMore||busy||!lastDoc) return;
    setBusy(true);
    try {
      const s = await getDocs(buildQ(lastDoc));
      setRows(p=>[...p,...s.docs.map(d=>({id:d.id,...d.data()}))]);
      setLastDoc(s.docs[s.docs.length-1]??null);
      setHasMore(s.docs.length===PAGE_SIZE);
    } finally { setBusy(false); }
  }

  useEffect(()=>{
    const el = loaderRef.current; if(!el) return;
    const obs = new IntersectionObserver(([e])=>{ if(e.isIntersecting) loadMore(); },{threshold:0.1});
    obs.observe(el);
    return ()=>obs.disconnect();
  });

  /* ── update status ── */
  async function updStatus(id,s) {
    setUpdId(id);
    try {
      await updateDoc(doc(db,'complaints',id),{status:s,updatedAt:serverTimestamp()});
      setRows(p=>p.map(c=>c.id===id?{...c,status:s}:c));
    } finally { setUpdId(null); }
  }

  /* ── save note ── */
  async function saveNote(id,n) {
    setSavNote(true);
    try {
      await updateDoc(doc(db,'complaints',id),{adminNote:n,updatedAt:serverTimestamp()});
      setRows(p=>p.map(c=>c.id===id?{...c,adminNote:n}:c));
    } finally { setSavNote(false); }
  }

  /* ── assign worker ── */
  async function assign(cid,w) {
    setAssLoad(true);
    try {
      const at = w?{id:w.id,name:w.name,role:w.role}:null;
      await updateDoc(doc(db,'complaints',cid),{
        assignedTo:at, status:w?'in_progress':'pending', updatedAt:serverTimestamp()
      });
      setRows(p=>p.map(c=>c.id===cid?{...c,assignedTo:at,status:w?'in_progress':'pending'}:c));
      setAssigning(null);
    } finally { setAssLoad(false); }
  }

  /* ── add worker ── */
  async function addWorker(e) {
    e.preventDefault();
    if (!wf.name.trim()) return setWErr('Name is required.');
    if (!wf.role)        return setWErr('Please select a role.');
    setWBusy(true); setWErr('');
    try {
      await addDoc(collection(db,'workers'),{...wf,name:wf.name.trim(),createdAt:serverTimestamp()});
      setWf({name:'',role:'',phone:''}); setWForm(false);
    } catch { setWErr('Failed to add worker.'); }
    finally { setWBusy(false); }
  }

  async function delWorker(id) {
    if (!confirm('Remove this worker?')) return;
    await deleteDoc(doc(db,'workers',id));
  }

  /* ── analytics ── */
  useEffect(()=>{
    if (tab!=='analytics') return;
    return onSnapshot(query(collection(db,'complaints')),s=>{
      const all = s.docs.map(d=>d.data());
      const cm={}, dm={};
      all.forEach(c=>{ cm[c.category]=(cm[c.category]||0)+1; dm[c.department]=(dm[c.department]||0)+1; });
      const now=new Date(), mm={};
      for(let i=5;i>=0;i--){ const d=new Date(now.getFullYear(),now.getMonth()-i,1); mm[format(d,'MMM yy')]=0; }
      all.forEach(c=>{ if(c.createdAt?.toDate){ const k=format(c.createdAt.toDate(),'MMM yy'); if(k in mm) mm[k]++; }});
      setAData({
        total:all.length,
        assignedCount:all.filter(c=>c.assignedTo).length,
        byStatus:[
          {name:'Pending',value:all.filter(c=>c.status==='pending').length},
          {name:'In Progress',value:all.filter(c=>c.status==='in_progress').length},
          {name:'Completed',value:all.filter(c=>c.status==='completed').length},
          {name:'Rejected',value:all.filter(c=>c.status==='rejected').length},
        ].filter(s=>s.value>0),
        byCategory:Object.entries(cm).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value),
        byDept:Object.entries(dm).map(([name,value])=>({name:name.split(' ')[0],full:name,value})).sort((a,b)=>b.value-a.value).slice(0,8),
        byPri:[
          {name:'High',value:all.filter(c=>c.priority==='high').length},
          {name:'Medium',value:all.filter(c=>c.priority==='medium').length},
          {name:'Low',value:all.filter(c=>c.priority==='low').length},
        ],
        trend:Object.entries(mm).map(([name,value])=>({name,value})),
      });
    });
  },[tab]);

  /* ── filter ── */
  const filtered = rows.filter(c=>{
    if (fCat!=='All' && c.category!==fCat) return false;
    if (search) {
      const s=search.toLowerCase();
      return c.title?.toLowerCase().includes(s)||c.userName?.toLowerCase().includes(s)||
             c.department?.toLowerCase().includes(s)||c.email?.toLowerCase().includes(s);
    }
    return true;
  });

  const SidebarContent = () => (
    <>
      <div className="px-4 py-5 border-b border-white/10 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{background:'linear-gradient(135deg,#2563eb,#4f46e5)'}}>
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-tight">CMS Admin</p>
          <p className="text-slate-400 text-xs">Control Panel</p>
        </div>
      </div>
      <nav className="flex-1 p-3 flex flex-col gap-0.5">
        {NAV.map(({id,l,I})=>(
          <button key={id} onClick={()=>{setTab(id);setMob(false);}}
            className={`nav-item ${tab===id?'active':''}`}>
            <I className="w-4 h-4 shrink-0" />
            {l}
            {id==='complaints' && ov.pending>0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {ov.pending}
              </span>
            )}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-white/10">
        <p className="px-3 mb-1 text-xs text-slate-500 font-medium">Administrator</p>
        <button onClick={()=>{logout();nav('/admin');}}
          className="nav-item w-full text-red-400 hover:bg-red-500/10 hover:text-red-300">
          <LogOut className="w-4 h-4 shrink-0" /> Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 flex-col fixed top-0 left-0 h-full z-30 shrink-0"
        style={{background:'linear-gradient(180deg,#0f172a,#1e293b)'}}>
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {mob && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={()=>setMob(false)} />
          <aside className="absolute left-0 top-0 h-full w-56 flex flex-col z-50"
            style={{background:'linear-gradient(180deg,#0f172a,#1e293b)'}}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">

        {/* Mobile topbar */}
        <header className="md:hidden sticky top-0 z-20 bg-white border-b border-slate-200 px-4 h-12 flex items-center justify-between">
          <button onClick={()=>setMob(true)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <span className="font-semibold text-sm text-slate-900">CMS Admin</span>
          <button onClick={()=>{logout();nav('/admin');}} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500">
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        <main className="flex-1 p-3 md:p-6 max-w-7xl w-full mx-auto">

          {/* ════════════════ DASHBOARD ════════════════ */}
          {tab==='dashboard' && (
            <div className="flex flex-col gap-4 md:gap-6 fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="ptitle">Dashboard</h1>
                  <p className="text-slate-500 text-sm mt-0.5">Overview of all complaints and activity</p>
                </div>
                <span className="badge badge-green">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                </span>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
                {[
                  {l:'Total',        v:ov.total,       sub:`${ov.rejected} rejected`,    c:'text-slate-900'},
                  {l:'Pending',      v:ov.pending,     sub:'Awaiting action',             c:'text-amber-600'},
                  {l:'In Progress',  v:ov.inProgress,  sub:'Being handled',               c:'text-blue-600'},
                  {l:'Completed',    v:ov.completed,   sub:`${ov.total>0?Math.round((ov.completed/ov.total)*100):0}% resolution rate`, c:'text-emerald-600'},
                ].map(s=>(
                  <div key={s.l} className="stat-card">
                    <p className={`text-2xl md:text-3xl font-bold ${s.c}`}>{s.v}</p>
                    <p className="text-xs font-medium text-slate-500">{s.l}</p>
                    <p className="text-xs text-slate-400 hidden sm:block">{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* Secondary row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
                <div className="stat-card">
                  <p className="text-xs font-semibold text-slate-500 mb-2">Resolution Rate</p>
                  <p className="text-2xl font-bold text-slate-900 mb-2">
                    {ov.total>0?Math.round((ov.completed/ov.total)*100):0}%
                  </p>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                      style={{width:`${ov.total>0?(ov.completed/ov.total)*100:0}%`}} />
                  </div>
                </div>
                <div className="stat-card bg-amber-50 border-amber-100">
                  <p className="text-xs font-semibold text-amber-600 mb-1">Needs Attention</p>
                  <p className="text-2xl font-bold text-amber-700">{ov.pending+ov.inProgress}</p>
                  <p className="text-xs text-amber-400 mt-1">Unresolved</p>
                </div>
                <div className="stat-card bg-purple-50 border-purple-100">
                  <p className="text-xs font-semibold text-purple-600 mb-1">Active Workers</p>
                  <p className="text-2xl font-bold text-purple-700">{workers.length}</p>
                  <p className="text-xs text-purple-400 mt-1">Registered</p>
                </div>
              </div>

              {/* Recent complaints — card list on mobile, table on desktop */}
              <div className="card overflow-hidden">
                <div className="px-4 md:px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                  <span className="stitle">Recent Complaints</span>
                  <button onClick={()=>setTab('complaints')} className="btn-secondary btn-sm">View All →</button>
                </div>
                {recent.length===0 ? (
                  <div className="p-10 text-center text-slate-400 text-sm">No complaints yet</div>
                ) : (
                  <>
                    {/* Mobile cards */}
                    <div className="md:hidden divide-y divide-slate-100">
                      {recent.map(c=>{
                        const pc=PRI_CFG[c.priority];
                        return (
                          <div key={c.id} className="p-4 flex flex-col gap-2">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-slate-900 text-sm leading-tight flex-1">{c.title}</p>
                              <StatusBadge status={c.status} />
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="badge badge-slate text-xs">{c.category}</span>
                              {pc&&<span className={`badge ${pc.cls} text-xs`}>{pc.l}</span>}
                              <span className="text-xs text-slate-400">
                                {c.createdAt?.toDate?format(c.createdAt.toDate(),'dd MMM yy'):'—'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">{c.userName} · {c.department}</p>
                            <div className="flex items-center gap-2 pt-1">
                              <button onClick={()=>setAssigning(c)} className="btn-secondary btn-sm flex-1 justify-center">
                                <UserPlus className="w-3 h-3"/>{c.assignedTo?'Reassign':'Assign'}
                              </button>
                              {STATUSES.filter(s=>s!==c.status).slice(0,1).map(s=>(
                                <button key={s} disabled={updId===c.id} onClick={()=>updStatus(c.id,s)}
                                  className="btn-primary btn-sm flex-1 justify-center">→ {S_LABELS[s]}</button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="tbl">
                        <thead><tr>
                          <th>Title</th><th>Student</th><th>Category</th><th>Priority</th><th>Status</th><th>Date</th><th>Actions</th>
                        </tr></thead>
                        <tbody>
                          {recent.map(c=>{
                            const pc=PRI_CFG[c.priority];
                            return (
                              <tr key={c.id}>
                                <td className="max-w-[180px]"><p className="font-medium text-slate-900 truncate">{c.title}</p></td>
                                <td>
                                  <p className="font-medium text-slate-800 text-xs">{c.userName}</p>
                                  <p className="text-slate-400 text-xs">{c.department}</p>
                                </td>
                                <td><span className="badge badge-slate">{c.category}</span></td>
                                <td>{pc&&<span className={`badge ${pc.cls}`}>{pc.l}</span>}</td>
                                <td><StatusBadge status={c.status} /></td>
                                <td className="whitespace-nowrap text-xs text-slate-400">
                                  {c.createdAt?.toDate?format(c.createdAt.toDate(),'dd MMM yy'):'—'}
                                </td>
                                <td>
                                  <div className="flex items-center gap-1.5">
                                    <button onClick={()=>setAssigning(c)} className="btn-secondary btn-sm">
                                      <UserPlus className="w-3 h-3"/>{c.assignedTo?'Reassign':'Assign'}
                                    </button>
                                    {STATUSES.filter(s=>s!==c.status).slice(0,1).map(s=>(
                                      <button key={s} disabled={updId===c.id} onClick={()=>updStatus(c.id,s)}
                                        className="btn-primary btn-sm">→ {S_LABELS[s]}</button>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ════════════════ COMPLAINTS ════════════════ */}
          {tab==='complaints' && (
            <div className="flex flex-col gap-4 md:gap-5 fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="ptitle">All Complaints</h1>
                  <p className="text-slate-500 text-sm mt-0.5">{filtered.length} shown</p>
                </div>
                <button onClick={loadInit} className="btn-secondary btn-sm gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5"/> Refresh
                </button>
              </div>

              {/* Filters */}
              <div className="card p-3 flex flex-col gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input placeholder="Search title, name, dept, email…"
                    value={search} onChange={e=>setSearch(e.target.value)}
                    className="inp pl-9 w-full" />
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select value={fStatus} onChange={e=>setFStatus(e.target.value)}
                      className="inp pr-8 appearance-none w-full">
                      <option value="all">All Statuses</option>
                      {STATUSES.map(s=><option key={s} value={s}>{S_LABELS[s]}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  </div>
                  <div className="relative flex-1">
                    <select value={fCat} onChange={e=>setFCat(e.target.value)}
                      className="inp pr-8 appearance-none w-full">
                      {CATS.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  </div>
                  {(fStatus!=='all'||fCat!=='All'||search)&&(
                    <button onClick={()=>{setFStatus('all');setFCat('All');setSearch('');}}
                      className="btn-danger btn-sm gap-1 shrink-0">
                      <X className="w-3.5 h-3.5"/>
                      <span className="hidden sm:inline">Clear</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Complaints list */}
              <div className="card overflow-hidden">
                {busy&&rows.length===0 ? (
                  <Spin />
                ) : filtered.length===0 ? (
                  <div className="p-12 text-center text-slate-400 text-sm">No complaints match your filters.</div>
                ) : (
                  <>
                    {/* ── Mobile: card list ── */}
                    <div className="md:hidden divide-y divide-slate-100">
                      {filtered.map(c=>{
                        const pc=PRI_CFG[c.priority];
                        const isExp=expId===c.id;
                        return (
                          <div key={c.id} className="p-4 flex flex-col gap-3">
                            {/* Header row */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 text-sm leading-tight">{c.title}</p>
                                {c.location&&<p className="text-xs text-slate-400 mt-0.5 truncate">📍 {c.location}</p>}
                              </div>
                              <button
                                onClick={()=>{const o=expId!==c.id;setExpId(o?c.id:null);if(o)setNoteVal(c.adminNote||'');}}
                                className="btn-ghost btn-sm p-1.5 shrink-0">
                                {isExp?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}
                              </button>
                            </div>

                            {/* Meta */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="badge badge-slate text-xs">{c.category}</span>
                              {pc&&<span className={`badge ${pc.cls} text-xs`}>{pc.l}</span>}
                              <StatusBadge status={c.status}/>
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span>{c.userName} · {c.department}</span>
                              <span className="text-slate-400">{c.createdAt?.toDate?format(c.createdAt.toDate(),'dd MMM yy'):'—'}</span>
                            </div>
                            {c.assignedTo&&(
                              <span className="badge badge-purple self-start"><UserCheck className="w-3 h-3"/>{c.assignedTo.name}</span>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              <div className="relative flex-1">
                                <select
                                  value={c.status}
                                  disabled={updId===c.id}
                                  onChange={e=>updStatus(c.id,e.target.value)}
                                  className="text-xs font-medium border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-700
                                             outline-none focus:border-blue-400 cursor-pointer disabled:opacity-40 w-full appearance-none pr-6">
                                  {STATUSES.map(s=><option key={s} value={s}>{S_LABELS[s]}</option>)}
                                </select>
                                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                              </div>
                              <button onClick={()=>setAssigning(c)} className="btn-secondary btn-sm flex-1 justify-center">
                                <UserPlus className="w-3 h-3"/>{c.assignedTo?'Re-assign':'Assign'}
                              </button>
                            </div>

                            {/* Expanded panel */}
                            {isExp&&(
                              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 flex flex-col gap-3 mt-1">
                                <div>
                                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Description</p>
                                  <p className="text-sm text-slate-700 leading-relaxed">{c.description}</p>
                                  <p className="text-xs text-slate-400 mt-1">Email: {c.email}</p>
                                  {c.assignedTo&&(
                                    <div className="flex items-center gap-2 mt-2 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                                      <UserCheck className="w-4 h-4 text-purple-500 shrink-0"/>
                                      <p className="text-sm text-purple-900 font-medium">{c.assignedTo.name}
                                        <span className="text-purple-400 font-normal ml-1">· {c.assignedTo.role}</span>
                                      </p>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <label className="lbl">
                                    Admin Response Note
                                    <span className="text-slate-400 font-normal ml-1">(visible to student)</span>
                                  </label>
                                  <textarea rows={3} value={noteVal} onChange={e=>setNoteVal(e.target.value)}
                                    placeholder="Write a response for the student…"
                                    className="inp mb-2 w-full" />
                                  <button onClick={()=>saveNote(c.id,noteVal)} disabled={savNote}
                                    className="btn-primary btn-sm w-full justify-center">
                                    {savNote?<><Loader2 className="w-3.5 h-3.5 animate-spin"/>Saving…</>:'Save Note'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* ── Desktop: table ── */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="tbl">
                        <thead><tr>
                          <th>Title</th><th>Student</th><th>Category</th>
                          <th>Priority</th><th>Status</th><th>Assigned</th>
                          <th>Date</th><th>Actions</th>
                        </tr></thead>
                        <tbody>
                          {filtered.map(c=>{
                            const pc=PRI_CFG[c.priority];
                            const isExp=expId===c.id;
                            return (
                              <>
                                <tr key={c.id}>
                                  <td className="max-w-[160px]">
                                    <p className="font-medium text-slate-900 truncate">{c.title}</p>
                                    {c.location&&<p className="text-xs text-slate-400 mt-0.5 truncate">📍 {c.location}</p>}
                                  </td>
                                  <td>
                                    <p className="font-medium text-slate-800 text-xs whitespace-nowrap">{c.userName}</p>
                                    <p className="text-slate-400 text-xs">{c.department}</p>
                                  </td>
                                  <td><span className="badge badge-slate whitespace-nowrap">{c.category}</span></td>
                                  <td>{pc&&<span className={`badge ${pc.cls}`}>{pc.l}</span>}</td>
                                  <td><StatusBadge status={c.status}/></td>
                                  <td>
                                    {c.assignedTo
                                      ? <span className="badge badge-purple"><UserCheck className="w-3 h-3"/>{c.assignedTo.name}</span>
                                      : <span className="text-xs text-slate-400">—</span>}
                                  </td>
                                  <td className="whitespace-nowrap text-xs text-slate-400">
                                    {c.createdAt?.toDate?format(c.createdAt.toDate(),'dd MMM yy'):'—'}
                                  </td>
                                  <td>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <div className="relative">
                                        <select
                                          value={c.status}
                                          disabled={updId===c.id}
                                          onChange={e=>updStatus(c.id,e.target.value)}
                                          className="text-xs font-medium border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700
                                                     outline-none focus:border-blue-400 cursor-pointer disabled:opacity-40 pr-6 appearance-none">
                                          {STATUSES.map(s=><option key={s} value={s}>{S_LABELS[s]}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                                      </div>
                                      <button onClick={()=>setAssigning(c)} className="btn-secondary btn-sm">
                                        <UserPlus className="w-3 h-3"/>{c.assignedTo?'Re':'Assign'}
                                      </button>
                                      <button onClick={()=>{const o=expId!==c.id;setExpId(o?c.id:null);if(o)setNoteVal(c.adminNote||'');}}
                                        className="btn-ghost btn-sm p-1.5">
                                        {isExp?<ChevronUp className="w-3.5 h-3.5"/>:<ChevronDown className="w-3.5 h-3.5"/>}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                                {isExp&&(
                                  <tr key={c.id+'-exp'} className="!border-b !border-slate-200">
                                    <td colSpan={8} className="bg-slate-50 px-5 py-4">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description</p>
                                          <p className="text-sm text-slate-700 leading-relaxed">{c.description}</p>
                                          <p className="text-xs text-slate-400 mt-2">Email: {c.email}</p>
                                          {c.assignedTo&&(
                                            <div className="flex items-center gap-2 mt-3 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                                              <UserCheck className="w-4 h-4 text-purple-500 shrink-0"/>
                                              <p className="text-sm text-purple-900 font-medium">{c.assignedTo.name}
                                                <span className="text-purple-400 font-normal ml-1">· {c.assignedTo.role}</span>
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                        <div>
                                          <label className="lbl">
                                            Admin Response Note
                                            <span className="text-slate-400 font-normal ml-1">(visible to student)</span>
                                          </label>
                                          <textarea rows={3} value={noteVal} onChange={e=>setNoteVal(e.target.value)}
                                            placeholder="Write a response for the student…"
                                            className="inp mb-2" />
                                          <button onClick={()=>saveNote(c.id,noteVal)} disabled={savNote}
                                            className="btn-primary btn-sm">
                                            {savNote?<><Loader2 className="w-3.5 h-3.5 animate-spin"/>Saving…</>:'Save Note'}
                                          </button>
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
                  </>
                )}

                {/* Infinite scroll sentinel */}
                <div ref={loaderRef} className="py-4 flex justify-center border-t border-slate-100">
                  {busy&&rows.length>0&&<Spin/>}
                  {!hasMore&&filtered.length>0&&<p className="text-xs text-slate-400">All {rows.length} loaded</p>}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════ WORKERS ════════════════ */}
          {tab==='workers' && (
            <div className="flex flex-col gap-4 md:gap-5 fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="ptitle">Workers & Staff</h1>
                  <p className="text-slate-500 text-sm mt-0.5">{workers.length} registered</p>
                </div>
                <button onClick={()=>{setWForm(v=>!v);setWErr('');}}
                  className={wForm?'btn-secondary btn-sm':'btn-primary btn-sm'}>
                  {wForm?<><X className="w-3.5 h-3.5"/>Cancel</>:<><Plus className="w-3.5 h-3.5"/>Add Worker</>}
                </button>
              </div>

              {/* Add worker form */}
              {wForm&&(
                <div className="card p-4 md:p-5 slide-up">
                  <p className="stitle mb-4 flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-blue-500"/>Register New Worker
                  </p>
                  {wErr&&(
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2.5 mb-4 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0"/>{wErr}
                    </div>
                  )}
                  <form onSubmit={addWorker} className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="lbl">Full Name <span className="text-red-500">*</span></label>
                        <input type="text" placeholder="e.g. Ramesh Kumar" required
                          value={wf.name} onChange={e=>{setWf(p=>({...p,name:e.target.value}));setWErr('');}}
                          className="inp w-full" />
                      </div>
                      <div>
                        <label className="lbl">Role <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <select required value={wf.role} onChange={e=>{setWf(p=>({...p,role:e.target.value}));setWErr('');}}
                            className="inp pr-8 appearance-none w-full">
                            <option value="">Select role…</option>
                            {W_ROLES.map(r=><option key={r} value={r}>{r}</option>)}
                          </select>
                          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"/>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="lbl">Phone <span className="text-slate-400 font-normal">(optional)</span></label>
                      <input type="tel" placeholder="9876543210"
                        value={wf.phone} onChange={e=>setWf(p=>({...p,phone:e.target.value}))}
                        className="inp w-full" />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button type="submit" disabled={wBusy} className="btn-primary flex-1 justify-center">
                        {wBusy?<><Loader2 className="w-4 h-4 animate-spin"/>Saving…</>:<><UserPlus className="w-4 h-4"/>Register</>}
                      </button>
                      <button type="button" onClick={()=>setWForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              {/* Workers list */}
              <div className="card overflow-hidden">
                {workers.length===0 ? (
                  <div className="p-12 text-center">
                    <Users className="w-10 h-10 mx-auto mb-3 text-slate-200"/>
                    <p className="font-medium text-slate-400 text-sm">No workers registered yet</p>
                    <p className="text-xs text-slate-300 mt-1">Click "Add Worker" to register your first staff member</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile cards */}
                    <div className="md:hidden divide-y divide-slate-100">
                      {workers.map((w,i)=>(
                        <div key={w.id} className="flex items-center gap-3 p-4">
                          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                            <span className="text-blue-600 font-bold text-sm">{w.name[0]}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 text-sm truncate">{w.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="badge badge-blue text-xs">{w.role}</span>
                              {w.phone&&<span className="text-xs text-slate-400">{w.phone}</span>}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {w.createdAt?.toDate?format(w.createdAt.toDate(),'dd MMM yyyy'):'—'}
                            </p>
                          </div>
                          <button onClick={()=>delWorker(w.id)}
                            className="btn-ghost btn-sm text-slate-400 hover:text-red-600 p-2 shrink-0">
                            <Trash2 className="w-4 h-4"/>
                          </button>
                        </div>
                      ))}
                    </div>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="tbl">
                        <thead><tr><th>#</th><th>Name</th><th>Role</th><th>Phone</th><th>Added</th><th></th></tr></thead>
                        <tbody>
                          {workers.map((w,i)=>(
                            <tr key={w.id}>
                              <td className="text-slate-400 font-medium">{i+1}</td>
                              <td>
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                    <span className="text-blue-600 font-bold text-xs">{w.name[0]}</span>
                                  </div>
                                  <span className="font-medium text-slate-900">{w.name}</span>
                                </div>
                              </td>
                              <td><span className="badge badge-blue">{w.role}</span></td>
                              <td className="text-slate-500">{w.phone||<span className="text-slate-300">—</span>}</td>
                              <td className="text-xs text-slate-400 whitespace-nowrap">
                                {w.createdAt?.toDate?format(w.createdAt.toDate(),'dd MMM yyyy'):'—'}
                              </td>
                              <td>
                                <button onClick={()=>delWorker(w.id)}
                                  className="btn-ghost btn-sm text-slate-400 hover:text-red-600 p-1.5">
                                  <Trash2 className="w-3.5 h-3.5"/>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ════════════════ ANALYTICS ════════════════ */}
          {tab==='analytics' && (
            <div className="flex flex-col gap-4 md:gap-5 fade-in">
              <div>
                <h1 className="ptitle">Analytics</h1>
                <p className="text-slate-500 text-sm mt-0.5">Complaint trends and resolution insights</p>
              </div>

              {!aData ? <Spin/> : (<>
                {/* KPI strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
                  {[
                    {l:'Total',v:aData.total},
                    {l:'Resolved',v:aData.byStatus.find(s=>s.name==='Completed')?.value||0},
                    {l:'Resolution %',v:aData.total>0?Math.round(((aData.byStatus.find(s=>s.name==='Completed')?.value||0)/aData.total)*100)+'%':'0%'},
                    {l:'Assigned',v:aData.assignedCount},
                  ].map(s=>(
                    <div key={s.l} className="stat-card">
                      <p className="text-xl md:text-2xl font-bold text-slate-900">{s.v}</p>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">{s.l}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                  {/* Monthly trend */}
                  <div className="card p-4 md:p-5">
                    <p className="text-sm font-semibold text-slate-700 mb-3 md:mb-4">Monthly Trend</p>
                    <ResponsiveContainer width="100%" height={170}>
                      <LineChart data={aData.trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={TICK} axisLine={false} tickLine={false}/>
                        <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false}/>
                        <Tooltip contentStyle={TT}/>
                        <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2}
                          dot={{r:3,fill:'#3b82f6',strokeWidth:2,stroke:'#fff'}}/>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Status pie */}
                  <div className="card p-4 md:p-5">
                    <p className="text-sm font-semibold text-slate-700 mb-3 md:mb-4">Status Distribution</p>
                    {aData.byStatus.length===0?<NoData/>:
                      <ResponsiveContainer width="100%" height={170}>
                        <PieChart>
                          <Pie data={aData.byStatus} dataKey="value" nameKey="name"
                            cx="50%" cy="50%" outerRadius={60} innerRadius={25} paddingAngle={3}>
                            {aData.byStatus.map((_,i)=><Cell key={i} fill={CC[i%CC.length]} strokeWidth={0}/>)}
                          </Pie>
                          <Tooltip contentStyle={TT}/>
                          <Legend iconType="circle" iconSize={7}
                            formatter={v=><span style={{fontSize:11,color:'#64748b',fontFamily:'Inter,sans-serif'}}>{v}</span>}/>
                        </PieChart>
                      </ResponsiveContainer>}
                  </div>

                  {/* By category */}
                  <div className="card p-4 md:p-5">
                    <p className="text-sm font-semibold text-slate-700 mb-3 md:mb-4">By Category</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={aData.byCategory.slice(0,7)} layout="vertical">
                        <XAxis type="number" tick={TICK} axisLine={false} tickLine={false} allowDecimals={false}/>
                        <YAxis type="category" dataKey="name" width={95} tick={{...TICK,fontSize:9}} axisLine={false} tickLine={false}/>
                        <Tooltip contentStyle={TT}/>
                        <Bar dataKey="value" fill="#3b82f6" radius={[0,3,3,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* By department */}
                  <div className="card p-4 md:p-5">
                    <p className="text-sm font-semibold text-slate-700 mb-3 md:mb-4">By Department</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={aData.byDept}>
                        <XAxis dataKey="name" tick={{...TICK,fontSize:9}} axisLine={false} tickLine={false}/>
                        <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false}/>
                        <Tooltip contentStyle={TT} formatter={(v,_,p)=>[v,p.payload.full||p.payload.name]}/>
                        <Bar dataKey="value" fill="#8b5cf6" radius={[3,3,0,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Priority breakdown */}
                <div className="card overflow-hidden">
                  <div className="px-4 md:px-5 py-3.5 border-b border-slate-100">
                    <p className="stitle">Priority Breakdown</p>
                  </div>
                  {/* Mobile priority cards */}
                  <div className="md:hidden divide-y divide-slate-100">
                    {aData.byPri.map((p,i)=>{
                      const pct = aData.total>0?Math.round((p.value/aData.total)*100):0;
                      const barColor = i===0?'bg-red-400':i===1?'bg-amber-400':'bg-emerald-400';
                      return (
                        <div key={p.name} className="px-4 py-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`badge ${i===0?'badge-red':i===1?'badge-yellow':'badge-green'}`}>{p.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">{p.value}</span>
                              <span className="text-slate-400 text-xs">{pct}%</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${barColor} rounded-full`} style={{width:`${pct}%`}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="tbl">
                      <thead><tr><th>Priority</th><th>Count</th><th>Share</th><th>Distribution</th></tr></thead>
                      <tbody>
                        {aData.byPri.map((p,i)=>{
                          const pct = aData.total>0?Math.round((p.value/aData.total)*100):0;
                          const barColor = i===0?'bg-red-400':i===1?'bg-amber-400':'bg-emerald-400';
                          return (
                            <tr key={p.name}>
                              <td><span className={`badge ${i===0?'badge-red':i===1?'badge-yellow':'badge-green'}`}>{p.name}</span></td>
                              <td className="font-semibold text-slate-900">{p.value}</td>
                              <td className="text-slate-500">{pct}%</td>
                              <td className="w-40">
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full ${barColor} rounded-full`} style={{width:`${pct}%`}}/>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>)}
            </div>
          )}

          {/* Footer */}
          <p className="text-center text-xs text-slate-400 mt-8">
            Made by <span className="font-semibold text-slate-500">Sharjeel</span>
            &nbsp;·&nbsp; CMS Admin © {new Date().getFullYear()}
          </p>
        </main>
      </div>

      {/* ════════════════ ASSIGN MODAL ════════════════ */}
      {assigning && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{backgroundColor:'rgba(15,23,42,0.55)',backdropFilter:'blur(3px)'}}>
          <div className="bg-white w-full sm:max-w-md sm:rounded-xl shadow-2xl slide-up overflow-hidden
                          rounded-t-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <div>
                <p className="font-semibold text-slate-900">Assign Complaint</p>
                <p className="text-xs text-slate-400 mt-0.5">Select a worker to handle this</p>
              </div>
              <button onClick={()=>setAssigning(null)} disabled={assLoad}
                className="btn-ghost p-1.5"><X className="w-4 h-4"/></button>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 shrink-0">
              <p className="font-medium text-slate-900 text-sm">{assigning.title}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="badge badge-slate">{assigning.category}</span>
                <span className="text-xs text-slate-400">{assigning.department}</span>
              </div>
            </div>

            <div className="px-5 py-4 overflow-y-auto flex-1">
              {workers.length===0 ? (
                <div className="py-8 text-center">
                  <Users className="w-8 h-8 mx-auto mb-2 text-slate-200"/>
                  <p className="text-sm text-slate-400">No workers registered</p>
                  <p className="text-xs text-slate-300">Go to Workers tab to add staff first</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {workers.map(w=>{
                    const sel = assigning.assignedTo?.id===w.id;
                    return (
                      <button key={w.id} disabled={assLoad}
                        onClick={()=>assign(assigning.id,w)}
                        className={`flex items-center justify-between px-3.5 py-3 rounded-lg border-2 text-left transition-all duration-150 disabled:opacity-50
                          ${sel?'border-blue-300 bg-blue-50':'border-slate-100 hover:border-blue-200 hover:bg-slate-50'}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                            <span className="text-slate-600 font-bold text-xs">{w.name[0]}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">{w.name}</p>
                            <p className="text-xs text-slate-400">{w.role}{w.phone&&` · ${w.phone}`}</p>
                          </div>
                        </div>
                        {sel&&<UserCheck className="w-4 h-4 text-blue-500 shrink-0"/>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {assigning.assignedTo&&(
              <div className="px-5 pb-5 shrink-0">
                <button onClick={()=>assign(assigning.id,null)} disabled={assLoad}
                  className="btn-secondary w-full text-red-600 hover:border-red-200 hover:bg-red-50 justify-center">
                  <X className="w-4 h-4"/> Remove Assignment
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Spin() {
  return (
    <div className="flex items-center justify-center gap-2.5 py-10 text-slate-400 text-sm">
      <Loader2 className="w-4 h-4 animate-spin"/> Loading…
    </div>
  );
}
function NoData() {
  return <div className="h-[170px] flex items-center justify-center text-sm text-slate-300">No data yet</div>;
}