import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, DollarSign, Plus, Calendar as CalendarIcon, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type FinancialRecord = {
  id: number;
  description: string;
  amount: string;
  date: string;
  category: 'fixed' | 'variable' | 'revenue';
  created_at: string;
};

export default function Financeiro() {
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res = await api.get('/dashboard-summary/');
      return res.data;
    },
  });

  const { data: expenses, isLoading: isLoadingExpenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const res = await api.get<FinancialRecord[]>('/expenses/');
      return res.data;
    },
  });

  const totalExpenses = expenses?.reduce((acc, curr) => acc + parseFloat(curr.amount), 0) || 0;
  const netProfit = (dashboardData?.completed_revenue || 0) - totalExpenses;

  const stats = [
    {
      title: 'Receita Realizada',
      value: `R$ ${(dashboardData?.completed_revenue || 0).toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-green-500',
      description: 'Total recebido hoje'
    },
    {
      title: 'Despesas Totais',
      value: `R$ ${totalExpenses.toFixed(2)}`,
      icon: TrendingDown,
      color: 'text-red-500',
      description: 'Gastos fixos e variáveis'
    },
    {
      title: 'Lucro Líquido',
      value: `R$ ${netProfit.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-blue-500',
      description: 'Receita menos despesas'
    }
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground text-sm">Controle de caixa, receitas e despesas.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2"><FileText className="w-4 h-4" /> Relatório</Button>
          <Button className="gap-2"><Plus className="w-4 h-4" /> Nova Despesa</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Transactions / Expenses */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Últimas Despesas</CardTitle>
            <CardDescription>Registro de saídas da barbearia</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingExpenses ? (
              <div className="text-center py-10 italic">Carregando...</div>
            ) : expenses?.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">Nenhuma despesa registrada.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses?.slice(0, 5).map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell className="font-medium">{exp.description}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(exp.date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-500">
                        - R$ {parseFloat(exp.amount).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Revenue Breakdown / Methods */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Resumo por Forma de Pagamento</CardTitle>
            <CardDescription>Breakdown das receitas do dia</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { method: 'PIX', amount: 450, count: 12, color: 'bg-green-500' },
              { method: 'Cartão Crédito', amount: 320, count: 5, color: 'bg-blue-500' },
              { method: 'Espécie', amount: 150, count: 4, color: 'bg-amber-500' },
              { method: 'Cartão Débito', amount: 80, count: 2, color: 'bg-purple-500' },
            ].map((m, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className={`w-2 h-10 rounded-full ${m.color}`} />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{m.method}</span>
                    <span className="font-bold">R$ {m.amount.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{m.count} atendimentos</div>
                </div>
              </div>
            ))}
            <div className="pt-4 border-t border-border mt-4">
              <Button variant="ghost" className="w-full text-primary hover:bg-primary/5">Ver histórico completo</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
