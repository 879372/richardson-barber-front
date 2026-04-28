import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layouts & Pages
import DashboardLayout from './pages/DashboardLayout';
import BookingPortal from './pages/BookingPortal';

const Login = () => <div className="min-h-screen flex items-center justify-center bg-background text-foreground"><h1 className="text-3xl text-primary font-bold">Login Area</h1></div>;
const DashboardHome = () => <div><h1 className="text-3xl font-bold mb-4">Visão Geral</h1><p className="text-muted-foreground">Resumo do dia e métricas principais aqui.</p></div>;
const Agenda = () => <div><h1 className="text-3xl font-bold mb-4">Agenda</h1></div>;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/agendar" element={<BookingPortal />} />
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardHome />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="clientes" element={<div><h1 className="text-3xl font-bold">Clientes</h1></div>} />
          <Route path="servicos" element={<div><h1 className="text-3xl font-bold">Serviços</h1></div>} />
          <Route path="financeiro" element={<div><h1 className="text-3xl font-bold">Financeiro</h1></div>} />
          <Route path="produtos" element={<div><h1 className="text-3xl font-bold">Produtos</h1></div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
