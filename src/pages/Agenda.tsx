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
import { Clock, User, Scissors, XCircle, MoreVertical, Plus, Trash2, Loader2, DollarSign, Filter, RefreshCw, CalendarOff, ShoppingCart, Zap } from 'lucide-react';
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

type Product = {
  id: number;
  name: string;
  brand: string;
  stock_quantity: number;
  sale_price: string;
};

type Appointment = {
  id: number;
  client: number;
  client_name: string;
  barber_name: string;
  service_name: string;
  date_time: string;
  status: string;
  total_price: string;
  notes?: string;
};

type TimeBlock = {
  id: number;
  start_time: string;
  end_time: string;
  reason: string;
  barber: number;
  barber_name?: string;
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
  if (!dateStr || !dateStr.includes('/')) return dateStr || null;
  const [day, month, year] = dateStr.split('/');
  if (!day || !month || !year || year.length < 4) return dateStr || null;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const maskPhone = (v: string) => {
  v = v.replace(/\D/g, "");
  if (v.length > 11) v = v.slice(0, 11);
  v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
  v = v.replace(/(\d)(\d{4})$/, "$1-$2");
  return v;
};



export default function Agenda() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<string>('confirmed');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [showQuickCreateClient, setShowQuickCreateClient] = useState(false);
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);
  const [payments, setPayments] = useState<{ method: string; amount: string }[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<{ id: number; name: string; quantity: number; unit_price: string }[]>([]);
  const [productSearch, setProductSearch] = useState('');
  
  // New States for Flow
  const [showSaleQuestion, setShowSaleQuestion] = useState(false);
  const [showProductSaleModal, setShowProductSaleModal] = useState(false);
  const [salePayments, setSalePayments] = useState<{ method: string; amount: string }[]>([]);
  
  // Walk-In State
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInClient, setWalkInClient] = useState<any>(null);
  const [isWalkInClientPopoverOpen, setIsWalkInClientPopoverOpen] = useState(false);
  const [walkInService, setWalkInService] = useState<any>(null);
  const [walkInBarber, setWalkInBarber] = useState<any>(null);
  const [walkInPayments, setWalkInPayments] = useState<{ method: string; amount: string }[]>([{ method: 'pix', amount: '0' }]);
  
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

  // Time Block State
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockBarber, setBlockBarber] = useState<any>(null);
  const [blockReason, setBlockReason] = useState('');

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

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await api.get<Product[]>('/products/')).data
  });
  
  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => (await api.get<any[]>('/users/?role=client')).data,
    enabled: showNewAppointmentModal || showWalkInModal
  });

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async () => (await api.get<any[]>('/services/')).data,
    enabled: showNewAppointmentModal || showWalkInModal
  });

  const { data: barbers } = useQuery({
    queryKey: ['barbers'],
    queryFn: async () => (await api.get<any[]>('/users/?role=barber')).data,
    enabled: showNewAppointmentModal || showBlockModal || showWalkInModal
  });

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/users/me/')).data
  });

  const { data: timeBlocks, isLoading: isLoadingBlocks } = useQuery({
    queryKey: ['time-blocks', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const res = await api.get<TimeBlock[]>(`/time-blocks/?start_time__date=${format(selectedDate, 'yyyy-MM-dd')}`);
      return res.data;
    }
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

      const promises = datesToCreate.map((dateTime, index) => {
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
          total_price: newAppService.price,
          skip_notification: index > 0
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

  const createBlockMutation = useMutation({
    mutationFn: async (startTimeStr: string) => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const barberToBlock = me?.role === 'admin' ? blockBarber : me;
      
      if (!barberToBlock) return;

      // Default block duration: 30 minutes
      const start = new Date(`${dateStr}T${startTimeStr}:00`);
      const end = new Date(start.getTime() + 30 * 60000);

      return api.post('/time-blocks/', {
        barber: barberToBlock.id,
        start_time: `${dateStr}T${startTimeStr}:00`,
        end_time: `${dateStr}T${format(end, 'HH:mm')}:00`,
        reason: blockReason || 'Bloqueio de Agenda'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-blocks'] });
      queryClient.invalidateQueries({ queryKey: ['available-times'] });
      toast.success('Horário bloqueado com sucesso!');
    },
    onError: () => toast.error('Erro ao bloquear horário.')
  });

  const deleteBlockMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/time-blocks/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-blocks'] });
      toast.success('Bloqueio removido com sucesso!');
    },
    onError: () => toast.error('Erro ao remover bloqueio.')
  });

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

  const cancelRecurringMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.post(`/appointments/${id}/cancel_recurring/`);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success(res.data.status || 'Agendamentos recorrentes cancelados!');
    },
    onError: () => toast.error('Erro ao cancelar agendamentos recorrentes.'),
  });

  const completeWithPaymentsMutation = useMutation({
    mutationFn: async ({ id, payments }: { id: number; payments: { method: string; amount: string }[] }) => {
      return api.post(`/appointments/${id}/complete_with_payments/`, { payments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setShowCompleteModal(false);
      // Don't clear activeAppointment yet, we might need it for the sale question
      setPayments([]);
      toast.success('Atendimento concluído com sucesso!');
      setShowSaleQuestion(true);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Erro ao concluir atendimento.'),
  });

  const createSaleMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/sales/', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowProductSaleModal(false);
      setActiveAppointment(null);
      setSelectedProducts([]);
      setSalePayments([]);
      toast.success('Venda registrada com sucesso!');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Erro ao registrar venda.')
  });

  const createWalkInMutation = useMutation({
    mutationFn: async () => {
      if (!walkInClient || !walkInService || !walkInBarber) throw new Error("Preencha todos os campos.");
      return api.post('/appointments/walk_in/', {
        service_id: walkInService.id,
        barber_id: walkInBarber.id,
        client_id: walkInClient.id,
        client_name: walkInClient.first_name,
        payments: walkInPayments
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setShowWalkInModal(false);
      setWalkInClient(null);
      setWalkInService(null);
      setWalkInBarber(null);
      setWalkInPayments([{ method: 'pix', amount: '0' }]);
      toast.success('Atendimento avulso registrado com sucesso!');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Erro ao registrar atendimento avulso.')
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

  const totalProducts = selectedProducts.reduce((acc, curr) => acc + (parseFloat(curr.unit_price) * curr.quantity), 0);
  const totalSalePaid = salePayments.reduce((acc, curr) => acc + parseFloat(curr.amount || '0'), 0);
  const isSaleTotalValid = selectedProducts.length > 0 && Math.abs(totalSalePaid - totalProducts) < 0.01;

  const totalPaid = payments.reduce((acc, curr) => acc + parseFloat(curr.amount || '0'), 0);
  const isTotalValid = activeAppointment && Math.abs(totalPaid - parseFloat(activeAppointment.total_price)) < 0.01;

  const totalWalkInPaid = walkInPayments.reduce((acc, curr) => acc + parseFloat(curr.amount || '0'), 0);
  const isWalkInValid = walkInClient && walkInService && walkInBarber && Math.abs(totalWalkInPaid - parseFloat(walkInService.price || '0')) < 0.01;

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
            <div className="relative w-full sm:w-auto">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[160px] pl-9 bg-background border-border/50">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="confirmed">Confirmados</SelectItem>
                  <SelectItem value="completed">Concluídos</SelectItem>
                  <SelectItem value="cancelled">Cancelados</SelectItem>
                  <SelectItem value="no_show">Faltas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())} className="h-10 sm:h-9 flex-1 sm:flex-none">Hoje</Button>
              <Button 
                variant="outline"
                size="sm"
                className="gap-2 h-10 sm:h-9 flex-1 sm:flex-none"
                onClick={() => {
                  if (me?.role !== 'admin') {
                    setBlockBarber(me);
                  }
                  setShowBlockModal(true);
                }}
              >
                <CalendarOff className="w-4 h-4" /> Bloquear
              </Button>
            </div>

            <Button 
              size="sm" 
              className="gap-2 h-10 sm:h-9 w-full sm:w-auto bg-[#4CAF50] hover:bg-[#388E3C] text-white font-bold" 
              onClick={() => {
                setWalkInClient(null);
                setWalkInService(null);
                setWalkInBarber(me?.role === 'barber' ? me : null);
                setWalkInPayments([{ method: 'pix', amount: '0' }]);
                setShowWalkInModal(true);
              }}
            >
              <Zap className="w-4 h-4" /> <span className="whitespace-nowrap">Encaixe / Avulso</span>
            </Button>

            <Button 
              size="sm" 
              className="gap-2 h-10 sm:h-9 w-full sm:w-auto bg-[#d4a017] hover:bg-[#b8860b] text-white font-bold" 
              onClick={() => {
                resetNewAppForm();
                setShowNewAppointmentModal(true);
              }}
            >
              <Plus className="w-4 h-4" /> <span className="whitespace-nowrap">Novo Agendamento</span>
            </Button>
          </div>
        </div>

        {isLoading || isLoadingBlocks ? (
          <div className="text-center py-20 text-muted-foreground italic">Carregando agendamentos...</div>
        ) : (filteredAppointments?.length === 0 && timeBlocks?.length === 0) ? (
          <div className="text-center py-20 bg-card/30 rounded-2xl border-2 border-dashed border-border/50">
            <p className="text-muted-foreground text-lg">Nenhum agendamento {statusFilter !== 'all' ? `"${statusMap[statusFilter]?.label}"` : ''} para esta data.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {[
              ...(filteredAppointments?.map(a => ({ ...a, type: 'appointment' as const })) || []),
              ...(timeBlocks?.map(b => ({ ...b, type: 'block' as const })) || [])
            ].sort((a: any, b: any) => {
              const timeA = a.type === 'appointment' ? a.date_time : a.start_time;
              const timeB = b.type === 'appointment' ? b.date_time : b.start_time;
              return timeA.localeCompare(timeB);
            }).map((item: any) => (
              item.type === 'appointment' ? (
              <Card key={`app-${item.id}`} className="border-border/50 bg-card/50 hover:bg-card transition-colors">
                <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-xl flex flex-col items-center justify-center border border-primary/20 shrink-0">
                      <span className="text-lg font-black text-primary leading-none">
                        {format(new Date(item.date_time), 'HH:mm')}
                      </span>
                      <Clock className="w-3 h-3 text-primary/60 mt-1" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-lg">{item.client_name}</h4>
                        <Badge className={statusMap[item.status]?.color + " border-none"}>
                          {statusMap[item.status]?.label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Scissors className="w-3.5 h-3.5" /> {item.service_name}</span>
                        <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> Prof: {item.barber_name}</span>
                        <span className="font-medium text-foreground">{formatCurrency(item.total_price)}</span>
                      </div>
                      {item.notes && (
                        <div className="mt-2 p-2 bg-yellow-500/5 rounded border border-yellow-500/20 text-xs text-muted-foreground">
                          <strong className="text-yellow-600/80">Observação:</strong> {item.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {item.status === 'pending' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({ id: item.id, status: 'confirmed' })}
                      >
                        Confirmar
                      </Button>
                    )}
                    {item.status === 'confirmed' && (
                      <Button 
                        size="sm" 
                        variant="default" 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleOpenComplete(item)}
                      >
                        Concluir
                      </Button>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical className="w-5 h-5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border-border">
                        <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: item.id, status: 'cancelled' })} className="text-destructive">
                          <XCircle className="w-4 h-4 mr-2" /> Cancelar
                        </DropdownMenuItem>
                        {item.notes?.includes('Recorrente') && (
                          <DropdownMenuItem onClick={() => cancelRecurringMutation.mutate(item.id)} className="text-destructive font-bold">
                            <XCircle className="w-4 h-4 mr-2" /> Cancelar Todos (Recorrentes)
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: item.id, status: 'no_show' })}>
                          <User className="w-4 h-4 mr-2" /> Não Compareceu
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
              ) : (
                <Card key={`block-${item.id}`} className="border-border/50 bg-destructive/5 hover:bg-destructive/10 transition-colors border-dashed">
                  <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-destructive/10 rounded-xl flex flex-col items-center justify-center border border-destructive/20 shrink-0">
                        <span className="text-lg font-black text-destructive leading-none">
                          {format(new Date(item.start_time), 'HH:mm')}
                        </span>
                        <CalendarOff className="w-3 h-3 text-destructive/60 mt-1" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-lg text-destructive">Horário Bloqueado</h4>
                          <Badge variant="outline" className="text-destructive border-destructive/30">
                            Bloqueio
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> Prof: {item.barber_name || 'Profissional'}</span>
                          <span className="font-medium text-destructive/80 italic">{item.reason}</span>
                          <span className="font-medium text-foreground">Até {format(new Date(item.end_time), 'HH:mm')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          if(confirm('Deseja realmente remover este bloqueio?')) {
                            deleteBlockMutation.mutate(item.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Remover Bloqueio
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            ))}
          </div>
        )}
      </div>

      {/* Split Payment Modal */}
      {/* Service Completion Modal */}
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
              <span className="text-muted-foreground">Valor do Serviço:</span>
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
                      <SelectTrigger className="bg-background border-border/50 h-11">
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
                      className="pl-7 bg-background border-border/50 h-11" 
                      value={payment.amount}
                      onChange={(e) => updatePayment(index, 'amount', e.target.value)}
                    />
                  </div>
                  {payments.length > 1 && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive h-11 w-11"
                      onClick={() => removePaymentRow(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button variant="outline" size="sm" className="w-full gap-2 border-dashed h-11" onClick={addPaymentRow}>
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
              className="px-6 font-bold"
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

      {/* Sale Question Modal */}
      <Dialog open={showSaleQuestion} onOpenChange={setShowSaleQuestion}>
        <DialogContent className="bg-card border-border sm:max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Atendimento Finalizado!</DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              O cliente <strong>{activeAppointment?.client_name}</strong> comprou algum produto?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-4 pt-4">
            <Button 
              variant="outline" 
              className="flex-1 h-12 text-lg font-medium" 
              onClick={() => {
                setShowSaleQuestion(false);
                setActiveAppointment(null);
              }}
            >
              Não
            </Button>
            <Button 
              className="flex-1 h-12 text-lg font-bold shadow-lg shadow-primary/20" 
              onClick={() => {
                setShowSaleQuestion(false);
                setSalePayments([{ method: 'pix', amount: '0' }]);
                setSelectedProducts([]);
                setShowProductSaleModal(true);
              }}
            >
              Sim
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Standalone Product Sale Modal */}
      <Dialog open={showProductSaleModal} onOpenChange={setShowProductSaleModal}>
        <DialogContent className="bg-card border-border sm:max-w-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Venda de Produtos</DialogTitle>
            <DialogDescription>
              Registre os produtos vendidos para <strong>{activeAppointment?.client_name || 'Cliente'}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-8 py-4">
            {/* Products Side */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm flex items-center gap-2 text-primary uppercase tracking-wider">
                <ShoppingCart className="w-4 h-4" /> Itens da Venda
              </h3>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Pesquisar produto..." 
                  className="pl-9 bg-background border-border/50 h-10"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
                
                {productSearch && (
                  <Card className="absolute top-full left-0 right-0 z-50 mt-1 border-border shadow-2xl bg-card max-h-[200px] overflow-y-auto ring-1 ring-primary/20">
                    <div className="p-1">
                      {products?.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map(product => (
                        <button
                          key={product.id}
                          className="w-full text-left p-3 hover:bg-primary/10 rounded-md transition-colors flex justify-between items-center text-sm border-b border-border/30 last:border-0"
                          onClick={() => {
                            const existing = selectedProducts.find(p => p.id === product.id);
                            if (existing) {
                              setSelectedProducts(selectedProducts.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p));
                            } else {
                              setSelectedProducts([...selectedProducts, { id: product.id, name: product.name, quantity: 1, unit_price: product.sale_price }]);
                            }
                            setProductSearch('');
                            // Auto-update payment if only one
                            if (salePayments.length === 1) {
                              const newTotal = totalProducts + parseFloat(product.sale_price);
                              setSalePayments([{ ...salePayments[0], amount: newTotal.toFixed(2) }]);
                            }
                          }}
                        >
                          <div>
                            <div className="font-bold">{product.name}</div>
                            <div className="text-[10px] text-muted-foreground">{product.stock_quantity} em estoque</div>
                          </div>
                          <span className="text-primary font-black">{formatCurrency(product.sale_price)}</span>
                        </button>
                      ))}
                    </div>
                  </Card>
                )}
              </div>

              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {selectedProducts.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10 text-sm">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="font-bold truncate">{p.name}</div>
                      <div className="text-[10px] text-primary font-bold uppercase">{formatCurrency(p.unit_price)} / un</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-border/50 rounded-lg bg-background overflow-hidden h-9 shadow-sm">
                        <button 
                          className="px-3 hover:bg-primary/10 text-muted-foreground transition-colors"
                          onClick={() => {
                            const newQty = p.quantity - 1;
                            if (newQty > 0) {
                              setSelectedProducts(selectedProducts.map((prod, i) => i === idx ? { ...prod, quantity: newQty } : prod));
                            } else {
                              setSelectedProducts(selectedProducts.filter((_, i) => i !== idx));
                            }
                          }}
                        >
                          -
                        </button>
                        <span className="px-2 font-black min-w-[24px] text-center">{p.quantity}</span>
                        <button 
                          className="px-3 hover:bg-primary/10 text-muted-foreground transition-colors"
                          onClick={() => setSelectedProducts(selectedProducts.map((prod, i) => i === idx ? { ...prod, quantity: prod.quantity + 1 } : prod))}
                        >
                          +
                        </button>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 text-destructive hover:bg-destructive/10"
                        onClick={() => setSelectedProducts(selectedProducts.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {selectedProducts.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground text-xs italic border-2 border-dashed rounded-2xl flex flex-col items-center gap-2 opacity-60">
                    <ShoppingCart className="w-8 h-8 mb-1" />
                    Nenhum produto selecionado
                  </div>
                )}
              </div>
            </div>

            {/* Sale Payments Side */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm flex items-center gap-2 text-green-500 uppercase tracking-wider">
                <DollarSign className="w-4 h-4" /> Pagamento da Venda
              </h3>

              <div className="space-y-2 p-5 rounded-2xl bg-muted/40 border border-border/50 shadow-inner">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs font-bold uppercase tracking-tighter">Total Produtos:</span>
                  <span className="font-black text-2xl text-primary">{formatCurrency(totalProducts)}</span>
                </div>
              </div>

              <div className="space-y-3">
                {salePayments.map((payment, index) => (
                  <div key={index} className="flex gap-2 items-center group">
                    <div className="flex-1">
                      <Select 
                        value={payment.method} 
                        onValueChange={(val) => {
                          const newP = [...salePayments];
                          newP[index].method = val;
                          setSalePayments(newP);
                        }}
                      >
                        <SelectTrigger className="bg-background border-border/50 h-11 rounded-xl group-hover:border-primary/30 transition-colors">
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
                        className="pl-8 bg-background border-border/50 h-11 rounded-xl font-bold" 
                        value={payment.amount}
                        onChange={(e) => {
                          const newP = [...salePayments];
                          newP[index].amount = e.target.value;
                          setSalePayments(newP);
                        }}
                      />
                    </div>
                    {salePayments.length > 1 && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive h-11 w-11 shrink-0 hover:bg-destructive/10"
                        onClick={() => setSalePayments(salePayments.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full h-11 gap-2 border-dashed text-xs font-bold bg-background/50" 
                  onClick={() => {
                    const remaining = totalProducts - totalSalePaid;
                    setSalePayments([...salePayments, { method: 'cash', amount: remaining > 0 ? remaining.toFixed(2) : '0' }]);
                  }}
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Outra Forma
                </Button>
              </div>

              <div className={`p-4 rounded-xl flex justify-between items-center transition-colors ${isSaleTotalValid ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-70">Total Recebido</span>
                  <span className="font-black text-xl leading-none">{formatCurrency(totalSalePaid)}</span>
                </div>
                {!isSaleTotalValid && totalProducts > 0 && (
                   <div className="text-[10px] font-bold text-right italic leading-tight">
                    Faltam {formatCurrency(totalProducts - totalSalePaid)}
                   </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border/50 pt-4 mt-2">
            <Button variant="ghost" onClick={() => {
              setShowProductSaleModal(false);
              setActiveAppointment(null);
            }}>
              Pular / Cancelar
            </Button>
            <Button 
              className="px-10 font-black h-12 shadow-xl shadow-primary/20"
              disabled={!isSaleTotalValid || createSaleMutation.isPending}
              onClick={() => createSaleMutation.mutate({ 
                appointment: activeAppointment?.id,
                client: activeAppointment?.client, // Assuming ID is in client field or nested
                products: selectedProducts,
                payments: salePayments
              })}
            >
              {createSaleMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Registrar Venda
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
                <PopoverContent side="bottom" align="start" sideOffset={4} avoidCollisions={false} className="w-[var(--radix-popover-trigger-width)] p-0 bg-card border-border shadow-2xl">
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
                            {[2, 3, 4, 5, 6, 8, 10, 12, 24, 36, 48, 52, 100].map(num => (
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

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input 
                placeholder="Ex: João Silva" 
                className="bg-background border-border/50 h-11"
                value={quickClient.name}
                onChange={(e) => setQuickClient({ ...quickClient, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input 
                placeholder="(00) 00000-0000" 
                className="bg-background border-border/50 h-11"
                value={quickClient.phone}
                onChange={(e) => setQuickClient({ ...quickClient, phone: maskPhone(e.target.value) })}
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

      {/* Time Block Modal */}
      <Dialog open={showBlockModal} onOpenChange={setShowBlockModal}>
        <DialogContent className="bg-card border-border sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bloquear Horários</DialogTitle>
            <DialogDescription>
              Selecione os horários que deseja bloquear em <strong>{format(selectedDate, "dd/MM/yyyy")}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {me?.role === 'admin' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Profissional</label>
                <Select 
                  value={blockBarber?.id?.toString()} 
                  onValueChange={(val) => {
                    const b = barbers?.find(b => b.id.toString() === val);
                    setBlockBarber(b);
                  }}
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
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo do Bloqueio</label>
              <Input 
                placeholder="Ex: Intervalo, Almoço, Compromisso..." 
                value={blockReason} 
                onChange={(e) => setBlockReason(e.target.value)} 
                className="bg-background border-border/50"
              />
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium block">Horários Disponíveis</label>
              {!blockBarber ? (
                <div className="text-center py-8 text-muted-foreground bg-muted/10 rounded-xl border-2 border-dashed">
                  Selecione um profissional para ver os horários.
                </div>
              ) : (
                <TimeSlotsGrid 
                  barberId={blockBarber.id} 
                  date={selectedDate} 
                  onSelectTime={(time) => createBlockMutation.mutate(time)}
                  isLoading={createBlockMutation.isPending}
                />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockModal(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Walk-In Modal */}
      <Dialog open={showWalkInModal} onOpenChange={setShowWalkInModal}>
        <DialogContent className="bg-card border-border sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registro de Atendimento Avulso</DialogTitle>
            <DialogDescription>
              Registre rapidamente um serviço já realizado (encaixe/cliente avulso).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Client Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Cliente *</label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[10px] text-primary gap-1 font-bold"
                  onClick={() => setShowQuickCreateClient(true)}
                >
                  <Plus className="w-3 h-3" /> NOVO CLIENTE
                </Button>
              </div>
              
              <Popover open={isWalkInClientPopoverOpen} onOpenChange={setIsWalkInClientPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isWalkInClientPopoverOpen}
                    className="w-full justify-between bg-background border-border/50 font-normal"
                  >
                    {walkInClient
                      ? `${walkInClient.first_name || walkInClient.username} (${walkInClient.phone || 'Sem fone'})`
                      : "Selecionar cliente..."}
                    <MoreVertical className="ml-2 h-4 w-4 shrink-0 opacity-50 rotate-90" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="start" sideOffset={4} avoidCollisions={false} className="w-[var(--radix-popover-trigger-width)] p-0 bg-card border-border shadow-2xl z-50">
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
                          walkInClient?.id === client.id && "bg-accent"
                        )}
                        onClick={() => {
                          setWalkInClient(client);
                          setIsWalkInClientPopoverOpen(false);
                          setClientSearch('');
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            walkInClient?.id === client.id ? "opacity-100" : "opacity-0"
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

            <div className="space-y-2">
              <Label>Serviço *</Label>
              <Select 
                value={walkInService?.id?.toString() || ''} 
                onValueChange={(val) => {
                  const s = services?.find(x => x.id.toString() === val);
                  if (s) {
                    setWalkInService(s);
                    setWalkInPayments([{ method: 'pix', amount: s.price }]);
                  }
                }}
              >
                <SelectTrigger className="bg-background border-border/50">
                  <SelectValue placeholder="Selecione o serviço" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {services?.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name} - {formatCurrency(s.price)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Profissional *</Label>
              <Select 
                value={walkInBarber?.id?.toString() || ''} 
                onValueChange={(val) => {
                  const b = barbers?.find(x => x.id.toString() === val);
                  if (b) setWalkInBarber(b);
                }}
              >
                <SelectTrigger className="bg-background border-border/50">
                  <SelectValue placeholder="Selecione o barbeiro" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {barbers?.map(b => (
                    <SelectItem key={b.id} value={b.id.toString()}>{b.first_name || b.username}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {walkInService && (
              <div className="space-y-4 pt-4 border-t border-border/50">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Valor do Serviço:</span>
                  <span className="font-bold text-lg">{formatCurrency(walkInService.price)}</span>
                </div>

                <div className="space-y-3">
                  {walkInPayments.map((payment, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <div className="flex-1">
                        <Select 
                          value={payment.method} 
                          onValueChange={(val) => {
                            const newP = [...walkInPayments];
                            newP[index] = { ...newP[index], method: val };
                            setWalkInPayments(newP);
                          }}
                        >
                          <SelectTrigger className="bg-background border-border/50 h-11">
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
                          className="pl-7 bg-background border-border/50 h-11" 
                          value={payment.amount}
                          onChange={(e) => {
                            const newP = [...walkInPayments];
                            newP[index] = { ...newP[index], amount: e.target.value };
                            setWalkInPayments(newP);
                          }}
                        />
                      </div>
                      {walkInPayments.length > 1 && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive h-11 w-11 shrink-0"
                          onClick={() => setWalkInPayments(walkInPayments.filter((_, i) => i !== index))}
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
                  className="w-full gap-2 border-dashed h-11" 
                  onClick={() => setWalkInPayments([...walkInPayments, { method: 'cash', amount: '0' }])}
                >
                  <Plus className="w-4 h-4" /> Adicionar forma de pagamento
                </Button>

                <div className={`p-4 rounded-lg flex justify-between items-center ${isWalkInValid ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                  <span className="text-sm font-medium">Soma dos pagamentos:</span>
                  <span className="font-bold">{formatCurrency(totalWalkInPaid)}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWalkInModal(false)}>Cancelar</Button>
            <Button 
              className="px-6 font-bold"
              disabled={!isWalkInValid || createWalkInMutation.isPending}
              onClick={() => createWalkInMutation.mutate()}
            >
              {createWalkInMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Registrar Atendimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper component to show the grid of available times for blocking
function TimeSlotsGrid({ barberId, date, onSelectTime, isLoading }: { barberId: number, date: Date, onSelectTime: (t: string) => void, isLoading: boolean }) {
  const { data: times, isLoading: loadingTimes } = useQuery({
    queryKey: ['available-times-block', barberId, format(date, 'yyyy-MM-dd')],
    queryFn: async () => {
      const dateStr = format(date, 'yyyy-MM-dd');
      // Using a generic service check or assuming 30min slots for blocking
      const res = await api.get<string[]>(`/users/${barberId}/available_times/?date=${dateStr}`);
      return res.data;
    },
  });

  if (loadingTimes) return <div className="text-center py-8 italic text-muted-foreground">Carregando horários...</div>;
  if (!times || times.length === 0) return <div className="text-center py-8 text-muted-foreground">Sem horários disponíveis para bloquear nesta data.</div>;

  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
      {times.map(time => (
        <Button
          key={time}
          variant="outline"
          size="sm"
          className="font-bold hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all"
          disabled={isLoading}
          onClick={() => onSelectTime(time)}
        >
          {time}
        </Button>
      ))}
    </div>
  );
}
