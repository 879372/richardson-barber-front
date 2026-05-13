import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layouts & Pages
import DashboardLayout from './pages/DashboardLayout';
import BookingPortal from './pages/BookingPortal';
import Customers from './pages/Customers';
import Services from './pages/Services';
import Products from './pages/Products';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Agenda from './pages/Agenda';
import Financeiro from './pages/Financeiro';
import Settings from './pages/Settings';
import Profissionais from './pages/Profissionais';
import Historico from './pages/Historico';
import MyAppointments from './pages/MyAppointments';
import { useAuthStore } from './lib/store';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore((state) => state.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

import { Toaster } from 'sonner';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" expand={false} richColors />
      <Routes>
        <Route path="/agendar" element={<BookingPortal />} />
        <Route path="/meus-agendamentos" element={<MyAppointments />} />
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="clientes" element={<Customers />} />
          <Route path="servicos" element={<Services />} />
          <Route path="financeiro" element={<Financeiro />} />
          <Route path="produtos" element={<Products />} />
          <Route path="profissionais" element={<Profissionais />} />
          <Route path="historico" element={<Historico />} />
          <Route path="configuracoes" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
