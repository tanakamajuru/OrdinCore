import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronRight } from 'lucide-react';
import type { CanonicalEvidenceSummary } from '@/hooks/useCanonicalEvidenceSummary';

const LABELS:any={
  RISK_REVIEW:'Risk reviews',
  ACTION_OPEN:'Open actions',
  EFFECTIVENESS_REVIEW:'Effectiveness due',
  ESCALATION_OPEN:'Open escalations',
  PATTERN_REVIEW:'Pattern reviews'
};
// Where a single evidence record opens.
const routeFor=(type:string,id:string)=>{
  if(type==='RISK_REVIEW') return `/risk-register/${id}`;
  if(type==='ACTION_OPEN') return `/my-actions?focus=${id}`;
  if(type==='EFFECTIVENESS_REVIEW') return `/effectiveness?focus=${id}`;
  if(type==='ESCALATION_OPEN') return `/escalation-log?focus=${id}`;
  if(type==='PATTERN_REVIEW') return `/systemic-patterns?clusterId=${id}`;
  return '#';
};
// Where the whole population for a count opens (the actual working screen).
const listRouteFor=(type:string)=>{
  if(type==='RISK_REVIEW') return `/risk-register?review=awaiting`;
  if(type==='ACTION_OPEN') return `/my-actions`;
  if(type==='EFFECTIVENESS_REVIEW') return `/effectiveness`;
  if(type==='ESCALATION_OPEN') return `/escalation-log?status=open`;
  if(type==='PATTERN_REVIEW') return `/systemic-patterns`;
  return '#';
};

export function CanonicalEvidenceStrip({summary,types,compact=false}:{summary:CanonicalEvidenceSummary|null;types?:string[];compact?:boolean}){
  const navigate=useNavigate();
  const [open,setOpen]=useState<string|null>(null);
  if(!summary) return null;
  const selected=types||['RISK_REVIEW','ACTION_OPEN','EFFECTIVENESS_REVIEW','ESCALATION_OPEN','PATTERN_REVIEW'];
  return <div className="rounded-xl border border-border bg-card p-4">
    <div className="flex items-center justify-between gap-3 mb-3">
      <div><div className="text-xs font-semibold uppercase tracking-[.12em] text-primary">Canonical evidence</div>
      <div className="text-xs text-muted-foreground">As of {new Date(summary.as_of).toLocaleString()} · open a count to work it, or expand the exact records</div></div>
    </div>
    <div className={`grid gap-2 ${compact?'grid-cols-2 lg:grid-cols-5':'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'}`}>
      {selected.map(type=>{const g=(summary.groups as any)[type]||{count:0,evidence_ids:[]};return <div key={type}>
        {/* The card opens the actual working screen for this population. */}
        <button type="button" onClick={()=>navigate(listRouteFor(type))} className="w-full rounded-lg border border-border bg-background p-3 text-left hover:border-primary/40 group">
          <div className="text-2xl font-semibold">{g.count}</div>
          <div className="text-xs text-muted-foreground flex items-center justify-between gap-1">{LABELS[type]||type}<ChevronRight size={13} className="opacity-0 group-hover:opacity-100 text-primary shrink-0" /></div>
        </button>
        {g.count>0 && <button type="button" onClick={()=>setOpen(open===type?null:type)} className="mt-1 text-[11px] text-primary hover:underline px-1">{open===type?'Hide':'Show'} {g.count} record{g.count===1?'':'s'}</button>}
        {open===type&&g.count>0&&(()=>{
          // Prefer the server-resolved route (opens the record where it is actually visible for this
          // role — e.g. an action opens on its owning risk, not the person-scoped /my-actions).
          const recs=(g.evidence&&g.evidence.length)?g.evidence:(g.evidence_ids||[]).map((id:string)=>({evidence_id:id,route:routeFor(type,id)}));
          return <div className="mt-1 rounded-lg border border-border bg-background p-2 max-h-44 overflow-auto">
            {recs.map((rec:any)=><button key={rec.evidence_id} onClick={()=>navigate(rec.route||routeFor(type,rec.evidence_id))} className="block w-full text-left text-xs text-primary hover:underline px-2 py-1.5 truncate" title={rec.evidence_id}>{rec.evidence_id}</button>)}
          </div>;
        })()}
      </div>})}
    </div>
  </div>;
}
