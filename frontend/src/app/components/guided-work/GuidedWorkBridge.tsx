import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ArrowRight, ListChecks, X } from 'lucide-react';
import apiClient from '@/services/apiClient';

export function GuidedWorkBridge() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const active = params.get('guided') === '1';
  const currentId = params.get('gw') || '';
  const [hidden,setHidden] = useState(false);
  const [loading,setLoading] = useState(false);
  const [message,setMessage] = useState('');
  const [blocker,setBlocker] = useState<any>(null);
  useEffect(()=>setHidden(false),[location.pathname,location.search]);
  // My Work is the queue itself; the bridge only belongs on canonical execution screens.
  if (!active || hidden || location.pathname === '/my-work') return null;

  const next = async () => {
    setLoading(true);
    try {
      setMessage('');
      setBlocker(null);
      const res = await apiClient.get('/guided-work/next', { params:{ current: currentId || undefined } });
      const item = res.data?.data?.next;
      if (item?.route) navigate(item.route);
      else navigate('/my-work');
    } catch (err:any) {
      if (err?.response?.status === 409) {
        const current=err?.response?.data?.data?.current;
        setBlocker(current || null);
        setMessage(err?.response?.data?.message || 'Current governance work still requires completion.');
      } else setMessage('Unable to open the next governance task. Return to My Work and refresh.');
    } finally { setLoading(false); }
  };

  return <div className="fixed bottom-4 left-4 right-4 z-[80] mx-auto max-w-3xl rounded-xl border border-border bg-card shadow-lg p-3 flex flex-wrap items-center gap-3">
    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center"><ListChecks size={18}/></div>
    <div className="flex-1 min-w-[180px]">
      <div className="text-sm font-semibold text-foreground">Guided Work</div>
      <div className="text-xs text-muted-foreground">Complete the work on this existing screen, then continue. This bar does not change or close governance records.</div>
      {message&&<div className="text-xs text-amber-700 font-medium mt-1">{message}</div>}
      {blocker?.completionCondition&&<div className="text-xs text-muted-foreground mt-1">Still required: {blocker.completionCondition}</div>}
    </div>
    {blocker?.exactRoute&&<button type="button" onClick={()=>navigate(blocker.exactRoute)} className="min-h-10 px-3 rounded-lg border border-amber-400 text-amber-800 text-sm font-semibold">Open required work</button>}
    <button type="button" onClick={()=>navigate('/my-work')} className="min-h-10 px-3 rounded-lg border border-border text-sm font-medium">My Work</button>
    <button type="button" onClick={next} disabled={loading || !!blocker} className="min-h-10 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-60">{loading?'Loading…':'Continue to next'} <ArrowRight size={15}/></button>
    <button type="button" aria-label="Hide guided work bar" onClick={()=>setHidden(true)} className="w-10 h-10 rounded-lg text-muted-foreground hover:bg-muted inline-flex items-center justify-center"><X size={16}/></button>
  </div>;
}
