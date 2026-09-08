import { useMemo, useRef, useState } from 'react';
import { BookOpenCheck, LockKeyhole, Send, X } from 'lucide-react';
import { apiClient } from '@/services/api';

type Reply = { classification: string; code: string; title?: string; answer: string; steps?: string[]; source?: { name: string; version: string } | null };

const SCREEN_BY_ROLE: Record<string, Array<[RegExp, string]>> = {
  TEAM_LEADER: [
    [/^\/my-work/, 'team_leader.my_work'], [/^\/dashboard$/, 'team_leader.dashboard'],
    [/^\/daily-governance-inbox/, 'team_leader.daily_governance'], [/^\/(pulse-history|signals)/, 'team_leader.signals'],
    [/^\/my-actions/, 'team_leader.my_actions'], [/^\/weekly-review/, 'team_leader.weekly_review'],
    [/^\/escalation-log/, 'team_leader.escalations'], [/^\/governance-compliance/, 'team_leader.action_tracker'],
    [/^\/help/, 'team_leader.help'],
  ],
  REGISTERED_MANAGER: [
    [/^\/my-work/, 'registered_manager.my_work'], [/^\/governance-dashboard/, 'registered_manager.daily_oversight'],
    [/^\/risk-register\?tab=strategic/, 'registered_manager.strategic_oversight'], [/^\/risk-register/, 'registered_manager.risk_register'],
    [/^\/interventions/, 'registered_manager.interventions'], [/^\/escalation-log/, 'registered_manager.escalations'],
    [/^\/governance-compliance/, 'registered_manager.action_tracker'], [/^\/weekly-review/, 'registered_manager.weekly_review'],
    [/^\/incidents/, 'registered_manager.incidents'], [/^\/reports/, 'registered_manager.reports'],
    [/^\/rm5/, 'registered_manager.pipeline'], [/^\/systemic-patterns/, 'registered_manager.patterns'],
    [/^\/effectiveness/, 'registered_manager.effectiveness'],
  ],
  DIRECTOR: [
    [/^\/my-work/, 'director.my_work'], [/^\/dashboard$/, 'director.dashboard'], [/^\/systemic-patterns/, 'director.patterns'],
    [/^\/risk-register/, 'director.risks'], [/^\/effectiveness/, 'director.effectiveness'], [/^\/interventions/, 'director.interventions'],
    [/^\/service-review-rollup/, 'director.rollup'], [/^\/reconstruction/, 'director.reconstruction'],
    [/^\/escalation-log/, 'director.escalations'], [/^\/governance-compliance/, 'director.actions'],
    [/^\/trends/, 'director.trends'], [/^\/incidents/, 'director.incidents'], [/^\/reports/, 'director.reports'],
  ],
  RESPONSIBLE_INDIVIDUAL: [
    [/^\/my-work/, 'responsible_individual.my_work'], [/^\/dashboard$/, 'responsible_individual.assurance'],
    [/^\/systemic-patterns/, 'responsible_individual.patterns'], [/^\/effectiveness/, 'responsible_individual.effectiveness'],
    [/^\/interventions/, 'responsible_individual.interventions'], [/^\/risk-register/, 'responsible_individual.risks'],
    [/^\/service-review-rollup/, 'responsible_individual.rollup'], [/^\/reconstruction/, 'responsible_individual.reconstruction'],
    [/^\/escalation-log/, 'responsible_individual.escalations'], [/^\/governance-compliance/, 'responsible_individual.actions'],
    [/^\/incidents/, 'responsible_individual.incidents'], [/^\/trends/, 'responsible_individual.trends'],
    [/^\/reports/, 'responsible_individual.reports'],
  ],
};

