import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { AlertTriangle, CheckCircle2, ChevronRight, Clock3, ListChecks, RefreshCw, ShieldCheck } from 'lucide-react';
import apiClient from '@/services/apiClient';
import { RoleBasedNavigation } from './RoleBasedNavigation';
import { useGovernanceRefresh } from '@/hooks/useGovernanceRefresh';
import { useCanonicalEvidenceSummary } from '@/hooks/useCanonicalEvidenceSummary';
import { CanonicalEvidenceStrip } from './canonical/CanonicalEvidenceStrip';

type Priority='URGENT'|'DUE'|'NORMAL';
type State='NEEDS_YOU'|'WAITING'|'COMPLETE';
type GuidedWorkItem={
  id:string; state:State; priority:Priority; taskType:string; title:string; summary:string; reason:string;
  dueAt?:string|null; ownerName?:string|null; serviceName?:string|null; canonicalEntityType:string; canonicalEntityId:string;
  route:string; actionLabel:string; whyAmISeeingThis:string;
};
type QueueData={needsYou:GuidedWorkItem[];waiting:GuidedWorkItem[];completedToday:GuidedWorkItem[];counts:{needsYou:number;waiting:number;completedToday:number};next?:GuidedWorkItem|null};

const priorityClass:Record<Priority,string>={URGENT:'border-red-300 bg-red-50',DUE:'border-amber-300 bg-amber-50',NORMAL:'border-border bg-card'};
const priorityText:Record<Priority,string>={URGENT:'text-red-700',DUE:'text-amber-700',NORMAL:'text-primary'};
const fmt=(v?:string|null)=>v?new Date(v).toLocaleString(undefined,{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'';

export function MyWork(){
  const navigate=useNavigate();
  const location=useLocation();
  const [data,setData]=useState<QueueData>({needsYou:[],waiting:[],completedToday:[],counts:{needsYou:0,waiting:0,completedToday:0}});
  const [tab,setTab]=useState<State>('NEEDS_YOU');
  const [loading,setLoading]=useState(true);
  const [expanded,setExpanded]=useState<string|null>(null);
  const user=useMemo(()=>{try{return JSON.parse(localStorage.getItem('user')||'{}')}catch{return {}}},[]);
  const role=String(user.role||localStorage.getItem('userRole')||'').toUpperCase().replace(/-/g,'_');
  const canDoDailyGovernance=['REGISTERED_MANAGER','ADMIN','SUPER_ADMIN'].includes(role);
  const {data:evidenceSummary}=useCanonicalEvidenceSummary();
  const firstName=user.first_name||(user.name?String(user.name).split(' ')[0]:'');

  // Only the FIRST load shows the full-screen spinner. Every later call (the governance-refresh poll
  // / socket event) updates the list silently — otherwise each refresh blanked the page to a spinner
  // and back, which reads as the screen "twitching"/reloading itself.
  const didInitialLoadRef=useRef(false);
  const load=async()=>{const first=!didInitialLoadRef.current;if(first)setLoading(true);try{const res=await apiClient.get('/guided-work');setData(res.data?.data||data);}catch{if(first)setData({needsYou:[],waiting:[],completedToday:[],counts:{needsYou:0,waiting:0,completedToday:0}});}finally{if(first)setLoading(false);didInitialLoadRef.current=true;}};
  useEffect(()=>{load();},[location.key]);
  useGovernanceRefresh(load);

  const list=tab==='NEEDS_YOU'?data.needsYou:tab==='WAITING'?data.waiting:data.completedToday;
  const open=(item:GuidedWorkItem)=>navigate(item.route);

  return <div className="min-h-screen bg-background">
    <RoleBasedNavigation/>
    <div className="p-5 lg:px-10 pt-24 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><div className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Guided Work</div><h1 className="text-3xl font-bold text-foreground mt-1">{firstName?`${firstName}, `:''}here's what needs you.</h1><p className="text-muted-foreground mt-2">Ordin Core is showing the next work derived from existing governance records. No separate task lifecycle is created here.</p></div>
        <button onClick={load} className="min-h-10 px-3 rounded-lg border border-border inline-flex items-center gap-2 text-sm font-medium"><RefreshCw size={15}/>Refresh</button>
      </div>

      <div className="mt-6"><CanonicalEvidenceStrip summary={evidenceSummary} compact /></div>

      {canDoDailyGovernance && !loading && <button onClick={()=>navigate('/governance-dashboard')} className="mt-6 w-full text-left bg-primary/5 border border-primary/30 rounded-xl p-4 flex items-center gap-4 hover:bg-primary/10">
        <div className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><ShieldCheck size={20}/></div><div className="flex-1"><div className="font-semibold">Do Daily Governance</div><div className="text-xs text-muted-foreground">Existing RM Daily Oversight functions remain unchanged.</div></div><ChevronRight size={18} className="text-primary"/>
      </button>}

      <div className="mt-6 grid grid-cols-3 gap-3">
        <button onClick={()=>setTab('NEEDS_YOU')} className={`rounded-xl border p-4 text-left ${tab==='NEEDS_YOU'?'border-primary bg-primary/5':'border-border bg-card'}`}><div className="text-xs font-semibold text-muted-foreground">NEEDS YOU</div><div className="text-3xl font-bold mt-1">{data.counts.needsYou}</div></button>
        <button onClick={()=>setTab('WAITING')} className={`rounded-xl border p-4 text-left ${tab==='WAITING'?'border-primary bg-primary/5':'border-border bg-card'}`}><div className="text-xs font-semibold text-muted-foreground">WAITING</div><div className="text-3xl font-bold mt-1">{data.counts.waiting}</div></button>
        <button onClick={()=>setTab('COMPLETE')} className={`rounded-xl border p-4 text-left ${tab==='COMPLETE'?'border-primary bg-primary/5':'border-border bg-card'}`}><div className="text-xs font-semibold text-muted-foreground">COMPLETED TODAY</div><div className="text-3xl font-bold mt-1">{data.counts.completedToday}</div></button>
      </div>

      {loading?<div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"/></div>:
      list.length===0?<div className="mt-6 rounded-xl border border-border bg-card p-10 text-center"><CheckCircle2 size={30} className="mx-auto text-emerald-600"/><h2 className="text-xl font-semibold mt-3">Nothing in this queue</h2><p className="text-muted-foreground mt-1">There is no work in this state right now.</p></div>:
      <div className="mt-6 space-y-3">{list.map((item,idx)=><article key={item.id} className={`rounded-xl border p-4 ${item.state==='NEEDS_YOU'?priorityClass[item.priority]:'border-border bg-card'}`}>
        <div className="flex gap-4 items-start">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.priority==='URGENT'?'bg-red-600 text-white':item.priority==='DUE'?'bg-amber-500 text-white':'bg-primary/10 text-primary'}`}>{item.state==='WAITING'?<Clock3 size={18}/>:item.priority==='URGENT'?<AlertTriangle size={18}/>:<ListChecks size={18}/>}</div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><span className={`text-xs font-bold ${priorityText[item.priority]}`}>{item.priority}</span>{item.serviceName&&<span className="text-xs text-muted-foreground">• {item.serviceName}</span>}{idx===0&&tab==='NEEDS_YOU'&&<span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-semibold">Next</span>}</div>
            <h2 className="font-semibold text-foreground mt-1">{item.title}</h2><p className="text-sm text-muted-foreground mt-1">{item.summary}</p>
            {item.dueAt&&<div className="text-xs text-muted-foreground mt-2">Due/review: {fmt(item.dueAt)}</div>}
            {expanded===item.id&&<div className="mt-3 rounded-lg bg-background/70 border border-border p-3 text-sm"><div className="font-semibold">Why am I seeing this?</div><div className="text-muted-foreground mt-1">{item.whyAmISeeingThis}</div><div className="font-semibold mt-3">What happens next?</div><div className="text-muted-foreground mt-1">Open the existing canonical screen and complete the normal Ordin Core function there.</div></div>}
          </div>
          <div className="flex flex-col gap-2 shrink-0"><button onClick={()=>open(item)} className="min-h-10 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-1">{item.actionLabel}<ChevronRight size={15}/></button><button onClick={()=>setExpanded(expanded===item.id?null:item.id)} className="text-xs text-primary">Why?</button></div>
        </div>
      </article>)}</div>}

      <div className="mt-6 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">Guided Work only <strong>reads, prioritises, routes and refreshes</strong>. Governance decisions, completions, escalations, effectiveness ratings, closures and approvals still occur through the existing canonical Ordin Core screens and APIs.</div>
    </div>
  </div>
}
export default MyWork;
