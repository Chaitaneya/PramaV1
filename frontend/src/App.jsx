import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import SessionCapture from './pages/SessionCapture';
import Chronology from './pages/Chronology';
import CasesList from './pages/CasesList';
import AffidavitsList from './pages/AffidavitsList';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/cases" element={<CasesList />} />
        <Route path="/affidavits" element={<AffidavitsList />} />
        <Route path="/case/:id/session" element={<SessionCapture />} />
        <Route path="/case/:id/chronology" element={<Chronology />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
