'use client';

import { useEffect, useState } from 'react';
import { Download, Share2, Smartphone, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

type InstallState = {
  promptEvent: BeforeInstallPromptEvent | null;
  isInstalled: boolean;
  isIOS: boolean;
};

export function InstallPrompt({ className }: { className?: string }) {
  const notifications = useNotifications();
  const [state, setState] = useState<InstallState>({
    promptEvent: null,
    isInstalled: false,
    isIOS: false
  });

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS =
      /iphone|ipad|ipod/.test(userAgent) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

    setState((current) => ({
      ...current,
      isInstalled: standalone,
      isIOS
    }));

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setState((current) => ({
        ...current,
        promptEvent: event as BeforeInstallPromptEvent
      }));
    };

    const onAppInstalled = () => {
      setState((current) => ({
        ...current,
        isInstalled: true,
        promptEvent: null
      }));
      notifications.success({
        title: 'CabFlow installed',
        description: 'You can open it from your home screen.'
      });
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, [notifications]);

  const handleInstall = async () => {
    if (state.promptEvent) {
      state.promptEvent.prompt();
      const result = await state.promptEvent.userChoice;

      if (result.outcome === 'accepted') {
        notifications.success({
          title: 'Installing CabFlow',
          description: 'Your browser is finishing the setup.'
        });
      } else {
        notifications.info({
          title: 'Install dismissed',
          description: 'You can install CabFlow later from this page.'
        });
      }

      setState((current) => ({
        ...current,
        promptEvent: null
      }));
      return;
    }

    const guide = document.getElementById('install-guide');
    guide?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    notifications.info({
      title: 'Install guide',
      description: state.isIOS
        ? 'On iPhone, open CabFlow in Safari, tap Share, then Add to Home Screen.'
        : 'If your browser does not show the install prompt, use the browser menu to install CabFlow.'
    });
  };

  if (state.isInstalled) {
    return (
      <div
        className={cn(
          'rounded-[1.4rem] border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-left text-emerald-950 shadow-[0_1px_0_rgba(15,23,42,0.03)]',
          className
        )}
      >
        <p className="text-sm font-semibold">CabFlow is installed</p>
        <p className="mt-1 text-xs leading-5 text-emerald-700">
          Open it from your home screen for the fastest access.
        </p>
      </div>
    );
  }

  return (
    <section
      id="install-guide"
      className={cn(
        'rounded-[1.4rem] border border-slate-200 bg-slate-50/90 px-3 py-3 shadow-[0_1px_0_rgba(15,23,42,0.03)]',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold tracking-tight text-slate-900">Install CabFlow</p>
            <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              PWA
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Add it to your home screen for faster access, better offline support, and a cleaner app-like feel.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleInstall}
          className="shrink-0 rounded-full px-3 py-2 text-xs font-bold shadow-[0_14px_28px_rgba(250,204,21,0.28)]"
        >
          <Download className="h-3.5 w-3.5" />
          Install app
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-2.5">
          <div className="flex items-center gap-2 text-slate-900">
            <Smartphone className="h-3.5 w-3.5 text-primary" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Android</p>
          </div>
          <p className="mt-1 text-[11px] leading-4 text-slate-600">
            Tap install when Chrome or Edge shows the prompt.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-2.5">
          <div className="flex items-center gap-2 text-slate-900">
            <Share2 className="h-3.5 w-3.5 text-primary" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">iPhone</p>
          </div>
          <p className="mt-1 text-[11px] leading-4 text-slate-600">
            Open in Safari, then use Share and Add to Home Screen.
          </p>
        </div>
      </div>
    </section>
  );
}