export function ControlledScreenAssist({ pathname, role }: { pathname: string; role: string }) {
  const screenKey = useMemo(() => SCREEN_BY_ROLE[role]?.find(([pattern]) => pattern.test(pathname))?.[1] || null, [pathname, role]);
  const [open, setOpen] = useState(false); const [question, setQuestion] = useState('');
  const [reply, setReply] = useState<Reply | null>(null); const [loading, setLoading] = useState(false);

  // Draggable launcher — the button can be repositioned anywhere so it never covers something the
  // user needs to click. Position is remembered per browser; a plain click (no drag) still opens it.
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try { const s = localStorage.getItem('screenAssistBtnPos'); if (s) return JSON.parse(s); } catch { /* default below */ }
    const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const h = typeof window !== 'undefined' ? window.innerHeight : 800;
    return { x: Math.max(8, w - 190), y: h - 76 };
  });
  const posRef = useRef(pos); posRef.current = pos;
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const onDown = (e: any) => {
    drag.current = { sx: e.clientX, sy: e.clientY, ox: posRef.current.x, oy: posRef.current.y, moved: false };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  };
  const onMove = (e: any) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.sx, dy = e.clientY - drag.current.sy;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) drag.current.moved = true;
    const nx = Math.max(8, Math.min(window.innerWidth - 170, drag.current.ox + dx));
    const ny = Math.max(8, Math.min(window.innerHeight - 56, drag.current.oy + dy));
    setPos({ x: nx, y: ny });
  };
  const onUp = () => {
    const moved = drag.current?.moved; drag.current = null;
    if (moved) { try { localStorage.setItem('screenAssistBtnPos', JSON.stringify(posRef.current)); } catch { /* ignore */ } }
    else setOpen(true);
  };

  if (!SCREEN_BY_ROLE[role] || !screenKey) return null;

  const ask = async (text: string) => {
    if (!text.trim() || loading) return;
    setOpen(true); setLoading(true);
    try {
      const res = await apiClient.post<Reply>('/screen-assist/query', { screen_key: screenKey, question: text.trim() });
      setReply((res as any)?.data || null);
    } catch (error: any) {
      setReply(error?.data?.data || { classification: 'ERROR', code: 'SAFE_FAILURE', answer: 'Screen Assist could not answer safely. No governance record has been changed.' });
    } finally { setLoading(false); setQuestion(''); }
  };

  return <>
    <button type="button" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
      style={{ left: pos.x, top: pos.y, touchAction: 'none' }}
      className="fixed z-40 flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-3 shadow-lg cursor-grab active:cursor-grabbing select-none"
      title="Drag to move · click to open" aria-label="Open Screen Assist (drag to reposition)">
      <BookOpenCheck className="w-5 h-5" /> Screen Assist
    </button>
    {open && <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setOpen(false)} aria-hidden="true" />}
    <aside className={`fixed inset-y-0 right-0 z-[60] w-full max-w-md bg-card border-l border-border shadow-2xl transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`} aria-label="Controlled doctrine Screen Assist" aria-hidden={!open}>
      <div className="h-full flex flex-col p-5">
        <div className="flex items-start justify-between border-b border-border pb-4"><div><h2 className="font-semibold">Screen Assist</h2><p className="text-xs text-emerald-600 flex items-center gap-1 mt-1"><LockKeyhole className="w-3.5 h-3.5" /> Controlled doctrine · Read only</p><p className="text-xs text-muted-foreground mt-1">{role.replace(/_/g, ' ')}</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Close Screen Assist"><X className="w-5 h-5" /></button></div>
        <div className="flex-1 overflow-y-auto py-4" aria-live="polite">
          {!reply && <div className="rounded-lg bg-muted p-4 text-sm">Ask how this screen works, what a control means, what your role is or what happens next.</div>}
          {loading && <p className="text-sm text-muted-foreground">Checking approved guidance…</p>}
          {!loading && reply && <div className={`rounded-lg p-4 text-sm ${reply.classification === 'PROHIBITED' ? 'bg-amber-50 text-amber-950' : reply.classification === 'UNSUPPORTED' ? 'bg-slate-100 text-slate-900' : 'bg-muted'}`}>
            {reply.title && <h3 className="font-semibold mb-2">{reply.title}</h3>}<p className="leading-6">{reply.answer}</p>
            {!!reply.steps?.length && <ol className="list-decimal pl-5 mt-3 space-y-2">{reply.steps.map((step, i) => <li key={i}>{step}</li>)}</ol>}
            {reply.source && <p className="border-t border-current/15 mt-4 pt-3 text-xs opacity-75">Approved source: {reply.source.name} v{reply.source.version}</p>}
            <p className="mt-3 text-xs font-medium">Screen Assist cannot make clinical or governance judgements and cannot change records.</p>
          </div>}
        </div>
        <div className="flex flex-wrap gap-2 mb-3">{['What is this screen?','What is my role here?','How do I use this screen?','Explain the controls','What happens next?'].map(q => <button type="button" key={q} onClick={() => ask(q)} className="text-xs border border-border rounded-md px-2.5 py-1.5 hover:bg-muted">{q}</button>)}</div>
        <form onSubmit={(e) => { e.preventDefault(); void ask(question); }} className="flex gap-2"><input value={question} onChange={e => setQuestion(e.target.value)} maxLength={500} className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Ask about this screen…" aria-label="Question" /><button type="submit" disabled={loading || question.trim().length < 3} className="rounded-lg bg-primary text-primary-foreground p-2.5 disabled:opacity-50" aria-label="Send"><Send className="w-4 h-4" /></button></form>
      </div>
    </aside>
  </>;
}
