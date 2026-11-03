import React from 'react';
import type { TabConfig, TabId } from '../../types/navigation';
import { useApp } from '../../context/useApp';
import type { StringKey } from '../../i18n/strings';
import { DEFAULT_TABS } from './constants';

const TAB_TEXT: Record<TabId, { label: StringKey; aria: StringKey }> = {
  inicio: { label: 'nav.home', aria: 'nav.home.aria' },
  mapa: { label: 'nav.map', aria: 'nav.map.aria' },
  escanear: { label: 'nav.scan', aria: 'nav.scan.aria' },
  rutas: { label: 'nav.routes', aria: 'nav.routes.aria' },
  buscar: { label: 'nav.search', aria: 'nav.search.aria' },
};

export interface BottomNavigationProps {
  /**
   * The currently active tab ID. If provided, the component acts as controlled.
   */
  activeTab?: TabId;
  /**
   * Initial active tab when uncontrolled. Defaults to 'mapa'.
   */
  defaultTab?: TabId;
  /**
   * Callback invoked whenever a tab is selected.
   */
  onChange?: (tab: TabId) => void;
  /**
   * Additional classes for the container element.
   */
  className?: string;
  /**
   * Modo de posición dentro del marco de la app. Por defecto, 'relative'.
   */
  position?: 'sticky' | 'relative' | 'absolute';
  /**
   * Optional custom tab definitions if overriding the default 5 tabs.
   */
  tabs?: TabConfig[];
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab: controlledActiveTab,
  defaultTab = 'mapa',
  onChange,
  className = '',
  position = 'relative',
  tabs = DEFAULT_TABS,
}) => {
  const { t } = useApp();
  const [internalTab, setInternalTab] = React.useState<TabId>(defaultTab);

  const isControlled = controlledActiveTab !== undefined;
  const currentTab = isControlled ? controlledActiveTab : internalTab;

  const handleSelectTab = (tabId: TabId) => {
    if (!isControlled) {
      setInternalTab(tabId);
    }
    onChange?.(tabId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex: number | null = null;

    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      const nextTab = tabs[nextIndex];
      handleSelectTab(nextTab.id);
      const container = e.currentTarget.parentElement;
      const buttons = container?.querySelectorAll<HTMLButtonElement>('button[role="tab"]');
      buttons?.[nextIndex]?.focus();
    }
  };

  const positionClasses = {
    sticky: 'sticky bottom-0 left-0 right-0 z-40',
    relative: 'relative z-10 w-full',
    absolute: 'absolute bottom-0 left-0 right-0 z-40',
  }[position];

  return (
    <nav
      aria-label={t('nav.label')}
      className={`${positionClasses} bg-surface border-t border-line pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-3px_12px_rgba(0,0,0,0.04)] select-none ${className}`}
    >
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="w-full grid grid-cols-5 h-[62px] items-center px-1"
      >
        {tabs.map((tab, index) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;
          const text = TAB_TEXT[tab.id];
          const label = text ? t(text.label) : tab.label;
          const ariaLabel = text ? t(text.aria) : tab.ariaLabel;

          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              aria-label={ariaLabel}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleSelectTab(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`group relative flex flex-col items-center justify-center min-h-[48px] py-1 px-1 transition duration-150 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 active:scale-95 cursor-pointer ${
                isActive ? 'text-accent' : 'text-muted hover:text-ink'
              }`}
            >
              {/* Icon Container with Badge */}
              <div className="relative flex items-center justify-center mb-0.5">
                <Icon
                  size={23}
                  strokeWidth={isActive ? 2.4 : 1.75}
                  className={`transition-colors duration-150 ${
                    isActive
                      ? 'text-accent stroke-accent'
                      : 'text-muted stroke-muted group-hover:text-ink group-hover:stroke-ink'
                  }`}
                />

                {tab.badge !== undefined && tab.badge !== false && (
                  <span className="absolute -top-1 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-on-accent shadow-xs">
                    {typeof tab.badge === 'boolean' ? '' : tab.badge}
                  </span>
                )}
              </div>

              {/* Tab Label */}
              <span
                className={`text-caption leading-tight tracking-tight transition-colors duration-150 ${
                  isActive ? 'font-bold text-accent' : 'font-medium text-muted group-hover:text-ink'
                }`}
              >
                {label}
              </span>

              {/* Screen reader info for current page */}
              {isActive && <span className="sr-only">{t('nav.active')}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
