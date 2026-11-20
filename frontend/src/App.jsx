import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import FeedPage from './pages/FeedPage.jsx';
import UploadPage from './pages/UploadPage.jsx';
import PhotoPage from './pages/PhotoPage.jsx';
import { USE_MOCK } from './api';

export default function App() {
  return (
    <>
      <Navbar />
      {USE_MOCK && (
        <div className="mock-banner">
          Demo mode: using the in-browser mock backend (set VITE_USE_MOCK=false to use the real server)
        </div>
      )}
      <main className="container">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
          <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
          <Route path="/photos/:id" element={<ProtectedRoute><PhotoPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
