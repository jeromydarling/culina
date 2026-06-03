import * as React from 'react';
import { UploadCloud, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/misc';
import { uploadFile } from '@/lib/upload';
import { notifyError } from '@/lib/errors';

/**
 * Drag-and-drop (or click) file uploader. Sends the file to R2 via the Worker
 * and returns the stored URL. Works in demo mode with a local preview.
 */
export function FileDrop({
  onUploaded,
  accept = 'image/*,application/pdf',
  label = 'Drag a file here, or click to choose',
  className,
}: {
  onUploaded: (url: string, file: File) => void;
  accept?: string;
  label?: string;
  className?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [over, setOver] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [doneName, setDoneName] = React.useState<string | null>(null);

  async function handle(file?: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      const res = await uploadFile(file);
      onUploaded(res.url, file);
      setDoneName(file.name);
    } catch (e) {
      notifyError(e, { action: 'upload' });
    }
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files?.[0]); }}
      className={cn(
        'flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm transition-colors',
        over ? 'border-primary bg-primary/5' : 'bg-muted/40 hover:border-primary/40',
        className,
      )}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
      {busy ? (
        <><Spinner /><span className="text-muted-foreground">Uploading…</span></>
      ) : doneName ? (
        <><Check className="h-6 w-6 text-emerald-600" /><span className="font-medium">{doneName}</span><span className="text-xs text-muted-foreground">Uploaded — choose another to replace</span></>
      ) : (
        <><UploadCloud className="h-6 w-6 text-muted-foreground" /><span className="text-muted-foreground">{label}</span></>
      )}
    </button>
  );
}
