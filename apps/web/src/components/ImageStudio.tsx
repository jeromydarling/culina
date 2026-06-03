import * as React from 'react';
import { toast } from 'sonner';
import { Sparkles, Check, RefreshCw, Link2, Trash2, X } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Spinner } from '@/components/ui/misc';
import { SmartImage } from '@/components/SmartImage';
import { cn } from '@/lib/utils';
import { generateImage, type ImageStyle } from '@/lib/ai';

/**
 * Deliberate, no-surprises control over an image. Generate Flux variations,
 * compare them in a gallery, regenerate, paste your own URL, or remove — and
 * nothing changes the live site until you explicitly Apply.
 */
export function ImageStudio({
  open,
  onClose,
  title,
  promptSeed,
  style = 'dish',
  current,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  promptSeed: string;
  style?: ImageStyle;
  current?: string | null;
  onApply: (url: string | null) => void;
}) {
  const [prompt, setPrompt] = React.useState(promptSeed);
  const [variations, setVariations] = React.useState<string[]>([]);
  const [selected, setSelected] = React.useState<string | null>(current ?? null);
  const [loading, setLoading] = React.useState(false);
  const [manual, setManual] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setPrompt(promptSeed);
      setSelected(current ?? null);
      setVariations(current ? [current] : []);
      setManual('');
    }
  }, [open, promptSeed, current]);

  async function generate() {
    if (!prompt.trim()) return toast.error('Describe the image first.');
    setLoading(true);
    const res = await generateImage(prompt, style);
    setLoading(false);
    if (res.image) {
      setVariations((v) => [res.image as string, ...v].slice(0, 8));
      setSelected(res.image);
    } else {
      toast.info(res.note ?? 'Image generation runs in the deployed app with Workers AI.');
    }
  }

  function addManual() {
    if (!manual.trim()) return;
    setVariations((v) => [manual.trim(), ...v].slice(0, 8));
    setSelected(manual.trim());
    setManual('');
  }

  return (
    <Modal open={open} onClose={onClose} title={title} className="max-w-2xl">
      <div className="space-y-4">
        {/* Selected preview */}
        <div className="overflow-hidden rounded-xl border">
          <div className="aspect-[16/7] w-full">
            <SmartImage src={selected ?? undefined} alt="Selected" emoji="🖼️" gradient="from-primary to-accent" className="h-full w-full" />
          </div>
        </div>

        {/* Prompt + generate */}
        <div>
          <Label>Describe the image you want</Label>
          <div className="mt-1 flex gap-2">
            <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. rustic sourdough loaves on a linen cloth, morning light" />
            <Button variant="accent" onClick={generate} disabled={loading}>
              {loading ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : <><Sparkles className="h-4 w-4" /> Generate</>}
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Generate as many options as you like — they’re added to the gallery below. Nothing is applied until you choose.</p>
        </div>

        {/* Variations gallery */}
        {variations.length > 0 && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label>Options</Label>
              {variations.length > 0 && <Button size="sm" variant="ghost" onClick={generate} disabled={loading}><RefreshCw className="h-3 w-3" /> Another</Button>}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {variations.map((url, i) => (
                <button key={i} onClick={() => setSelected(url)} className={cn('relative aspect-square overflow-hidden rounded-lg border-2', selected === url ? 'border-primary' : 'border-transparent hover:border-primary/40')}>
                  <SmartImage src={url} alt={`Option ${i + 1}`} emoji="🖼️" gradient="from-amber-600 to-yellow-400" className="h-full w-full" />
                  {selected === url && <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-white"><Check className="h-3 w-3" /></span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Manual URL */}
        <div>
          <Label>…or paste an image URL</Label>
          <div className="mt-1 flex gap-2">
            <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="https://…" />
            <Button variant="outline" onClick={addManual}><Link2 className="h-4 w-4" /> Add</Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t pt-4">
          <Button variant="ghost" className="text-red-500" onClick={() => { onApply(null); onClose(); toast.success('Image removed'); }}>
            <Trash2 className="h-4 w-4" /> Remove image
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
            <Button onClick={() => { onApply(selected); onClose(); toast.success('Image applied'); }} disabled={!selected}>
              <Check className="h-4 w-4" /> Apply
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
