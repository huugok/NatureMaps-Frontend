import { useState } from 'react';
import { BottomNavigation } from './components/BottomNavigation';
import { ScanPage } from './pages/Scan';
import type { TabId } from './types/navigation';

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('mapa');

  return (
    <main className="min-h-screen bg-neutral-100 flex flex-col justify-end">
      {activeTab === 'escanear' && <ScanPage />}
      <BottomNavigation activeTab={activeTab} onChange={setActiveTab} />
    </main>
  );
}

export default App;
