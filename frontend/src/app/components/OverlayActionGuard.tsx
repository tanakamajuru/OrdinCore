import { useEffect } from "react";
import { useLocation } from "react-router";

/**
 * App-wide safety net for the "button is unclickable — no hover, no error" class of bug, where a
 * stray fixed/absolute element (e.g. a draggable helper, a toaster region, a half-closed panel) sits
 * on top of a real control and swallows the click. Research + our super-admin case confirmed this is
 * a transparent overlay intercepting pointer events (see fix #185).
 *
 * How it stays safe:
 *  - It only ever acts on an element that `elementFromPoint` reports is ON TOP of a real control, and
 *    that is neither the control, its descendant, nor its ancestor (so the page layout is untouched).
 *  - It NEVER neutralises a (near) full-viewport overlay — that is almost always an intentional modal
 *    backdrop, which is supposed to block the content behind it. Only PARTIAL overlays are treated as
 *    stray and have their pointer-events disabled so the click reaches the control beneath.
 *  - Each offending element is logged once so the root overlay can still be fixed at source.
 *
 * It runs a few times per navigation and on resize — not continuously — so the cost is negligible.
 */
const INTERACTIVE = 'button, a[href], [role="button"], input:not([type="hidden"]), select, textarea';

function isNearFullViewport(r: DOMRect): boolean {
  const vw = window.innerWidth, vh = window.innerHeight;
  // Covers ~the whole screen → treat as an intentional modal/backdrop, never neutralise it.
  return r.left <= 2 && r.top <= 2 && r.right >= vw - 2 && r.bottom >= vh - 2;
}

const logged = new WeakSet<Element>();

function sweep() {
  let controls: HTMLElement[];
  try { controls = Array.from(document.querySelectorAll<HTMLElement>(INTERACTIVE)); } catch { return; }
  for (const c of controls) {
    if (c.offsetParent === null && getComputedStyle(c).position !== 'fixed') continue; // not rendered
    const r = c.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) continue; // off-screen
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) continue;
    // Peel at most a few stacked stray overlays off this control.
    for (let i = 0; i < 4; i++) {
      let top: Element | null;
      try { top = document.elementFromPoint(cx, cy); } catch { break; }
      if (!top || top === c || c.contains(top) || top.contains(c)) break;
      const overlay = top as HTMLElement;
      const or = overlay.getBoundingClientRect();
      if (isNearFullViewport(or)) break; // intentional modal backdrop — leave it alone
      const pos = getComputedStyle(overlay).position;
      if (pos !== 'fixed' && pos !== 'absolute' && pos !== 'sticky') break; // only positioned strays
      if (!logged.has(overlay)) {
        logged.add(overlay);
        // eslint-disable-next-line no-console
        console.warn('[OrdinCore overlay-guard] a control was blocked by',
          overlay.tagName + (overlay.id ? '#' + overlay.id : ''),
          typeof overlay.className === 'string' ? '.' + overlay.className.trim().split(/\s+/).join('.') : '',
          '| z=', getComputedStyle(overlay).zIndex, 'pos=', pos, '— neutralising pointer-events');
      }
      overlay.style.pointerEvents = 'none';
    }
  }
}

export function OverlayActionGuard() {
  const location = useLocation();
  useEffect(() => {
    const timers = [setTimeout(sweep, 350), setTimeout(sweep, 900), setTimeout(sweep, 1800)];
    window.addEventListener('resize', sweep);
    return () => { timers.forEach(clearTimeout); window.removeEventListener('resize', sweep); };
  }, [location.pathname, location.search]);
  return null;
}
