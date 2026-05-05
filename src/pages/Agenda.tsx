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
import { Clock, User, Scissors, XCircle, MoreVertical, Plus, Trash2, Loader2, DollarSign, Filter } from 'lucide-react';
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
import { toast } from 'sonner';

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

export default function Agenda() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<string>('confirmed');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);
  const [payments, setPayments] = useState<{ method: string; amount: string }[]>([]);
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Agenda: {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </h2>
            <p className="text-sm text-muted-foreground">Gerencie os horários e atendimentos.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] pl-9 bg-background border-border/50">
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
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>Hoje</Button>
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
    </div>
  );
}
