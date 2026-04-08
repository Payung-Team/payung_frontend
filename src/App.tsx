import { Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import Home from './pages/home/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import KYC from './pages/kyc/KYC';
import Admin from './pages/admin/Admin';
import NotFound from './pages/error/NotFound';
import PayungHome from './pages/home/HomePage';

function App() {
  return (
    <Routes>
      {/* Auth pages — full-page layouts */}
      <Route path="/register" element={<Register />} />
      <Route path="/home" element={<PayungHome />} />
      

      {/* App pages — wrapped in AppShell (header + sidebar) */}
      <Route element={<AppShell />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/kyc" element={<KYC />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
