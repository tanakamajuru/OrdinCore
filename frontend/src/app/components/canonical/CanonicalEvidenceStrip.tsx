import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { CanonicalEvidenceSummary } from '@/hooks/useCanonicalEvidenceSummary';

const LABELS:any={
  RISK_REVIEW:'Risk reviews',
  ACTION_OPEN:'Open actions',
  EFFECTIVENESS_REVIEW:'Effectiveness due',
  ESCALATION_OPEN:'Open escalations',
  PATTERN_REVIEW:'Pattern reviews'
};
const routeFor=(type:string,id:string)=>{
  if(type==='RISK_REVIEW') return `/risk-register/${id}`;
  if(type==='ACTION_OPEN') return `/my-actions?focus=${id}`;
  if(type==='EFFECTIVENESS_REVIEW') return `/effectiveness?focus=${id}`;
  if(type==='ESCALATION_OPEN') return `/escalation-log?focus=${id}`;
  if(type==='PATTERN_REVIEW') return `/systemic-patterns?clusterId=${id}`;
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
      <div className="text-xs text-muted-foreground">As of {new Date(summary.as_of).toLocaleString()} · exact evidence IDs behind each count</div></div>
    </div>
    <div className={`grid gap-2 ${compact?'grid-cols-2 lg:grid-cols-5':'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'}`}>
      {selected.map(type=>{const g=(summary.groups as any)[type]||{count:0,evidence_ids:[]};return <div key={type}>
        <button type="button" onClick={()=>setOpen(open===type?null:type)} className="w-full rounded-lg border border-border bg-background p-3 text-left hover:border-primary/40">
          <div className="text-2xl font-semibold">{g.count}</div><div className="text-xs text-muted-foreground">{LABELS[type]||type}</div>
        </button>
        {open===type&&g.evidence_ids.length>0&&<div className="mt-2 rounded-lg border border-border bg-background p-2 max-h-44 overflow-auto">
          {g.evidence_ids.map((id:string)=><button key={id} onClick={()=>navigate(routeFor(type,id))} className="block w-full text-left text-xs text-primary hover:underline px-2 py-1.5">{id}</button>)}
        </div>}
      </div>})}
    </div>
  </div>;
}
