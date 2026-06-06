import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, DollarSign, Plus, FileText, Loader2, Scissors, ChevronDown, User, Package, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
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

type ClientSpending = {
  client_id: number | null;
  client_name: string;
  total_spent: number;
  services_spent: number;
  products_spent: number;
  transactions: number;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const maskCurrency = (value: string) => {
  let clean = value.replace(/\D/g, '');
  if (!clean) return '0,00';
  let num = parseInt(clean) / 100;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const unmaskCurrency = (value: string) => {
  if (!value) return '0';
  return value.replace(/\./g, '').replace(',', '.');
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
  
  const [isDebtorsOpen, setIsDebtorsOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<any | null>(null);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [payPayments, setPayPayments] = useState<{ method: string; amount: string; payment_date: string }[]>([]);

  const addPayPaymentRow = () => {
    setPayPayments([...payPayments, { method: 'cash', amount: '0,00', payment_date: format(new Date(), 'yyyy-MM-dd') }]);
  };

  const removePayPaymentRow = (index: number) => {
    setPayPayments(payPayments.filter((_, i) => i !== index));
  };

  const updatePayPayment = (index: number, field: string, value: string) => {
    const newPayments = [...payPayments];
    newPayments[index] = { ...newPayments[index], [field]: value };
    setPayPayments(newPayments);
  };

  const totalPayPaid = payPayments.reduce((acc, curr) => acc + (parseFloat(unmaskCurrency(curr.amount)) || 0), 0);

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

  const { data: debts, isLoading: isDebtsLoading } = useQuery({
    queryKey: ['debts'],
    queryFn: async () => {
      const res = await api.get<any[]>('/debts/');
      return res.data;
    },
  });

  const { data: clientSpending, isLoading: isClientSpendingLoading } = useQuery({
    queryKey: ['client-spending', startDate, endDate],
    queryFn: async () => {
      const res = await api.get<ClientSpending[]>(`/client-spending/?start_date=${startDate}&end_date=${endDate}`);
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

  const payDebtMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDebt) return;
      return api.post('/debts/', {
        type: selectedDebt.type,
        id: selectedDebt.id,
        payments: payPayments.map(p => ({
          method: p.method,
          amount: unmaskCurrency(p.amount),
          payment_date: p.payment_date
        }))
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsPayOpen(false);
      setSelectedDebt(null);
      toast.success('Pagamento registrado com sucesso!');
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.error || 'Erro ao registrar pagamento.';
      toast.error(errMsg);
    }
  });

  const handlePrint = () => {
    window.print();
  };

  const setThisMonth = () => {
    setStartDate(format(firstDay, 'yyyy-MM-dd'));
    setEndDate(format(lastDay, 'yyyy-MM-dd'));
  };

  const totalPendingDebts = debts?.reduce((acc, d) => acc + d.remaining_debt, 0) || 0;

  const groupedDebts = Object.values(
    (debts || []).reduce((acc: any, debt: any) => {
      const key = debt.client_id || `avulso-${debt.client_name}`;
      if (!acc[key]) {
        acc[key] = {
          client_id: debt.client_id,
          client_name: debt.client_name,
          total_debt: 0,
          items: []
        };
      }
      acc[key].total_debt += debt.remaining_debt;
      acc[key].items.push(debt);
      return acc;
    }, {})
  ).sort((a: any, b: any) => b.total_debt - a.total_debt);

  const [expandedClient, setExpandedClient] = useState<string | null>(null);

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
      title: 'A Receber (Devedores)',
      value: formatCurrency(totalPendingDebts),
      icon: DollarSign,
      color: 'text-amber-500',
      description: 'Débitos de clientes pendentes',
      clickable: true,
      onClick: () => setIsDebtorsOpen(true)
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

      <div className="grid gap-6 md:grid-cols-6 sm:grid-cols-2">
        {stats.map((stat: any, i) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={i} 
              className={`border-border/50 bg-card/50 backdrop-blur-sm print:shadow-none print:border-gray-200 overflow-hidden relative group transition-all duration-300 ${stat.clickable ? 'cursor-pointer hover:bg-primary/5 hover:border-amber-500/50 shadow-md ring-1 ring-amber-500/10' : ''}`}
              onClick={stat.onClick}
            >
              <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-5 transition-transform group-hover:scale-110 ${stat.color.replace('text', 'bg')}`} />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{stat.title}</CardTitle>
                <Icon className={`w-4 h-4 ${stat.color} print:text-black`} />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{isLoading ? '...' : stat.value}</div>
                {stat.clickable && (
                  <div className="text-[9px] font-bold text-amber-500 mt-1 uppercase tracking-widest animate-pulse">Clique para ver</div>
                )}
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

      <div className="grid gap-6">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm print:shadow-none print:border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl font-medium">Gastos por Cliente</CardTitle>
            <CardDescription>Total gasto por cada cliente no período selecionado</CardDescription>
          </CardHeader>
          <CardContent>
            {isClientSpendingLoading ? (
              <div className="text-center py-10 italic">Carregando...</div>
            ) : !clientSpending || clientSpending.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">Nenhum gasto registrado neste período.</div>
            ) : (
              <div className="space-y-3">
                {clientSpending.map((client, idx) => {
                  return (
                    <div key={client.client_id || `avulso-${idx}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between items-start sm:w-1/3">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold flex items-center">
                            {client.client_name}
                            {client.client_id === null && <span className="ml-2 text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground uppercase">Avulso</span>}
                          </span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                            {client.transactions} {client.transactions === 1 ? 'Lançamento' : 'Lançamentos'}
                          </span>
                        </div>
                        {/* Exibe o total no topo à direita apenas no mobile */}
                        <div className="font-bold text-green-500 print:text-black text-base text-right sm:hidden">
                          {formatCurrency(client.total_spent)}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 w-full sm:flex-1 sm:max-w-md">
                        <div className="flex gap-3 text-xs">
                          {client.services_spent > 0 && (
                            <span className="flex items-center gap-1 text-blue-500 font-medium">
                              <Scissors className="w-3 h-3" /> {formatCurrency(client.services_spent)}
                            </span>
                          )}
                          {client.products_spent > 0 && (
                            <span className="flex items-center gap-1 text-amber-500 font-medium">
                              <Package className="w-3 h-3" /> {formatCurrency(client.products_spent)}
                            </span>
                          )}
                        </div>
                        <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden flex">
                          {client.services_spent > 0 && <div className="h-full bg-blue-500" style={{ width: `${(client.services_spent / client.total_spent) * 100}%` }} />}
                          {client.products_spent > 0 && <div className="h-full bg-amber-500" style={{ width: `${(client.products_spent / client.total_spent) * 100}%` }} />}
                        </div>
                      </div>

                      {/* Exibe o total à direita apenas no desktop */}
                      <div className="hidden sm:block font-bold text-green-500 print:text-black text-base text-right sm:w-1/4">
                        {formatCurrency(client.total_spent)}
                      </div>
                    </div>
                  );
                })}
              </div>
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

      {/* Debtors List Modal */}
      <Dialog open={isDebtorsOpen} onOpenChange={setIsDebtorsOpen}>
        <DialogContent className="sm:max-w-[700px] bg-card border-border overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
              <TrendingDown className="w-6 h-6 text-amber-500" />
              Clientes Devedores (Contas a Receber)
            </DialogTitle>
            <DialogDescription>
              Clique sobre um registro para amortizar o débito (total ou parcial).
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {isDebtsLoading ? (
              <div className="text-center py-10 italic">Carregando devedores...</div>
            ) : groupedDebts.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground italic">Nenhum cliente devedor pendente.</div>
            ) : (
              <div className="space-y-4">
                {groupedDebts.map((group: any) => {
                  const isExpanded = expandedClient === group.client_id;
                  return (
                    <div key={group.client_id || group.client_name} className="border border-border/50 rounded-xl overflow-hidden bg-card/50">
                      <div 
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-primary/5 transition-colors"
                        onClick={() => setExpandedClient(isExpanded ? null : group.client_id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-base">{group.client_name}</h3>
                            <p className="text-xs text-muted-foreground">{group.items.length} {group.items.length === 1 ? 'conta' : 'contas'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Total Devendo</p>
                            <p className="font-black text-amber-500 text-lg">{formatCurrency(group.total_debt)}</p>
                          </div>
                          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="bg-muted/30 border-t border-border/50 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-right">Pago</TableHead>
                                <TableHead className="text-right font-bold text-amber-500">Pendente</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {group.items.map((debt: any) => (
                                <TableRow 
                                  key={`${debt.type}-${debt.id}`} 
                                  className="cursor-pointer hover:bg-primary/10 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDebt(debt);
                                    setPayPayments([{ 
                                      method: 'pix', 
                                      amount: maskCurrency((debt.remaining_debt * 100).toFixed(0)),
                                      payment_date: format(new Date(), 'yyyy-MM-dd')
                                    }]);
                                    setIsPayOpen(true);
                                  }}
                                >
                                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                    {format(new Date(debt.date), 'dd/MM/yy HH:mm')}
                                  </TableCell>
                                  <TableCell className="text-xs">{debt.description}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(debt.total_price)}</TableCell>
                                  <TableCell className="text-right text-green-500">{formatCurrency(debt.total_paid)}</TableCell>
                                  <TableCell className="text-right font-bold text-amber-500">{formatCurrency(debt.remaining_debt)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDebtorsOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Amortization (Payment) Dialog */}
      <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-500" />
              Receber Pagamento
            </DialogTitle>
            <DialogDescription>
              Registre o pagamento para o débito de <strong>{selectedDebt?.client_name}</strong>.
            </DialogDescription>
          </DialogHeader>

          {selectedDebt && (
            <div className="grid gap-4 py-4">
              <div className="p-3 bg-muted/50 rounded-xl space-y-1.5 border border-border/50 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs font-bold uppercase">Total da Conta:</span>
                  <span className="font-semibold">{formatCurrency(selectedDebt.total_price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs font-bold uppercase">Valor Já Pago:</span>
                  <span className="font-semibold text-green-500">{formatCurrency(selectedDebt.total_paid)}</span>
                </div>
                <div className="flex justify-between border-t border-border/20 pt-1.5 mt-1.5 font-bold">
                  <span className="text-amber-500 text-xs font-bold uppercase">Saldo Devedor:</span>
                  <span className="text-amber-500">{formatCurrency(selectedDebt.remaining_debt)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">Formas de Pagamento</label>
                {payPayments.map((payment, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <div className="flex-1">
                      <Select
                        value={payment.method}
                        onValueChange={(val) => updatePayPayment(index, 'method', val)}
                      >
                        <SelectTrigger className="bg-background border-border/50 h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="cash">Dinheiro</SelectItem>
                          <SelectItem value="credit">Cartão de Crédito</SelectItem>
                          <SelectItem value="debit">Cartão de Débito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Input
                        type="date"
                        className="bg-background border-border/50 h-11"
                        value={payment.payment_date}
                        onChange={(e) => updatePayPayment(index, 'payment_date', e.target.value)}
                      />
                    </div>
                    <div className="w-32 relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        type="text"
                        className="pl-8 bg-background border-border/50 h-11 font-semibold"
                        value={payment.amount}
                        onChange={(e) => updatePayPayment(index, 'amount', maskCurrency(e.target.value))}
                      />
                    </div>
                    {payPayments.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive h-11 w-11"
                        onClick={() => removePayPaymentRow(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full gap-2 border-dashed h-11 mt-1" 
                onClick={addPayPaymentRow}
              >
                <Plus className="w-4 h-4" /> Adicionar forma de pagamento
              </Button>

              <div className={`p-3 rounded-xl flex flex-col gap-1 transition-colors ${totalPayPaid <= selectedDebt.remaining_debt + 0.01 ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                <div className="flex justify-between items-center text-sm font-bold">
                  <span>Total a Amortizar:</span>
                  <span>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPayPaid)}
                  </span>
                </div>
                {totalPayPaid > selectedDebt.remaining_debt + 0.01 && (
                  <span className="text-[10px] text-red-500 font-medium">
                    O valor excede o saldo devedor pendente!
                  </span>
                )}
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setIsPayOpen(false)}>Cancelar</Button>
                <Button 
                  className="h-11 font-bold bg-amber-500 hover:bg-amber-600 text-white"
                  disabled={payDebtMutation.isPending || totalPayPaid === 0 || totalPayPaid > selectedDebt.remaining_debt + 0.01}
                  onClick={() => payDebtMutation.mutate()}
                >
                  {payDebtMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Confirmar Recebimento
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
