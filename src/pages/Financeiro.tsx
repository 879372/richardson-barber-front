import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, DollarSign, Plus, FileText, Loader2, Scissors, ChevronDown, User, Package } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';

type FinancialSummary = {
  total_revenue: number;
  service_revenue: number;
  product_revenue: number;
  total_expenses: number;
  net_profit: number;
  method_summary: { 
    method: string; 
    total_amount: number; 
    count: number;
    details: {
      type: 'service' | 'product';
      client: string;
      description: string;
      amount: number;
      date: string;
    }[]
  }[];
  expenses: any[];
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const methodLabels: Record<string, string> = {
  pix: 'PIX',
  cash: 'Dinheiro',
  credit: 'Cartão de Crédito',
  debit: 'Cartão de Débito',
  transfer: 'Transferência',
};

const methodColors: Record<string, string> = {
  pix: 'bg-green-500',
  cash: 'bg-amber-500',
  credit: 'bg-blue-500',
  debit: 'bg-purple-500',
  transfer: 'bg-slate-500',
};

export default function Financeiro() {
  const queryClient = useQueryClient();
  
  // Set defaults to current month
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [startDate, setStartDate] = useState(format(firstDay, 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(lastDay, 'yyyy-MM-dd'));
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [expandedMethod, setExpandedMethod] = useState<string | null>(null);
  
  // Form state
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [category, setCategory] = useState<'fixed' | 'variable'>('variable');

  const { data: summary, isLoading } = useQuery({
    queryKey: ['financial-summary', startDate, endDate],
    queryFn: async () => {
      const res = await api.get<FinancialSummary>(`/financial-summary/?start_date=${startDate}&end_date=${endDate}`);
      return res.data;
    },
  });

  const addExpenseMutation = useMutation({
    mutationFn: async () => {
      return api.post('/expenses/', {
        description: desc,
        amount: parseFloat(amount),
        date: date,
        category: category
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      setIsExpenseOpen(false);
      setDesc('');
      setAmount('');
      toast.success('Despesa registrada com sucesso!');
    },
    onError: () => toast.error('Erro ao registrar despesa.')
  });

  const handlePrint = () => {
    window.print();
  };

  const setThisMonth = () => {
    setStartDate(format(firstDay, 'yyyy-MM-dd'));
    setEndDate(format(lastDay, 'yyyy-MM-dd'));
  };

  const stats = [
    {
      title: 'Faturamento Total',
      value: formatCurrency(summary?.total_revenue || 0),
      icon: TrendingUp,
      color: 'text-green-500',
      description: 'Receita total no período'
    },
    {
      title: 'Serviços',
      value: formatCurrency(summary?.service_revenue || 0),
      icon: Scissors,
      color: 'text-blue-500',
      description: 'Receita de atendimentos'
    },
    {
      title: 'Produtos',
      value: formatCurrency(summary?.product_revenue || 0),
      icon: DollarSign,
      color: 'text-amber-500',
      description: 'Receita de vendas'
    },
    {
      title: 'Despesas',
      value: formatCurrency(summary?.total_expenses || 0),
      icon: TrendingDown,
      color: 'text-red-500',
      description: 'Gastos totais no período'
    },
    {
      title: 'Resultado',
      value: formatCurrency(summary?.net_profit || 0),
      icon: DollarSign,
      color: summary?.net_profit && summary.net_profit >= 0 ? 'text-emerald-500' : 'text-red-600',
      description: 'Lucro ou prejuízo líquido'
    }
  ];

  return (
    <div className="space-y-8 print:m-0 print:p-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground text-sm">Controle de caixa, receitas e despesas.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 font-medium" onClick={handlePrint}>
            <FileText className="w-4 h-4" /> Relatório
          </Button>
          <Button className="gap-2 font-bold shadow-lg shadow-primary/20" onClick={() => setIsExpenseOpen(true)}>
            <Plus className="w-4 h-4" /> Nova Despesa
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-card/50 p-4 rounded-2xl border border-border/50 gap-4 print:hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
          <div className="flex flex-col gap-1.5 w-full sm:w-44">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Data Inicial</label>
            <Input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-background border-border/50 h-9"
            />
          </div>
          <div className="flex flex-col gap-1.5 w-full sm:w-44">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Data Final</label>
            <Input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-background border-border/50 h-9"
            />
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full sm:w-auto h-9" onClick={setThisMonth}>Mês Atual</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="border-border/50 bg-card/50 backdrop-blur-sm print:shadow-none print:border-gray-200 overflow-hidden relative group">
              <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-5 transition-transform group-hover:scale-110 ${stat.color.replace('text', 'bg')}`} />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{stat.title}</CardTitle>
                <Icon className={`w-4 h-4 ${stat.color} print:text-black`} />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{isLoading ? '...' : stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Transactions / Expenses */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm print:shadow-none print:border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl font-medium">Listagem de Despesas</CardTitle>
            <CardDescription>Registro de saídas da barbearia</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-10 italic">Carregando...</div>
            ) : summary?.expenses.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">Nenhuma despesa para este período.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-medium">Descrição</TableHead>
                    <TableHead className="font-medium">Data</TableHead>
                    <TableHead className="text-right font-bold">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary?.expenses.map((exp: any) => (
                    <TableRow key={exp.id}>
                      <TableCell className="font-medium text-sm">{exp.description}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(exp.date + 'T00:00:00'), 'dd/MM/yy')}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-red-500 print:text-black">
                        - {formatCurrency(exp.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Revenue Breakdown / Methods */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm print:shadow-none print:border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl font-medium">Resumo por Forma de Pagamento</CardTitle>
            <CardDescription>Distribuição das receitas por tipo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="text-center py-10 italic">Carregando...</div>
            ) : summary?.method_summary.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground italic">Nenhuma receita para este período.</div>
            ) : (
              summary?.method_summary.map((m, i) => (
                <div key={i} className="flex flex-col border border-border/50 rounded-2xl overflow-hidden">
                  <button 
                    onClick={() => setExpandedMethod(expandedMethod === m.method ? null : m.method)}
                    className="flex items-center gap-4 p-4 hover:bg-primary/5 transition-colors group w-full text-left"
                  >
                    <div className={`w-2 h-10 rounded-full ${methodColors[m.method] || 'bg-slate-400'} print:bg-gray-300`} />
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm">{methodLabels[m.method] || m.method}</span>
                        <span className="font-semibold text-lg">{formatCurrency(m.total_amount)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">{m.count} lançamentos</div>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${expandedMethod === m.method ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </button>
                  
                  {expandedMethod === m.method && (
                    <div className="bg-muted/30 border-t border-border/50 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="p-2 space-y-1">
                        {m.details.map((detail, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border/30">
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 rounded-md bg-background border border-border/50">
                                {detail.type === 'service' ? <User className="w-3 h-3 text-blue-500" /> : <Package className="w-3 h-3 text-amber-500" />}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold">{detail.description}</span>
                                <span className="text-[10px] text-muted-foreground">{detail.client} • {format(new Date(detail.date), 'dd/MM HH:mm')}</span>
                              </div>
                            </div>
                            <span className="text-sm font-bold text-foreground">
                              {formatCurrency(detail.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-2xl font-medium">Registrar Nova Despesa</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição</label>
              <Input 
                placeholder="Ex: Aluguel, Conta de Luz..." 
                className="bg-background border-border/50 h-11"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor (R$)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="0,00" 
                  className="bg-background border-border/50 pl-9 h-11"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Data</label>
                <Input 
                  type="date" 
                  className="bg-background border-border/50 h-11"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoria</label>
                <Select value={category} onValueChange={(val) => setCategory(val as any)}>
                  <SelectTrigger className="bg-background border-border/50 h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="fixed">Fixa</SelectItem>
                    <SelectItem value="variable">Variável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExpenseOpen(false)}>Cancelar</Button>
            <Button 
              className="h-11 font-medium px-8"
              onClick={() => addExpenseMutation.mutate()} 
              disabled={!desc || !amount || addExpenseMutation.isPending}
            >
              {addExpenseMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar Despesa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
