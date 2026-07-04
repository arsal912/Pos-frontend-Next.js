'use client';

/**
 * PWA install banner — shown once on Chrome/Edge when the browser
 * detects the app can be installed to the home screen.
 *
 * Dismissed for 7 days via localStorage. Only shown on the POS page.
 */

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DISMISS_KEY  = 'pwa_install_dismissed_at';
const DISMISS_DAYS = 7;

export function InstallBanner() {
  const [prompt,  setPrompt]  = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Don't show if dismissed recently
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;
    }

    // Don't show if already running as a PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 pointer-events-none">
      <div className="bg-card border rounded-2xl shadow-2xl p-4 flex items-start gap-3 pointer-events-auto">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Install POS to home screen</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Works offline on this tablet. Faster startup, no browser chrome.
          </p>
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={handleInstall} className="h-7 text-xs gap-1">
              <Download className="h-3 w-3" />Install
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss} className="h-7 text-xs text-muted-foreground">
              Not now
            </Button>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground flex-shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
