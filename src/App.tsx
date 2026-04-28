import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Layouts
const DashboardLayout = () => <div className="flex h-screen bg-background">Dashboard Layout Placeholder</div>

// Pages
const BookingPortal = () => <div className="min-h-screen flex items-center justify-center bg-zinc-50">Portal de Agendamento</div>
const Login = () => <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-white">Login</div>

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/agendar" element={<BookingPortal />} />
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<div>Dashboard</div>} />
          <Route path="agenda" element={<div>Agenda</div>} />
          <Route path="clientes" element={<div>Clientes</div>} />
          <Route path="servicos" element={<div>Serviços</div>} />
          <Route path="financeiro" element={<div>Financeiro</div>} />
          <Route path="produtos" element={<div>Produtos</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
