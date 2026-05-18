import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, Phone, Calendar, History, Loader2, Save, MessageSquare, Search, Plus, Trash2 } from 'lucide-react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';

type Customer = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  birth_date: string;
  internal_notes: string;
  debt_balance?: number;
};

type Appointment = {
  id: number;
  service_name: string;
  barber_name: string;
  date_time: string;
  status: string;
  total_price: string;
  discount?: string;
  tip?: string;
  notes?: string;
};

const maskDate = (v: string) => {
  v = v.replace(/\D/g, "");
  if (v.length > 8) v = v.slice(0, 8);
  v = v.replace(/^(\d{2})(\d)/, "$1/$2");
  v = v.replace(/^(\d{2})\/(\d{2})(\d)/, "$1/$2/$3");
  return v;
};

const maskPhone = (v: string) => {
  if (!v) return "";
  v = v.replace(/\D/g, "");
  if (v.length > 11) v = v.slice(0, 11);
  v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
  v = v.replace(/(\d)(\d{4})$/, "$1-$2");
  return v;
};

const dateToBackend = (dateStr: string) => {
  if (!dateStr || !dateStr.includes('/')) return dateStr || null;
  const [day, month, year] = dateStr.split('/');
  if (!day || !month || !year || year.length < 4) return dateStr || null;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

export default function Customers() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  
  // Create Client Form State
  const [newClient, setNewClient] = useState({
    name: '',
    phone: '',
    birth_date: '',
    email: ''
  });

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await api.get<Customer[]>('/users/?role=client');
      return res.data;
    },
  });

  const { data: history, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['customer-history', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      const res = await api.get<Appointment[]>(`/appointments/?client=${selectedCustomer.id}`);
      return res.data;
    },
    enabled: !!selectedCustomer,
  });

  // Debtors states & helpers
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState<Customer | null>(null);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<any | null>(null);
  const [payPayments, setPayPayments] = useState<{ method: string; amount: string }[]>([]);

  const { data: debts, isLoading: isDebtsLoading } = useQuery({
    queryKey: ['debts'],
    queryFn: async () => {
      const res = await api.get<any[]>('/debts/');
      return res.data;
    },
  });

  const customerDebts = debts?.filter(d => d.client_id === selectedCustomerForPayment?.id) || [];

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

  const addPayPaymentRow = () => {
    setPayPayments([...payPayments, { method: 'cash', amount: '0,00' }]);
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

  const payDebtMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDebt) return;
      return api.post('/debts/', {
        type: selectedDebt.type,
        id: selectedDebt.id,
        payments: payPayments.map(p => ({
          method: p.method,
          amount: unmaskCurrency(p.amount)
        }))
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
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

  const [saved, setSaved] = useState(false);

  const updateNotesMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomer) return;
      return api.patch(`/users/${selectedCustomer.id}/`, { internal_notes: notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      if (selectedCustomer) {
        setSelectedCustomer({ ...selectedCustomer, internal_notes: notes });
      }
      setSaved(true);
      toast.success('Observações salvas com sucesso!');
      setTimeout(() => setSaved(false), 2000);
    },
    onError: () => toast.error('Erro ao salvar observações.'),
  });

  const createClientMutation = useMutation({
    mutationFn: async (client: any) => {
      const payload = {
        username: client.phone.replace(/\D/g, ""),
        first_name: client.name,
        phone: client.phone.replace(/\D/g, ""),
        email: client.email || `${client.phone.replace(/\D/g, "")}@barber.com`,
        birth_date: dateToBackend(client.birth_date),
        role: 'client'
      };
      const res = await api.post('/users/', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowCreateModal(false);
      setNewClient({ name: '', phone: '', birth_date: '', email: '' });
      toast.success('Cliente cadastrado com sucesso!');
    },
    onError: () => toast.error('Erro ao cadastrar cliente. Verifique os dados.'),
  });

  const cancelRecurringMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.post(`/appointments/${id}/cancel_recurring/`);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['customer-history'] });
      toast.success(res.data.status || 'Agendamentos recorrentes cancelados!');
    },
    onError: () => toast.error('Erro ao cancelar agendamentos recorrentes.'),
  });

  const cancelSingleMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.patch(`/appointments/${id}/`, { status: 'cancelled' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-history'] });
      toast.success('Agendamento cancelado com sucesso.');
    },
    onError: () => toast.error('Erro ao cancelar agendamento.'),
  });

  const handleOpenDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setNotes(customer.internal_notes || "");
  };

  const statusMap: Record<string, string> = {
    pending: "Pendente",
    confirmed: "Confirmado",
    completed: "Concluído",
    cancelled: "Cancelado",
    no_show: "Faltou",
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground text-sm">Gerencie a base de clientes e histórico de atendimentos.</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <User className="w-4 h-4" /> Novo Cliente
        </Button>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
          <CardTitle>Lista de Clientes</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome ou telefone..." 
              className="pl-9 bg-background border-border/50 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-10">Carregando clientes...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Data Nasc.</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="text-right">Saldo Devedor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers?.filter(c => {
                    const search = searchTerm.toLowerCase();
                    return (c.first_name || '').toLowerCase().includes(search) ||
                           (c.username || '').toLowerCase().includes(search) ||
                           (c.phone || '').includes(search);
                  }).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      {searchTerm ? "Nenhum cliente encontrado para esta busca." : "Nenhum cliente cadastrado."}
                    </TableCell>
                  </TableRow>
                ) : (
                  customers?.filter(c => {
                    const search = searchTerm.toLowerCase();
                    return (c.first_name || '').toLowerCase().includes(search) ||
                           (c.username || '').toLowerCase().includes(search) ||
                           (c.phone || '').includes(search);
                  }).map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-bold">{customer.first_name || customer.username}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                          {maskPhone(customer.phone)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          {customer.birth_date ? format(new Date(customer.birth_date + 'T00:00:00'), 'dd/MM/yyyy') : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate text-xs text-muted-foreground italic">
                          {customer.internal_notes || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {customer.debt_balance && parseFloat(customer.debt_balance as any) > 0.01 ? (
                          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 font-black">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(customer.debt_balance as any))}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-2">
                          {customer.debt_balance && parseFloat(customer.debt_balance as any) > 0.01 && (
                            <Button 
                              size="sm" 
                              className="bg-amber-500 hover:bg-amber-600 text-white font-bold h-8 text-xs shrink-0"
                              onClick={() => {
                                setSelectedCustomerForPayment(customer);
                              }}
                            >
                              Pagar Débito
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-primary hover:text-primary hover:bg-primary/10 font-bold h-8 text-xs shrink-0"
                            onClick={() => handleOpenDetails(customer)}
                          >
                            Ver Ficha
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-card border-l border-border">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-2xl font-bold">
              <User className="w-6 h-6 text-primary" />
              Ficha do Cliente
            </SheetTitle>
            <SheetDescription>
              Dados detalhados e histórico de {selectedCustomer?.first_name || selectedCustomer?.username}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-8 space-y-8">
            {/* Informações Básicas */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border/50 pb-1">Dados de Contato</h3>
              <div className="grid gap-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border/50">
                  <Phone className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold">{maskPhone(selectedCustomer?.phone || "")}</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border/50">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold">Nasc: {selectedCustomer?.birth_date ? format(new Date(selectedCustomer.birth_date + 'T00:00:00'), 'dd/MM/yyyy') : "Não informado"}</span>
                </div>
              </div>
            </div>

            {/* Observações Internas */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Observações Técnicas
                </h3>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 gap-1 text-primary font-bold"
                  onClick={() => updateNotesMutation.mutate()}
                  disabled={updateNotesMutation.isPending || saved}
                >
                  {updateNotesMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  {saved ? "Salvo!" : "Salvar"}
                </Button>
              </div>
              <Textarea 
                placeholder="Ex: Prefere máquina 2, alérgico a tal produto..."
                className="min-h-[100px] bg-background border-border/50 rounded-xl"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Histórico de Agendamentos */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border/50 pb-1">
                <History className="w-4 h-4 text-primary" />
                Histórico de Serviços
              </h3>
              <div className="space-y-3">
                {isLoadingHistory ? (
                  <div className="text-center py-4 text-xs italic">Carregando histórico...</div>
                ) : history?.length === 0 ? (
                  <div className="text-center py-4 text-xs text-muted-foreground">Nenhum serviço registrado.</div>
                ) : (
                  history?.map((app) => (
                    <div key={app.id} className="p-3 rounded-xl border border-border/50 bg-background space-y-2 hover:border-primary/30 transition-colors">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-bold">{app.service_name}</span>
                        <Badge variant="outline" className="text-[10px] h-5 px-2 bg-muted/50 border-none uppercase font-bold">
                          {statusMap[app.status] || app.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span className="font-medium">{format(new Date(app.date_time), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(app.total_price))}</span>
                          {(app.status === 'confirmed' || app.status === 'pending') && (
                            <div className="flex gap-1 ml-2 border-l border-border/50 pl-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 px-2 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10 font-bold"
                                onClick={() => cancelSingleMutation.mutate(app.id)}
                              >
                                Cancelar
                              </Button>
                              {app.notes?.includes('Recorrente') && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 px-2 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10 font-black"
                                  onClick={() => cancelRecurringMutation.mutate(app.id)}
                                >
                                  Toda Série
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Create Client Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
            <DialogDescription>
              Cadastre um novo cliente no sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input 
                placeholder="Ex: João Silva" 
                className="bg-background border-border/50 h-11"
                value={newClient.name}
                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input 
                placeholder="(00) 00000-0000" 
                className="bg-background border-border/50 h-11"
                value={newClient.phone}
                onChange={(e) => setNewClient({ ...newClient, phone: maskPhone(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex justify-between">
                Data de Nascimento
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Opcional</span>
              </Label>
              <Input 
                placeholder="DD/MM/AAAA"
                className="bg-background border-border/50 h-11"
                value={newClient.birth_date}
                onChange={(e) => setNewClient({ ...newClient, birth_date: maskDate(e.target.value) })}
                inputMode="numeric"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex justify-between">
                E-mail
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Opcional</span>
              </Label>
              <Input 
                type="email"
                placeholder="email@exemplo.com" 
                className="bg-background border-border/50 h-11"
                value={newClient.email}
                onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
            <Button 
              disabled={!newClient.name || !newClient.phone || createClientMutation.isPending}
              onClick={() => createClientMutation.mutate(newClient)}
            >
              {createClientMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client's Specific Debts List Dialog */}
      <Dialog open={!!selectedCustomerForPayment} onOpenChange={(open) => !open && setSelectedCustomerForPayment(null)}>
        <DialogContent className="sm:max-w-[600px] bg-card border-border overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-primary">
              <Phone className="w-5 h-5 text-amber-500 rotate-90" />
              Débitos de {selectedCustomerForPayment?.first_name || selectedCustomerForPayment?.username}
            </DialogTitle>
            <DialogDescription>
              Selecione o agendamento ou venda abaixo para realizar a amortização do saldo devedor.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {isDebtsLoading ? (
              <div className="text-center py-6 italic">Carregando contas...</div>
            ) : customerDebts.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground italic">Nenhum saldo devedor pendente para este cliente.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right font-bold text-amber-500">Pendente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerDebts.map((debt: any) => (
                    <TableRow 
                      key={`${debt.type}-${debt.id}`} 
                      className="cursor-pointer hover:bg-primary/5 transition-colors"
                      onClick={() => {
                        setSelectedDebt(debt);
                        setPayPayments([{ method: 'pix', amount: maskCurrency((debt.remaining_debt * 100).toFixed(0)) }]);
                        setIsPayOpen(true);
                      }}
                    >
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(debt.date), 'dd/MM/yy HH:mm')}
                      </TableCell>
                      <TableCell className="text-xs">{debt.description}</TableCell>
                      <TableCell className="text-right">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(debt.total_price)}
                      </TableCell>
                      <TableCell className="text-right font-black text-amber-500">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(debt.remaining_debt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCustomerForPayment(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Amortization (Payment) Dialog */}
      <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <User className="w-5 h-5 text-amber-500" />
              Receber Débito Parcial/Total
            </DialogTitle>
            <DialogDescription>
              Amortize a dívida de <strong>{selectedCustomerForPayment?.first_name || selectedCustomerForPayment?.username}</strong>.
            </DialogDescription>
          </DialogHeader>

          {selectedDebt && (
            <div className="grid gap-4 py-4">
              <div className="p-3 bg-muted/50 rounded-xl space-y-1.5 border border-border/50 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs font-bold uppercase tracking-tight">Total da Conta:</span>
                  <span className="font-semibold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedDebt.total_price)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs font-bold uppercase tracking-tight">Já Pago:</span>
                  <span className="font-semibold text-green-500">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedDebt.total_paid)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border/20 pt-1.5 mt-1.5 font-bold">
                  <span className="text-amber-500 text-xs font-bold uppercase tracking-tight">Pendente:</span>
                  <span className="text-amber-500">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedDebt.remaining_debt)}
                  </span>
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
                    <div className="w-36 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground text-sm font-bold">R$</span>
                      <Input
                        type="text"
                        className="pl-9 bg-background border-border/50 h-11 font-semibold"
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
                  Confirmar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
