import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import SessionCapture from './pages/SessionCapture';
import Chronology from './pages/Chronology';
import Narrative from './pages/Narrative';
import CasesList from './pages/CasesList';
import AffidavitsList from './pages/AffidavitsList';
import SharedCaseView from './pages/SharedCaseView';
import { LanguageProvider } from './i18n';

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/cases" element={<CasesList />} />
          <Route path="/affidavits" element={<AffidavitsList />} />
          <Route path="/case/:id/session" element={<SessionCapture />} />
          <Route path="/case/:id/chronology" element={<Chronology />} />
          <Route path="/case/:id/narrative" element={<Narrative />} />
          <Route path="/shared/:token" element={<SharedCaseView />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;
