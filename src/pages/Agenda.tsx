import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { Clock, User, Scissors, XCircle, MoreVertical, Plus, Trash2, Loader2, DollarSign, Filter, RefreshCw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';
import { Search, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

type Appointment = {
  id: number;
  client_name: string;
  barber_name: string;
  service_name: string;
  date_time: string;
  status: string;
  total_price: string;
  notes?: string;
};

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-500/10 text-yellow-500' },
  confirmed: { label: 'Confirmado', color: 'bg-blue-500/10 text-blue-500' },
  completed: { label: 'Concluído', color: 'bg-green-500/10 text-green-500' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/10 text-red-500' },
  no_show: { label: 'Faltou', color: 'bg-gray-500/10 text-gray-500' },
};

const formatCurrency = (value: number | string) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    typeof value === 'string' ? parseFloat(value) : value
  );

const maskDate = (v: string) => {
  v = v.replace(/\D/g, "");
  if (v.length > 8) v = v.slice(0, 8);
  if (v.length > 2) v = v.replace(/^(\d{2})(\d)/g, "$1/$2");
  if (v.length > 5) v = v.replace(/^(\d{2})\/(\d{2})(\d)/g, "$1/$2/$3");
  return v;
};

const dateToBackend = (dateStr: string) => {
  if (!dateStr || !dateStr.includes('/')) return dateStr;
  const [day, month, year] = dateStr.split('/');
  if (!day || !month || !year || year.length < 4) return dateStr;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};



export default function Agenda() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<string>('confirmed');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [showQuickCreateClient, setShowQuickCreateClient] = useState(false);
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);
  const [payments, setPayments] = useState<{ method: string; amount: string }[]>([]);
  
  // New Appointment Form State
  const [newAppClient, setNewAppClient] = useState<any>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [isClientPopoverOpen, setIsClientPopoverOpen] = useState(false);
  const [newAppService, setNewAppService] = useState<any>(null);
  const [newAppBarber, setNewAppBarber] = useState<any>(null);
  const [newAppTime, setNewAppTime] = useState<string>('');
  const [newAppNotes, setNewAppNotes] = useState<string>('');

  // Recurrence State
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('weekly');
  const [recurrenceCount, setRecurrenceCount] = useState(4);

  // Quick Create Client State
  const [quickClient, setQuickClient] = useState({
    name: '',
    phone: '',
    birth_date: ''
  });

  const queryClient = useQueryClient();

  const { data: customMethods } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => (await api.get<any[]>('/payment-methods/')).data
  });

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const res = await api.get<Appointment[]>(`/appointments/?date_time__date=${format(selectedDate, 'yyyy-MM-dd')}`);
      return res.data;
    },
    refetchInterval: 300000, // 5 minutes
  });
  
  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => (await api.get<any[]>('/users/?role=client')).data,
    enabled: showNewAppointmentModal
  });

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async () => (await api.get<any[]>('/services/')).data,
    enabled: showNewAppointmentModal
  });

  const { data: barbers } = useQuery({
    queryKey: ['barbers'],
    queryFn: async () => (await api.get<any[]>('/users/?role=barber')).data,
    enabled: showNewAppointmentModal
  });

  const { data: availableTimes, isLoading: isLoadingTimes } = useQuery({
    queryKey: ['available-times', newAppBarber?.id, selectedDate, newAppService?.id],
    queryFn: async () => {
      if (!newAppBarber || !selectedDate || !newAppService) return [];
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await api.get<string[]>(`/users/${newAppBarber.id}/available_times/?date=${dateStr}&service_id=${newAppService.id}`);
      return res.data;
    },
    enabled: !!newAppBarber && !!selectedDate && !!newAppService && showNewAppointmentModal,
  });

  const [customDates, setCustomDates] = useState<Date[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);

  const checkDatesAvailability = async (dates: Date[]) => {
    if (!newAppBarber || !newAppService || !newAppTime || dates.length === 0) return;
    
    try {
      const dateStrings = dates.map(d => format(d, 'yyyy-MM-dd'));
      const res = await api.post('/appointments/check_availability/', {
        barber_id: newAppBarber.id,
        service_id: newAppService.id,
        time: newAppTime,
        dates: dateStrings
      });
      
      const unavailable = res.data
        .filter((r: any) => !r.available)
        .map((r: any) => r.date);
        
      setUnavailableDates(unavailable);
    } catch (error) {
      console.error("Erro ao verificar disponibilidade das datas", error);
    }
  };

  const getRecurrenceDates = () => {
    if (!selectedDate || !newAppTime) return [];
    
    if (recurrenceType === 'custom') {
      return customDates.map(d => {
        const [hours, minutes] = newAppTime.split(':');
        const dateTime = new Date(d);
        dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        return dateTime;
      });
    }

    const [hours, minutes] = newAppTime.split(':');
    const dates = [];
    const baseDate = new Date(selectedDate);
    baseDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    for (let i = 0; i < recurrenceCount; i++) {
      const d = new Date(baseDate);
      if (recurrenceType === 'weekly') {
        d.setDate(d.getDate() + (i * 7));
      } else if (recurrenceType === 'biweekly') {
        d.setDate(d.getDate() + (i * 14));
      } else if (recurrenceType === 'monthly') {
        d.setMonth(d.getMonth() + i);
      } else if (recurrenceType === 'daily') {
        d.setDate(d.getDate() + i);
      }
      dates.push(d);
    }
    return dates;
  };

  const createAppointmentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDate || !newAppTime || !newAppService || !newAppClient || !newAppBarber) return;
      
      const datesToCreate = isRecurring ? getRecurrenceDates() : [
        (() => {
          const [hours, minutes] = newAppTime.split(':');
          const dateTime = new Date(selectedDate);
          dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          return dateTime;
        })()
      ];

      const promises = datesToCreate.map(dateTime => {
        let recurrenceNote = '';
        if (isRecurring) {
          const typeMap: Record<string, string> = {
            'daily': 'Diária',
            'weekly': 'Semanal',
            'biweekly': 'Quinzenal',
            'monthly': 'Mensal',
            'custom': 'Datas Selecionadas'
          };
          recurrenceNote = ` (Recorrente ${typeMap[recurrenceType] || ''})`;
        }

        return api.post('/appointments/', {
          client: newAppClient.id,
          service: newAppService.id,
          barber: newAppBarber.id,
          date_time: dateTime.toISOString(),
          notes: (newAppNotes ? newAppNotes + recurrenceNote : recurrenceNote.trim()),
          status: 'confirmed',
          total_price: newAppService.price
        });
      });

      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setShowNewAppointmentModal(false);
      resetNewAppForm();
      toast.success(isRecurring ? 'Agendamentos recorrentes criados com sucesso!' : 'Agendamento criado com sucesso!');
    },
    onError: () => toast.error('Erro ao criar agendamento(s). Verifique a disponibilidade.'),
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: typeof quickClient) => {
      return api.post('/users/register_client/', {
        ...data,
        birth_date: dateToBackend(data.birth_date)
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setNewAppClient(res.data);
      setShowQuickCreateClient(false);
      setQuickClient({ name: '', phone: '', birth_date: '' });
      toast.success('Cliente cadastrado e selecionado!');
    },
    onError: () => toast.error('Erro ao cadastrar cliente.'),
  });

  const resetNewAppForm = () => {
    setNewAppClient(null);
    setClientSearch('');
    setNewAppService(null);
    setNewAppBarber(null);
    setNewAppTime('');
    setNewAppNotes('');
    setIsRecurring(false);
    setRecurrenceType('weekly');
    setRecurrenceCount(4);
    setCustomDates([]);
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return api.patch(`/appointments/${id}/`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Status atualizado com sucesso!');
    },
    onError: () => toast.error('Erro ao atualizar status.'),
  });

  const completeWithPaymentsMutation = useMutation({
    mutationFn: async ({ id, payments }: { id: number; payments: { method: string; amount: string }[] }) => {
      return api.post(`/appointments/${id}/complete_with_payments/`, { payments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setShowCompleteModal(false);
      setActiveAppointment(null);
      setPayments([]);
      toast.success('Atendimento concluído com sucesso!');
    },
    onError: () => toast.error('Erro ao concluir atendimento.'),
  });

  const handleOpenComplete = (app: Appointment) => {
    setActiveAppointment(app);
    setPayments([{ method: 'pix', amount: app.total_price }]);
    setShowCompleteModal(true);
  };

  const addPaymentRow = () => {
    setPayments([...payments, { method: 'cash', amount: '0' }]);
  };

  const removePaymentRow = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const updatePayment = (index: number, field: string, value: string) => {
    const newPayments = [...payments];
    newPayments[index] = { ...newPayments[index], [field]: value };
    setPayments(newPayments);
  };

  const totalPaid = payments.reduce((acc, curr) => acc + parseFloat(curr.amount || '0'), 0);
  const isTotalValid = activeAppointment && Math.abs(totalPaid - parseFloat(activeAppointment.total_price)) < 0.01;

  const filteredAppointments = appointments?.filter(app => {
    if (statusFilter === 'all') return true;
    return app.status === statusFilter;
  }).sort((a, b) => a.date_time.localeCompare(b.date_time));

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Calendar Side */}
      <div className="w-full lg:w-auto space-y-6">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Selecionar Data</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border border-border/50"
              locale={ptBR}
            />
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Resumo do Dia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-bold">{appointments?.length || 0} agendamentos</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Confirmados:</span>
              <span className="font-bold text-blue-500">{appointments?.filter(a => a.status === 'confirmed').length || 0}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Concluídos:</span>
              <span className="font-bold text-green-500">{appointments?.filter(a => a.status === 'completed').length || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Appointments List */}
      <div className="flex-1 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Agenda: {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </h2>
            <p className="text-sm text-muted-foreground">Gerencie os horários e atendimentos.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:flex-none min-w-[140px]">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px] pl-9 bg-background border-border/50">
                  <SelectValue placeholder="Filtrar Status" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="confirmed">Confirmados</SelectItem>
                  <SelectItem value="completed">Concluídos</SelectItem>
                  <SelectItem value="cancelled">Cancelados</SelectItem>
                  <SelectItem value="no_show">Faltas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())} className="h-10 sm:h-9">Hoje</Button>
            <Button 
              size="sm" 
              className="gap-2 h-10 sm:h-9 flex-1 sm:flex-none" 
              onClick={() => {
                resetNewAppForm();
                setShowNewAppointmentModal(true);
              }}
            >
              <Plus className="w-4 h-4" /> <span className="whitespace-nowrap">Novo Agendamento</span>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground italic">Carregando agendamentos...</div>
        ) : filteredAppointments?.length === 0 ? (
          <div className="text-center py-20 bg-card/30 rounded-2xl border-2 border-dashed border-border/50">
            <p className="text-muted-foreground text-lg">Nenhum agendamento {statusFilter !== 'all' ? `"${statusMap[statusFilter]?.label}"` : ''} para esta data.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredAppointments?.map((appointment) => (
              <Card key={appointment.id} className="border-border/50 bg-card/50 hover:bg-card transition-colors">
                <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-xl flex flex-col items-center justify-center border border-primary/20 shrink-0">
                      <span className="text-lg font-black text-primary leading-none">
                        {format(new Date(appointment.date_time), 'HH:mm')}
                      </span>
                      <Clock className="w-3 h-3 text-primary/60 mt-1" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-lg">{appointment.client_name}</h4>
                        <Badge className={statusMap[appointment.status]?.color + " border-none"}>
                          {statusMap[appointment.status]?.label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Scissors className="w-3.5 h-3.5" /> {appointment.service_name}</span>
                        <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> Prof: {appointment.barber_name}</span>
                        <span className="font-medium text-foreground">{formatCurrency(appointment.total_price)}</span>
                      </div>
                      {appointment.notes && (
                        <div className="mt-2 p-2 bg-yellow-500/5 rounded border border-yellow-500/20 text-xs text-muted-foreground">
                          <strong className="text-yellow-600/80">Observação:</strong> {appointment.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {appointment.status === 'pending' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({ id: appointment.id, status: 'confirmed' })}
                      >
                        Confirmar
                      </Button>
                    )}
                    {appointment.status === 'confirmed' && (
                      <Button 
                        size="sm" 
                        variant="default" 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleOpenComplete(appointment)}
                      >
                        Concluir
                      </Button>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical className="w-5 h-5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border-border">
                        <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: appointment.id, status: 'cancelled' })} className="text-destructive">
                          <XCircle className="w-4 h-4 mr-2" /> Cancelar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: appointment.id, status: 'no_show' })}>
                          <User className="w-4 h-4 mr-2" /> Não Compareceu
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Split Payment Modal */}
      <Dialog open={showCompleteModal} onOpenChange={setShowCompleteModal}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Concluir Atendimento</DialogTitle>
            <DialogDescription>
              Registre as formas de pagamento para o serviço de <strong>{activeAppointment?.service_name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Valor Total:</span>
              <span className="font-bold text-lg">{activeAppointment && formatCurrency(activeAppointment.total_price)}</span>
            </div>

            <div className="space-y-3">
              {payments.map((payment, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <div className="flex-1">
                    <Select 
                      value={payment.method} 
                      onValueChange={(val) => updatePayment(index, 'method', val)}
                    >
                      <SelectTrigger className="bg-background border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="cash">Dinheiro</SelectItem>
                        <SelectItem value="credit">Cartão de Crédito</SelectItem>
                        <SelectItem value="debit">Cartão de Débito</SelectItem>
                        {customMethods?.filter(m => m.is_active).map(m => (
                          <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-32 relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                    <Input 
                      type="number" 
                      className="pl-7 bg-background border-border/50" 
                      value={payment.amount}
                      onChange={(e) => updatePayment(index, 'amount', e.target.value)}
                    />
                  </div>
                  {payments.length > 1 && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive h-10 w-10"
                      onClick={() => removePaymentRow(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button variant="outline" size="sm" className="w-full gap-2 border-dashed" onClick={addPaymentRow}>
              <Plus className="w-4 h-4" /> Adicionar forma de pagamento
            </Button>

            <div className={`p-4 rounded-lg flex justify-between items-center ${isTotalValid ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
              <span className="text-sm font-medium">Soma dos pagamentos:</span>
              <span className="font-bold">{formatCurrency(totalPaid)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteModal(false)}>Cancelar</Button>
            <Button 
              disabled={!isTotalValid || completeWithPaymentsMutation.isPending}
              onClick={() => activeAppointment && completeWithPaymentsMutation.mutate({ 
                id: activeAppointment.id, 
                payments 
              })}
            >
              {completeWithPaymentsMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Finalizar Atendimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* New Appointment Modal */}
      <Dialog open={showNewAppointmentModal} onOpenChange={setShowNewAppointmentModal}>
        <DialogContent className="bg-card border-border sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
            <DialogDescription>
              Agende um horário para um cliente na data: <strong>{format(selectedDate, "dd/MM/yyyy")}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Client Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Cliente</label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[10px] text-primary gap-1 font-bold"
                  onClick={() => setShowQuickCreateClient(true)}
                >
                  <Plus className="w-3 h-3" /> NOVO CLIENTE
                </Button>
              </div>
              
              <Popover open={isClientPopoverOpen} onOpenChange={setIsClientPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isClientPopoverOpen}
                    className="w-full justify-between bg-background border-border/50 font-normal"
                  >
                    {newAppClient
                      ? `${newAppClient.first_name || newAppClient.username} (${newAppClient.phone || 'Sem fone'})`
                      : "Selecionar cliente..."}
                    <MoreVertical className="ml-2 h-4 w-4 shrink-0 opacity-50 rotate-90" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="start" sideOffset={4} className="w-[var(--radix-popover-trigger-width)] p-0 bg-card border-border shadow-2xl">
                  <div className="flex items-center border-b border-border/50 px-3 py-2">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <input
                      className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Pesquisar cliente..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                    />
                  </div>
                  <div className="max-h-[300px] overflow-y-auto py-1">
                    {clients?.filter(c => 
                      (c.first_name || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
                      (c.username || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
                      (c.phone || '').includes(clientSearch)
                    ).length === 0 && (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        Nenhum cliente encontrado.
                      </div>
                    )}
                    {clients?.filter(c => 
                      (c.first_name || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
                      (c.username || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
                      (c.phone || '').includes(clientSearch)
                    ).map((client) => (
                      <div
                        key={client.id}
                        className={cn(
                          "relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                          newAppClient?.id === client.id && "bg-accent"
                        )}
                        onClick={() => {
                          setNewAppClient(client);
                          setIsClientPopoverOpen(false);
                          setClientSearch('');
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            newAppClient?.id === client.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{client.first_name || client.username}</span>
                          <span className="text-[10px] text-muted-foreground">{client.phone || 'Sem fone'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Service Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Serviço</label>
              <Select 
                value={newAppService?.id?.toString()} 
                onValueChange={(val) => setNewAppService(services?.find(s => s.id.toString() === val))}
              >
                <SelectTrigger className="bg-background border-border/50">
                  <SelectValue placeholder="Selecione o Serviço" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {services?.map(service => (
                    <SelectItem key={service.id} value={service.id.toString()}>
                      {service.name} - {formatCurrency(service.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Barber Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Profissional</label>
              <Select 
                value={newAppBarber?.id?.toString()} 
                onValueChange={(val) => setNewAppBarber(barbers?.find(b => b.id.toString() === val))}
              >
                <SelectTrigger className="bg-background border-border/50">
                  <SelectValue placeholder="Selecione o Barbeiro" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {barbers?.map(barber => (
                    <SelectItem key={barber.id} value={barber.id.toString()}>
                      {barber.first_name || barber.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time Selection */}
            {newAppBarber && newAppService && (
              <div className="space-y-3">
                <label className="text-sm font-medium">Horários Disponíveis</label>
                {isLoadingTimes ? (
                  <div className="text-center py-4 text-xs italic">Consultando agenda...</div>
                ) : availableTimes?.length === 0 ? (
                  <div className="text-center py-4 text-xs text-destructive bg-destructive/10 rounded-lg">
                    Nenhum horário disponível para este profissional nesta data.
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {availableTimes?.map((time: string) => (
                      <Button
                        key={time}
                        variant={newAppTime === time ? "default" : "outline"}
                        size="sm"
                        className="text-xs"
                        onClick={() => setNewAppTime(time)}
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Observações (Opcional)</label>
              <Textarea 
                placeholder="Ex: Cliente prefere tal estilo..."
                value={newAppNotes}
                onChange={(e) => setNewAppNotes(e.target.value)}
                className="bg-background border-border/50 min-h-[80px]"
              />
            </div>

            {/* Recurrence Section */}
            {newAppTime && (
              <div className="space-y-3 p-4 bg-primary/5 rounded-xl border border-primary/20 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-primary" />
                    <Label className="font-semibold text-primary text-base cursor-pointer" onClick={() => setIsRecurring(!isRecurring)}>Agendamento Recorrente?</Label>
                  </div>
                  <Switch 
                    checked={isRecurring} 
                    onCheckedChange={setIsRecurring} 
                  />
                </div>
                
                {isRecurring && (
                  <div className="pt-4 border-t border-primary/10 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Frequência</Label>
                      <Select value={recurrenceType} onValueChange={setRecurrenceType}>
                        <SelectTrigger className="h-9 text-sm bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Todos os dias</SelectItem>
                          <SelectItem value="weekly">Semanal (7 dias)</SelectItem>
                          <SelectItem value="biweekly">Quinzenal (15 dias)</SelectItem>
                          <SelectItem value="monthly">Mensal</SelectItem>
                          <SelectItem value="custom">Personalizado (Calendário)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {recurrenceType === 'custom' ? (
                      <div className="col-span-2 space-y-2 border-t border-primary/10 pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs font-semibold">Clique nas datas desejadas:</Label>
                          <Badge variant="outline" className="text-[10px] py-0 h-5 text-muted-foreground border-dashed">
                            Cinza = Indisponível
                          </Badge>
                        </div>
                        <div className="bg-background rounded-lg border border-border/50 p-2 flex justify-center">
                          <Calendar
                            mode="multiple"
                            selected={customDates}
                            onSelect={(dates) => setCustomDates(dates || [])}
                            disabled={(date) => {
                              const dStr = format(date, 'yyyy-MM-dd');
                              // Check if date is in the past
                              if (date < new Date(new Date().setHours(0,0,0,0))) return true;
                              return unavailableDates.includes(dStr);
                            }}
                            onDayClick={(day) => {
                              // Trigger availability check for the month or a range when user interacts
                              const start = new Date(day.getFullYear(), day.getMonth(), 1);
                              const end = new Date(day.getFullYear(), day.getMonth() + 1, 0);
                              const daysInMonth = [];
                              for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                                daysInMonth.push(new Date(d));
                              }
                              checkDatesAvailability(daysInMonth);
                            }}
                            className="p-0"
                            locale={ptBR}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Total de vezes</Label>
                        <Select value={recurrenceCount.toString()} onValueChange={(v) => setRecurrenceCount(parseInt(v))}>
                          <SelectTrigger className="h-9 text-sm bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[2, 3, 4, 5, 6, 8, 10, 12, 24].map(num => (
                              <SelectItem key={num} value={num.toString()}>{num} vezes</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <div className="col-span-2 mt-2 bg-background/50 p-3 rounded-lg border border-border/50">
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        {recurrenceType === 'custom' ? `Agendamentos para estas ${customDates.length} datas:` : 'Pré-visualização das datas:'}
                      </Label>
                      <div className="flex flex-wrap gap-1.5">
                        {getRecurrenceDates().map((date, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs font-medium bg-primary/10 text-primary border-none hover:bg-primary/20">
                            {format(date, "dd/MM")}
                          </Badge>
                        ))}
                        {recurrenceType === 'custom' && customDates.length === 0 && (
                          <span className="text-[10px] italic text-muted-foreground">Nenhuma data selecionada no calendário acima.</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewAppointmentModal(false)}>Cancelar</Button>
            <Button 
              disabled={!newAppClient || !newAppService || !newAppBarber || !newAppTime || createAppointmentMutation.isPending}
              onClick={() => createAppointmentMutation.mutate()}
            >
              {createAppointmentMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar Agendamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Create Client Modal */}
      <Dialog open={showQuickCreateClient} onOpenChange={setShowQuickCreateClient}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
            <DialogDescription>
              Preencha os dados básicos para o agendamento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome Completo</label>
              <Input 
                placeholder="Ex: João Silva" 
                value={quickClient.name}
                onChange={(e) => setQuickClient({ ...quickClient, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">WhatsApp</label>
              <Input 
                placeholder="(00) 00000-0000" 
                value={quickClient.phone}
                onChange={(e) => setQuickClient({ ...quickClient, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data de Nascimento (Opcional)</label>
              <Input 
                placeholder="DD/MM/AAAA"
                value={quickClient.birth_date}
                onChange={(e) => setQuickClient({ ...quickClient, birth_date: maskDate(e.target.value) })}
                inputMode="numeric"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuickCreateClient(false)}>Cancelar</Button>
            <Button 
              disabled={!quickClient.name || !quickClient.phone || createClientMutation.isPending}
              onClick={() => createClientMutation.mutate(quickClient)}
            >
              {createClientMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Cadastrar e Selecionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
