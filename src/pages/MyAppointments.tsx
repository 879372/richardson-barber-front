import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, publicApi } from '@/lib/api';
import { format, isAfter, isBefore } from 'date-fns';
import { 
  ChevronLeft, 
  Search, 
  XCircle, 
  Phone,
  History,
  CalendarDays,
  Loader2,
  User as UserIcon
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Appointment = {
  id: number;
  client_name: string;
  barber_name: string;
  barber_phone: string;
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

const maskPhone = (value: string) => {
  if (!value) return "";
  value = value.replace(/\D/g, "");
  value = value.replace(/^(\d{2})(\d)/g, "($1) $2");
  value = value.replace(/(\d)(\d{4})$/, "$1-$2");
  return value;
};

export default function MyAppointments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const phoneParam = searchParams.get('phone') || '';
  const [phoneInput, setPhoneInput] = useState(maskPhone(phoneParam));
  const [filter, setFilter] = useState<'active' | 'past'>('active');
  
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['my-appointments', phoneParam],
    queryFn: async () => {
      if (!phoneParam) return [];
      const res = await publicApi.get<Appointment[]>(`/appointments/public_list/?phone=${phoneParam}`);
      return res.data;
    },
    enabled: !!phoneParam
  });
  
  const queryClient = useQueryClient();
  
  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      return publicApi.post(`/appointments/${id}/public_cancel/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      toast.success('Agendamento cancelado com sucesso.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Erro ao cancelar agendamento.');
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phoneInput.replace(/\D/g, "");
    if (cleanPhone.length >= 10) {
      setSearchParams({ phone: cleanPhone });
    }
  };

  const filteredAppointments = appointments?.filter(app => {
    const appDate = new Date(app.date_time);
    const now = new Date();
    
    if (filter === 'active') {
      // Active: Upcoming confirmed appointments or today's confirmed appointments
      return (isAfter(appDate, now) || format(appDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')) && app.status === 'confirmed';
    } else {
      // Past: Completed, Cancelled or appointments before now
      return isBefore(appDate, now) || app.status === 'completed' || app.status === 'cancelled' || app.status === 'no_show';
    }
  }).sort((a, b) => {
    // Sort active by soonest first, past by most recent first
    return filter === 'active' 
      ? a.date_time.localeCompare(b.date_time)
      : b.date_time.localeCompare(a.date_time);
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center py-6 sm:py-10 px-4">
      {/* Header */}
      <div className="text-center mb-8 space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-primary uppercase">
          Richardson<span className="text-foreground">Barber</span>
        </h1>
        <p className="text-muted-foreground text-lg">Meus Agendamentos</p>
      </div>

      <div className="max-w-2xl w-full space-y-6">
        <Card className="border-border/50 shadow-2xl bg-card/50 backdrop-blur-xl">
          <CardContent className="p-4 sm:p-6 md:p-8 space-y-6">
            {/* Search Section */}
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Seu WhatsApp (00) 00000-0000"
                    className="pl-10 h-11"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(maskPhone(e.target.value))}
                  />
                </div>
                <Button type="submit" className="gap-2 h-11 px-6">
                  <Search className="w-4 h-4" /> Buscar
                </Button>
              </div>
            </form>

            <div className="border-t border-border/50 pt-6 space-y-6">
              {phoneParam && (
                <Tabs value={filter} onValueChange={(val) => setFilter(val as any)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1">
                    <TabsTrigger value="active" className="gap-2 data-[state=active]:bg-background">
                      <CalendarDays className="w-4 h-4" /> Ativos
                    </TabsTrigger>
                    <TabsTrigger value="past" className="gap-2 data-[state=active]:bg-background">
                      <History className="w-4 h-4" /> Passados
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              )}

              {!phoneParam ? (
                <div className="text-center py-10 text-muted-foreground italic">
                  Informe seu telefone para ver seus agendamentos.
                </div>
              ) : isLoading ? (
                <div className="text-center py-10 text-muted-foreground animate-pulse">
                  Carregando...
                </div>
              ) : filteredAppointments?.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground italic">
                  Nenhum agendamento {filter === 'active' ? 'ativo' : 'passado'} encontrado.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAppointments?.map((app) => (
                    <div key={app.id} className="p-4 rounded-xl border border-border/50 bg-background/50 hover:bg-background/80 transition-colors space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-lg font-bold text-primary">
                            {format(new Date(app.date_time), "dd/MM 'às' HH:mm")}
                          </div>
                          <h3 className="font-medium">{app.service_name}</h3>
                        </div>
                        <Badge className={statusMap[app.status]?.color + " border-none"}>
                          {statusMap[app.status]?.label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="font-bold text-foreground">R$ {app.total_price}</span>
                        <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" /> {app.barber_name}</span>
                      </div>
                      
                      {filter === 'active' && (app.status === 'confirmed' || app.status === 'pending') && (
                        <div className="pt-2 border-t border-border/30 mt-2 space-y-2">
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="w-full bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border-none gap-2 font-bold"
                            onClick={() => {
                              const msg = `Olá! Tenho um agendamento de ${app.service_name} no dia ${format(new Date(app.date_time), "dd/MM 'às' HH:mm")}.`;
                              const cleanPhone = app.barber_phone?.replace(/\D/g, '') || '';
                              const finalPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
                              window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                            }}
                          >
                            <Phone className="w-4 h-4" /> Falar com o Barbeiro
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="w-full text-destructive hover:bg-destructive/10 border-destructive/20 gap-2 font-bold">
                                <XCircle className="w-4 h-4" /> Cancelar Agendamento
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-card border-border">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancelar agendamento?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Você está prestes a cancelar seu agendamento para <strong>{app.service_name}</strong> em <strong>{format(new Date(app.date_time), "dd/MM 'às' HH:mm")}</strong>.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Voltar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => cancelMutation.mutate(app.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {cancelMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                  Confirmar Cancelamento
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-2">
              <Button variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={() => navigate('/agendar')}>
                <ChevronLeft className="w-4 h-4" /> Novo Agendamento
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
