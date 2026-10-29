import { useState, useEffect, useCallback } from 'react';

const THEME_GATE_EVENT = 'bcp-theme-gate-change';

export function getGlobalIsDarkMode(): boolean {
  if (typeof window === 'undefined') return true;
  const choice = localStorage.getItem('bcp_theme_user_choice');
  if (choice === 'light') return false;
  if (choice === 'dark') return true;
  if (typeof document !== 'undefined' && document.documentElement) {
    if (document.documentElement.classList.contains('dark')) return true;
  }
  return true;
}

export function setGlobalThemeGate(isDark: boolean): void {
  if (typeof window === 'undefined') return;
  const modeStr = isDark ? 'dark' : 'light';
  localStorage.setItem('bcp_theme_user_choice', modeStr);
  localStorage.setItem('bcp_crane_theme', modeStr);
  localStorage.setItem('theme', modeStr);

  if (typeof document !== 'undefined' && document.documentElement) {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  }

  window.dispatchEvent(
    new CustomEvent<{ isDark: boolean }>(THEME_GATE_EVENT, {
      detail: { isDark }
    })
  );
}

export function useThemeGate(): [boolean, (isDark: boolean) => void] {
  const [isDark, setIsDark] = useState<boolean>(() => getGlobalIsDarkMode());

  useEffect(() => {
    const handleEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ isDark: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.isDark === 'boolean') {
        setIsDark(customEvent.detail.isDark);
      } else {
        setIsDark(getGlobalIsDarkMode());
      }
    };

    window.addEventListener(THEME_GATE_EVENT, handleEvent);

    let observer: MutationObserver | null = null;
    if (typeof document !== 'undefined' && document.documentElement) {
      observer = new MutationObserver(() => {
        const htmlHasDark = document.documentElement.classList.contains('dark');
        setIsDark(htmlHasDark);
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });
    }

    return () => {
      window.removeEventListener(THEME_GATE_EVENT, handleEvent);
      if (observer) observer.disconnect();
    };
  }, []);

  const updateTheme = useCallback((nextIsDark: boolean) => {
    setGlobalThemeGate(nextIsDark);
  }, []);

  return [isDark, updateTheme];
}

