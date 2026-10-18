import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { HistoryPage } from './pages/HistoryPage';
import { ResultPage } from './pages/ResultPage';
import { RoulettePage } from './pages/RoulettePage';
import { SessionProvider } from './session';

export default function App() {
  return (
    <SessionProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<RoulettePage />} />
          <Route path="/result" element={<ResultPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </SessionProvider>
  );
}
