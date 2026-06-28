import { Routes, Route } from 'react-router-dom';
import { Home } from '@/screens/Home';
import { Players } from '@/screens/Players';
import { RolesPack } from '@/screens/RolesPack';
import { Play } from '@/screens/Play';
import { Settings } from '@/screens/Settings';
import { HowToPlay } from '@/screens/HowToPlay';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/players" element={<Players />} />
      <Route path="/setup" element={<RolesPack />} />
      <Route path="/play" element={<Play />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/how" element={<HowToPlay />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
