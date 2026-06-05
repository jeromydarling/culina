import * as React from 'react';
import { Languages, Check } from 'lucide-react';
import { LANGUAGES, translate } from '@/lib/ai';
import { Spinner } from '@/components/ui/misc';
import { cn } from '@/lib/utils';

/**
 * Inline translation control (Workers AI · Llama).
 *
 * Renders `text`, plus a small "Languages" menu. Picking a language swaps the
 * displayed copy for an AI translation and offers a one-tap "Show original".
 * Falls back silently to the original text when the Worker/AI binding is absent.
 *
 *   <Translate text={announcement.body} />
 */
export function Translate({ text, className }: { text: string; className?: string }) {
  const [open, setOpen] = React.useState(false);
  const [lang, setLang] = React.useState('en');
  const [translated, setTranslated] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [demo, setDemo] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // Close the menu on any outside click.
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  async function pick(code: string) {
    setOpen(false);
    setLang(code);
    if (code === 'en') { setTranslated(null); setDemo(false); return; }
    setBusy(true);
    setDemo(false);
    const r = await translate(text, code);
    setTranslated(r.text === text ? null : r.text);
    setDemo(!!r.demo);
    setBusy(false);
  }

  function showOriginal() {
    setLang('en');
    setTranslated(null);
    setDemo(false);
  }

  const showing = translated ?? text;

  return (
    <div className={className}>
      <div className="whitespace-pre-line">{showing}</div>

      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-primary hover:bg-muted"
          >
            {busy ? <Spinner className="h-3 w-3" /> : <Languages className="h-3.5 w-3.5" />}
            {busy ? 'Translating…' : 'Translate'}
          </button>
          {open && (
            <div className="absolute left-0 z-20 mt-1 max-h-64 w-44 overflow-auto rounded-lg border bg-card p-1 shadow-card-hover">
              {Object.entries(LANGUAGES).map(([code, label]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => pick(code)}
                  className={cn('flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-muted', code === lang && 'font-semibold text-primary')}
                >
                  {label}
                  {code === lang && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {translated && (
          <>
            <span className="text-muted-foreground/60">·</span>
            <span>Translated by AI</span>
            <span className="text-muted-foreground/60">·</span>
            <button type="button" onClick={showOriginal} className="font-medium text-primary hover:underline">Show original</button>
          </>
        )}
        {demo && lang !== 'en' && <span className="text-amber-600">Translation needs the deployed Worker.</span>}
      </div>
    </div>
  );
}
