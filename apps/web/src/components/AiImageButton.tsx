import * as React from 'react';
import { toast } from 'sonner';
import { ImagePlus, Sparkles } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Spinner } from '@/components/ui/misc';
import { generateImage, type ImageStyle } from '@/lib/ai';

/**
 * One-click Flux image generation. Calls the Worker's Workers-AI endpoint and
 * hands the resulting data URL back via onGenerated. In demo mode (no worker)
 * it explains how to enable it instead of failing silently.
 */
export function AiImageButton({
  prompt,
  style = 'dish',
  onGenerated,
  label = 'Generate image',
  variant = 'accent',
  size = 'sm',
  className,
}: {
  prompt: string;
  style?: ImageStyle;
  onGenerated: (dataUrl: string) => void;
  label?: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  className?: string;
}) {
  const [loading, setLoading] = React.useState(false);

  async function run() {
    if (!prompt.trim()) return toast.error('Add a name or description first, then generate.');
    setLoading(true);
    const res = await generateImage(prompt, style);
    setLoading(false);
    if (res.image) {
      onGenerated(res.image);
      toast.success('Image generated with Flux ✨');
    } else {
      toast.info(res.note ?? 'Image generation is available once the Worker is deployed with Workers AI.');
    }
  }

  return (
    <Button type="button" variant={variant} size={size} className={className} onClick={run} disabled={loading}>
      {loading ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : <><Sparkles className="h-4 w-4" /> {label}</>}
    </Button>
  );
}

export { ImagePlus };
