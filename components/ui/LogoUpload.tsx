'use client';

import { useRef, useState } from 'react';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LogoUploadProps {
  currentLogo?: string | null;   // URL of existing logo
  onUpload: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
  disabled?: boolean;
  className?: string;
  label?: string;
  hint?: string;
}

export function LogoUpload({
  currentLogo, onUpload, onRemove, disabled, className, label = 'Store Logo', hint,
}: LogoUploadProps) {
  const inputRef    = useRef<HTMLInputElement>(null);
  const [preview,   setPreview]   = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver,  setDragOver]  = useState(false);

  const displaySrc = preview ?? currentLogo ?? null;

  const handleFile = async (file: File) => {
    if (!file.type.match(/image\/(jpeg|jpg|png|webp|gif)/)) {
      alert('Only JPG, PNG, WebP or GIF images are supported.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be under 2 MB.');
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);
    try {
      await onUpload(file);
    } catch {
      setPreview(null); // revert preview on error
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = ''; // reset so same file can be re-selected
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && <p className="text-sm font-medium">{label}</p>}

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-colors cursor-pointer',
          'w-40 h-40',
          dragOver   ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30',
          disabled   && 'pointer-events-none opacity-50',
        )}
        onClick={() => inputRef.current?.click()}
      >
        {displaySrc ? (
          <>
            <img
              src={displaySrc}
              alt="Store logo"
              className="w-full h-full object-contain rounded-xl p-2"
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/70 rounded-xl">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground p-4 text-center">
            {uploading
              ? <Loader2 className="h-8 w-8 animate-spin text-primary" />
              : <ImageIcon className="h-8 w-8 opacity-40" />}
            <p className="text-xs">{uploading ? 'Uploading…' : 'Click or drag to upload'}</p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled || uploading}
      />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" />
          {displaySrc ? 'Change Logo' : 'Upload Logo'}
        </Button>

        {displaySrc && onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-destructive hover:text-destructive"
            disabled={disabled || uploading}
            onClick={async e => { e.stopPropagation(); setPreview(null); await onRemove(); }}
          >
            <X className="h-3.5 w-3.5" />
            Remove
          </Button>
        )}
      </div>

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
