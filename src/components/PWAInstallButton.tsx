import React, { useEffect, useState } from 'react';
import { Download, HelpCircle, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Detect standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // Direct instruction popup for other browsers without prompt
      setShowIOSGuide(true);
    }
  };

  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        title="Install G5MEKA App on device"
        className={
          compact
            ? 'p-2 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition flex items-center justify-center border border-zinc-700'
            : 'flex items-center gap-2 rounded-lg bg-zinc-800/80 px-3 py-1.5 text-xs font-medium text-zinc-300 shadow-sm hover:text-white hover:bg-zinc-700 border border-zinc-700 transition'
        }
      >
        <Download className="w-3.5 h-3.5 text-zinc-300" />
        {!compact && <span>Install App</span>}
      </button>

      {/* Installation Instruction Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl text-zinc-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-zinc-400" />
                Install G5MEKA
              </h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
                <p>To install on iPhone or iPad:</p>
                <ol className="list-decimal list-inside space-y-2 bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                  <li>
                    Tap the <strong>Share</strong> button in Safari's bottom toolbar.
                  </li>
                  <li>
                    Scroll down and tap <strong>Add to Home Screen</strong>.
                  </li>
                  <li>
                    Tap <strong>Add</strong> in the top-right corner.
                  </li>
                </ol>
                <p className="text-[11px] text-zinc-400">
                  You can now launch G5MEKA like a native gym app without browser bars!
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
                <p>To install on your desktop or Android phone:</p>
                <ul className="list-disc list-inside space-y-2 bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                  <li>In Chrome/Edge: Click the install icon in the address bar or browser menu.</li>
                  <li>In Android Chrome: Tap the 3 dots menu and select <strong>Install app</strong> or <strong>Add to Home Screen</strong>.</li>
                </ul>
              </div>
            )}

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-lg bg-zinc-800 py-2 text-xs font-medium text-white hover:bg-zinc-700 border border-zinc-700"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
