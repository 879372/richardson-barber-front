import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, Scissors, DollarSign, Package, LogOut } from 'lucide-react';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Calendar, label: 'Agenda', path: '/agenda' },
  { icon: Users, label: 'Clientes', path: '/clientes' },
  { icon: Scissors, label: 'Serviços', path: '/servicos' },
  { icon: DollarSign, label: 'Financeiro', path: '/financeiro' },
  { icon: Package, label: 'Produtos', path: '/produtos' },
];

export default function DashboardLayout() {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <h1 className="text-xl font-black text-primary uppercase tracking-wider">
            Admin<span className="text-foreground">Barber</span>
          </h1>
        </div>
        
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium ${
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:bg-accent/10 hover:text-foreground'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <button className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-destructive hover:bg-destructive/10 transition-colors font-medium">
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-8">
          <h2 className="text-lg font-semibold">Richardson Barber</h2>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
              R
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-8 bg-background">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
