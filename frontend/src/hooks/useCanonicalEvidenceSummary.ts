import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/services/apiClient';
import { useGovernanceRefresh } from '@/hooks/useGovernanceRefresh';

export type EvidenceGroup={count:number;evidence_ids:string[];evidence:Array<{evidence_id:string;house_id?:string|null;due_at?:string|null}>};
export type CanonicalEvidenceSummary={
  as_of:string; scope:{company_id:string;house_id?:string|null}; source:string;
  groups:Record<'RISK_REVIEW'|'ACTION_OPEN'|'EFFECTIVENESS_REVIEW'|'ESCALATION_OPEN'|'PATTERN_REVIEW',EvidenceGroup>;
};

export function useCanonicalEvidenceSummary(houseId?:string|null){
  const [data,setData]=useState<CanonicalEvidenceSummary|null>(null);
  const [loading,setLoading]=useState(true);
  const load=useCallback(async()=>{
    try{
      const res=await apiClient.get('/canonical-evidence/summary',{params:houseId?{house_id:houseId}:undefined});
      setData(res.data?.data||null);
    }finally{setLoading(false);}
  },[houseId]);
  useEffect(()=>{load();},[load]);
  useGovernanceRefresh(load);
  return {data,loading,refresh:load};
}
