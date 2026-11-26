import React, { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface PWAInstallButtonProps {
  variant?: 'default' | 'subtle';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'default' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={
          variant === 'subtle'
            ? 'inline-flex items-center gap-2 rounded-lg border border-[#D4AF37]/40 bg-white px-3.5 py-2 text-xs font-medium text-[#065F46] hover:bg-[#FAF9F6] transition-colors whitespace-nowrap shrink-0'
            : 'inline-flex items-center gap-2 rounded-lg bg-[#065F46] px-4 py-2 text-xs font-medium text-white hover:bg-[#047857] transition-colors whitespace-nowrap shrink-0'
        }
      >
        <Download className="w-3.5 h-3.5" />
        Install App
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className={
          variant === 'subtle'
            ? 'inline-flex items-center gap-2 rounded-lg border border-[#E2E8E5] bg-white px-3.5 py-2 text-xs font-medium text-[#0F1F1A] hover:border-[#065F46]/40 hover:text-[#065F46] transition-colors whitespace-nowrap shrink-0'
            : 'inline-flex items-center gap-2 rounded-lg border border-[#D4AF37]/50 bg-[#FAF9F6] px-4 py-2 text-xs font-medium text-[#065F46] hover:bg-emerald-50 transition-colors whitespace-nowrap shrink-0'
        }
      >
        <Smartphone className="w-3.5 h-3.5" />
        {isIOS ? 'Install on iPhone' : 'Install App'}
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white border border-[#E2E8E5] p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 id="pwa-guide-title" className="text-xl font-semibold text-[#0F1F1A]">
                  Install ZARTHOUGHTS QURAN ACADEMY
                </h3>
                <p className="text-xs text-[#475A53] mt-1">
                  Access Quran reading, audio recitation, and your classes directly from your home screen.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install instructions"
                className="p-1.5 rounded-lg text-[#475A53] hover:bg-[#F6F8F7] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-3 text-sm text-[#0F1F1A] bg-[#FAF9F6] border border-[#E2E8E5] rounded-xl p-4">
                <li>1. Tap the <strong>Share</strong> icon in your Safari browser bar.</li>
                <li>2. Scroll down and select <strong>Add to Home Screen</strong>.</li>
                <li>3. Tap <strong>Add</strong> to install the academy app.</li>
              </ol>
            ) : (
              <ol className="space-y-3 text-sm text-[#0F1F1A] bg-[#FAF9F6] border border-[#E2E8E5] rounded-xl p-4">
                <li>1. Open your browser menu (Chrome, Edge, or Android Chrome).</li>
                <li>2. Select <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
                <li>3. Launch ZARTHOUGHTS QURAN ACADEMY anytime—even offline.</li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full rounded-lg bg-[#065F46] py-2.5 text-sm font-medium text-white hover:bg-[#047857] transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-[#065F46] border border-[#D4AF37]/50 px-3.5 py-2 text-xs font-medium text-white shadow-lg"
    >
      <WifiOff className="w-3.5 h-3.5 text-[#D4AF37]" />
      <span>Offline Mode — Cached Surahs and library items remain available.</span>
    </div>
  );
};
