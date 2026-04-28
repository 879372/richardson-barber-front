import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, DollarSign, TrendingUp, CheckCircle2, Target, Cake } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

type DashboardData = {
  total_appointments: number;
  predicted_revenue: number;
  completed_revenue: number;
  daily_goal: number;
  progress_percentage: number;
};

type BirthdayData = {
  today: any[];
  week: any[];
};

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res = await api.get<DashboardData>('/dashboard-summary/');
      return res.data;
    },
  });

  const { data: bdays } = useQuery({
    queryKey: ['birthdays'],
    queryFn: async () => {
      const res = await api.get<BirthdayData>('/users/birthdays/');
      return res.data;
    },
  });

  const cards = [
    {
      title: 'Agendamentos Hoje',
      value: data?.total_appointments || 0,
      icon: Calendar,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      title: 'Faturamento Previsto',
      value: `R$ ${(data?.predicted_revenue || 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      title: 'Faturamento Realizado',
      value: `R$ ${(data?.completed_revenue || 0).toFixed(2)}`,
      icon: CheckCircle2,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Visão Geral</h1>
        <p className="text-muted-foreground">Bem-vindo de volta! Aqui está o resumo do seu dia.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index} className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? '...' : card.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="md:col-span-4 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Meta Diária
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Progresso atual</p>
                <div className="text-3xl font-black">
                  {(data?.progress_percentage || 0).toFixed(1)}%
                </div>
              </div>
              <div className="text-right space-y-1">
                <p className="text-sm text-muted-foreground">Meta: R$ {(data?.daily_goal || 0).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Falta: R$ {Math.max(0, (data?.daily_goal || 0) - (data?.completed_revenue || 0)).toFixed(2)}</p>
              </div>
            </div>
            <Progress value={data?.progress_percentage} className="h-3" />
            <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium">Continue assim!</p>
                <p className="text-xs text-muted-foreground">Você está no caminho certo para bater a meta de hoje.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cake className="w-5 h-5 text-pink-500" />
              Aniversariantes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Hoje</h4>
              {bdays?.today.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nenhum hoje</p>
              ) : (
                bdays?.today.map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between p-2 rounded-lg bg-pink-500/5 border border-pink-500/10">
                    <span className="text-sm font-medium">{user.first_name || user.username}</span>
                    <Cake className="w-3 h-3 text-pink-500" />
                  </div>
                ))
              )}
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Próximos 7 dias</h4>
              {bdays?.week.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nenhum nos próximos dias</p>
              ) : (
                bdays?.week.map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/5">
                    <span className="text-sm">{user.first_name || user.username}</span>
                    <span className="text-xs text-muted-foreground">{new Date(user.birth_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
