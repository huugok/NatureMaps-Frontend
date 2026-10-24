import React from 'react';
import type { TabConfig, TabId } from '../../types/navigation';
import { DEFAULT_TABS } from './constants';

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
   * Layout position mode: 'fixed' (viewport bottom), 'sticky', 'relative', or 'absolute'.
   * Defaults to 'fixed'.
   */
  position?: 'fixed' | 'sticky' | 'relative' | 'absolute';
  /**
   * Optional custom tab definitions if overriding the default 5 tabs.
   */
  tabs?: TabConfig[];
  /**
   * Accessible name of the navigation landmark. Defaults to the Spanish text.
   */
  navLabel?: string;
  /**
   * Screen-reader suffix announced on the active tab. Defaults to '(activo)'.
   */
  activeText?: string;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab: controlledActiveTab,
  defaultTab = 'mapa',
  onChange,
  className = '',
  position = 'fixed',
  tabs = DEFAULT_TABS,
  navLabel = 'Barra de navegación principal',
  activeText = '(activo)',
}) => {
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
    fixed: 'fixed bottom-0 left-0 right-0 z-50',
    sticky: 'sticky bottom-0 left-0 right-0 z-40',
    relative: 'relative z-10 w-full',
    absolute: 'absolute bottom-0 left-0 right-0 z-40',
  }[position];

  return (
    <nav
      aria-label={navLabel}
      className={`${positionClasses} bg-white border-t border-neutral-200/90 shadow-[0_-3px_12px_rgba(0,0,0,0.04)] select-none ${className}`}
    >
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="max-w-md mx-auto grid grid-cols-5 h-[62px] items-center px-1 pb-[env(safe-area-inset-bottom,0px)]"
      >
        {tabs.map((tab, index) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              aria-label={tab.ariaLabel}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleSelectTab(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`group relative flex flex-col items-center justify-center min-h-[48px] py-1 px-1 transition-all duration-150 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-1 active:scale-95 cursor-pointer ${
                isActive ? 'text-emerald-800' : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {/* Icon Container with Badge */}
              <div className="relative flex items-center justify-center mb-0.5">
                <Icon
                  size={23}
                  strokeWidth={isActive ? 2.4 : 1.75}
                  className={`transition-colors duration-150 ${
                    isActive
                      ? 'text-emerald-800 stroke-emerald-800'
                      : 'text-neutral-500 stroke-neutral-500 group-hover:text-neutral-700 group-hover:stroke-neutral-700'
                  }`}
                />

                {tab.badge !== undefined && tab.badge !== false && (
                  <span className="absolute -top-1 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-700 px-1 text-[10px] font-bold text-white shadow-xs">
                    {typeof tab.badge === 'boolean' ? '' : tab.badge}
                  </span>
                )}
              </div>

              {/* Tab Label */}
              <span
                className={`text-[11px] leading-tight tracking-tight transition-colors duration-150 ${
                  isActive ? 'font-bold text-emerald-800' : 'font-medium text-neutral-500 group-hover:text-neutral-700'
                }`}
              >
                {tab.label}
              </span>

              {/* Screen reader info for current page */}
              {isActive && <span className="sr-only">{activeText}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;

