import { useRef, useState } from 'react';
import { BottomNavigation } from './components/BottomNavigation';
import { CameraScreen } from './components/Camera';
import type { TabId } from './types/navigation';

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('inicio');
  const previousTab = useRef<TabId>('inicio');

  const handleTabChange = (tab: TabId) => {
    if (tab === 'escanear' && activeTab !== 'escanear') {
      previousTab.current = activeTab;
    }
    setActiveTab(tab);
  };

  const closeCamera = () => setActiveTab(previousTab.current);

  return (
    <div className="h-dvh min-h-screen bg-black flex flex-col font-sans text-neutral-900 overflow-hidden">
      {/* 
        Solo se desarrolla la pestaña de cámara ('escanear').
        Las demás pestañas quedan vacías sin contenido de desarrollo.
      */}
      <main className="flex-1 min-h-0 flex flex-col w-full max-w-md mx-auto overflow-hidden relative">
        {activeTab === 'escanear' ? (
          <CameraScreen onClose={closeCamera} />
        ) : (
          <div className="flex-1 bg-neutral-950" />
        )}
      </main>

      {/* Barra de navegación inferior siempre presente */}
      <BottomNavigation
        activeTab={activeTab}
        onChange={handleTabChange}
        position="fixed"
      />
    </div>
  );
}

export default App;
