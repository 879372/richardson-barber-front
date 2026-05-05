import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Scissors, Clock, User as UserIcon, CheckCircle2, ChevronLeft, ChevronRight, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

// Types
type Service = { id: string; name: string; description: string; price: number; duration_minutes: number };
type Barber = { id: string; name: string; avatar_url: string | null; phone: string; first_name?: string };

const steps = [
  { id: 1, title: 'Identificação', icon: UserIcon },
  { id: 2, title: 'Serviço', icon: Scissors },
  { id: 3, title: 'Profissional', icon: UserIcon },
  { id: 4, title: 'Data e Hora', icon: Clock },
];

export default function BookingPortal() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Booking State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  
  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [isPhoneChecked, setIsPhoneChecked] = useState(false);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [phoneExists, setPhoneExists] = useState(false);
  const [hasNameOnServer, setHasNameOnServer] = useState(false);
  const [hasBirthDateOnServer, setHasBirthDateOnServer] = useState(false);

  const { data: userActiveAppointments } = useQuery({
    queryKey: ['user-active-appointments', phone.replace(/\D/g, '')],
    queryFn: async () => {
      const res = await api.get(`/appointments/public_list/?phone=${phone.replace(/\D/g, '')}`);
      // Filter only active/upcoming
      return res.data.filter((app: any) => {
        const appDate = new Date(app.date_time);
        const now = new Date();
        const isToday = format(appDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
        return (appDate > now || isToday) && app.status !== 'cancelled' && app.status !== 'no_show' && app.status !== 'completed';
      });
    },
    enabled: isPhoneChecked && phoneExists
  });
  
  const [notes, setNotes] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Queries
  const { data: services, isLoading: isLoadingServices } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await api.get<Service[]>('/services/');
      return res.data;
    }
  });

  const { data: barbers, isLoading: isLoadingBarbers } = useQuery({
    queryKey: ['barbers'],
    queryFn: async () => {
      const res = await api.get<Barber[]>('/users/?role=barber');
      return res.data;
    }
  });

  const { data: availableTimes, isLoading: isLoadingTimes } = useQuery({
    queryKey: ['available-times', selectedBarber?.id, selectedDate, selectedService?.id],
    queryFn: async () => {
      if (!selectedBarber || !selectedDate || !selectedService) return [];
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await api.get<string[]>(`/users/${selectedBarber.id}/available_times/?date=${dateStr}&service_id=${selectedService.id}`);
      return res.data;
    },
    enabled: !!selectedBarber && !!selectedDate && !!selectedService,
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDate || !selectedTime || !selectedService || !selectedBarber) return;
      
      const [hours, minutes] = selectedTime.split(':');
      const dateTime = new Date(selectedDate);
      dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      return api.post('/appointments/public_booking/', {
        name,
        phone,
        birth_date: birthDate,
        service_id: selectedService.id,
        barber_id: selectedBarber.id,
        date_time: dateTime.toISOString(),
        notes: notes
      });
    },
    onSuccess: () => {
      setIsSuccess(true);
      toast.success('Horário agendado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao realizar agendamento. Tente outro horário.');
    }
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      return api.post('/users/register_client/', {
        name,
        phone,
        birth_date: birthDate
      });
    }
  });

  const checkPhone = async () => {
    if (!phone) return;
    setIsCheckingPhone(true);
    try {
      const res = await api.get(`/users/check_phone/?phone=${phone}`);
      if (res.data.exists) {
        setName(res.data.user.first_name || '');
        setBirthDate(res.data.user.birth_date || '');
        setHasNameOnServer(!!res.data.user.first_name);
        setHasBirthDateOnServer(!!res.data.user.birth_date);
        setPhoneExists(true);
      } else {
        setHasNameOnServer(false);
        setHasBirthDateOnServer(false);
        setPhoneExists(false);
      }
      setIsPhoneChecked(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsCheckingPhone(false);
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!isPhoneChecked) {
        await checkPhone();
        return;
      }
      // Register or update client before proceeding to services
      registerMutation.mutate(undefined, {
        onSuccess: () => setStep(2),
        onError: () => toast.error('Erro ao salvar dados do cliente.')
      });
      return;
    }
    
    if (step < 4) setStep(step + 1);
    else setIsConfirmModalOpen(true);
  };

  const maskPhone = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
    v = v.replace(/(\d)(\d{4})$/, "$1-$2");
    return v;
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-card p-8 rounded-2xl shadow-2xl border border-border/50 text-center space-y-6">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold">Agendado!</h2>
          <p className="text-muted-foreground text-lg">
            Seu horário foi confirmado com sucesso. Te esperamos na barbearia!
          </p>
          <div className="bg-background rounded-lg p-4 border border-border/50 text-left space-y-2">
            <p><strong>Serviço:</strong> {selectedService?.name}</p>
            <p><strong>Profissional:</strong> {selectedBarber?.first_name || selectedBarber?.name}</p>
            <p><strong>Data:</strong> {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) : ''} às {selectedTime}</p>
          </div>
          <div className="space-y-3">
            <Button 
              className="w-full gap-2 bg-[#25D366] hover:bg-[#25D366]/90 border-none text-white"
              onClick={() => {
                const msg = `Olá! Acabei de agendar um(a) ${selectedService?.name} para o dia ${format(selectedDate!, "dd/MM")} às ${selectedTime}.`;
                window.open(`https://wa.me/55${selectedBarber?.phone || '31999999999'}?text=${encodeURIComponent(msg)}`, '_blank');
              }}
            >
              Falar com o Barbeiro (WhatsApp)
            </Button>
            <Button 
              variant="outline" 
              className="w-full gap-2"
              onClick={() => navigate(`/meus-agendamentos?phone=${phone.replace(/\D/g, '')}`)}
            >
              Ver Meus Agendamentos
            </Button>
            <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => window.location.reload()}>
              Voltar ao Início
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center py-6 sm:py-10 px-4">
      {/* Header */}
      <div className="text-center mb-10 space-y-2">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-primary">
          Richardson<span className="text-foreground">Barber</span>
        </h1>
        <p className="text-muted-foreground text-lg">Agende seu horário com os melhores</p>
      </div>

      <div className="max-w-2xl w-full">
        {/* Progress Bar */}
        <div className="flex justify-between mb-8 relative">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-muted -z-10 -translate-y-1/2 rounded-full"></div>
          <div 
            className="absolute top-1/2 left-0 h-1 bg-primary -z-10 -translate-y-1/2 rounded-full transition-all duration-300"
            style={{ width: `${((step - 1) / 3) * 100}%` }}
          ></div>
          
          {steps.map((s) => {
            const Icon = s.icon;
            const isActive = step >= s.id;
            return (
              <div key={s.id} className="flex flex-col items-center gap-2">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${isActive ? 'bg-primary border-primary text-primary-foreground' : 'bg-card border-border text-muted-foreground'}`}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className={`text-[10px] uppercase hidden md:block ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Form Content */}
        <Card className="border-border/50 shadow-2xl bg-card/50 backdrop-blur-xl">
          <CardContent className="p-4 sm:p-6 md:p-8">
            
            {/* Step 1: Identification */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Identificação</h2>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Seu WhatsApp</label>
                    <Input 
                      placeholder="(00) 00000-0000" 
                      value={phone}
                      onChange={(e) => {
                        setPhone(maskPhone(e.target.value));
                        setIsPhoneChecked(false);
                      }}
                      className="h-12 bg-background border-border/50 text-base"
                    />
                  </div>

                  {isPhoneChecked && phoneExists && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20">
                        <p className="text-sm">Olá, <span className="text-primary font-medium">{name || 'Cliente'}</span>! Bom ver você de novo. ✨</p>
                      </div>
                      
                      {userActiveAppointments && userActiveAppointments.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-xs text-muted-foreground ml-1">Seus próximos horários:</p>
                          {userActiveAppointments.map((app: any) => (
                            <div key={app.id} className="p-4 bg-card border border-border/50 rounded-2xl flex justify-between items-center group hover:border-primary/30 transition-all">
                              <div className="flex gap-4 items-center">
                                <div className="w-12 h-12 bg-primary/10 rounded-xl flex flex-col items-center justify-center border border-primary/10 group-hover:bg-primary/20 transition-colors">
                                  <span className="text-sm font-medium text-primary leading-none">{format(new Date(app.date_time), 'HH:mm')}</span>
                                  <Clock className="w-3 h-3 text-primary/60 mt-1" />
                                </div>
                                <div>
                                  <p className="text-sm">{app.service_name}</p>
                                  <p className="text-[10px] text-muted-foreground">{format(new Date(app.date_time), "dd 'de' MMMM", { locale: ptBR })}</p>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-[9px] h-5 bg-blue-500/10 text-blue-500 border-none uppercase px-2">
                                {app.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {isPhoneChecked && (!phoneExists || !hasNameOnServer || !hasBirthDateOnServer) && (
                    <div className="space-y-5 animate-in slide-in-from-top-2 duration-300 pt-2">
                      <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] uppercase">
                        {!phoneExists ? 'Novo Cadastro' : 'Complete seu Perfil'}
                      </div>
                      
                      {!hasNameOnServer && (
                        <div className="space-y-2">
                          <label className="text-sm text-muted-foreground">Nome Completo</label>
                          <Input 
                            placeholder="Ex: João Silva" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="h-12 bg-background border-border/50"
                          />
                        </div>
                      )}

                      {!hasBirthDateOnServer && (
                        <div className="space-y-2">
                          <label className="text-sm text-muted-foreground">Data de Nascimento</label>
                          <Input 
                            type="date"
                            value={birthDate}
                            onChange={(e) => setBirthDate(e.target.value)}
                            className="h-12 bg-background border-border/50"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Services */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Escolha o Serviço</h2>
                
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input 
                    placeholder="Buscar serviço..." 
                    className="pl-10 h-14 bg-background border-border/50 focus-visible:ring-primary text-base"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {isLoadingServices ? (
                  <div className="text-center py-10 text-muted-foreground italic">Carregando serviços...</div>
                ) : (
                  <div className="grid gap-4">
                    {services?.filter(svc => svc.name.toLowerCase().includes(searchQuery.toLowerCase()) || svc.description?.toLowerCase().includes(searchQuery.toLowerCase())).map((svc) => (
                      <div 
                        key={svc.id}
                        onClick={() => setSelectedService(svc)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col gap-1 relative overflow-hidden group ${selectedService?.id === svc.id ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/50 hover:bg-accent/5'}`}
                      >
                        {selectedService?.id === svc.id && <div className="absolute top-0 right-0 p-2"><CheckCircle2 className="w-4 h-4 text-primary" /></div>}
                        <h3 className="font-medium text-base sm:text-lg leading-tight">{svc.name}</h3>
                        {svc.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{svc.description}</p>
                        )}
                        <div className="flex justify-between items-end mt-2">
                          <span className="text-[10px] text-primary flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {svc.duration_minutes} min
                          </span>
                          <span className="font-semibold text-base text-foreground">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(svc.price))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Barber */}
            {step === 3 && (step === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                <h2 className="text-2xl font-semibold mb-6">Escolha o Profissional</h2>
                {isLoadingBarbers ? (
                  <div className="text-center py-10 text-muted-foreground italic">Carregando profissionais...</div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:gap-6">
                    {barbers?.map((barber) => (
                      <div 
                        key={barber.id}
                        onClick={() => setSelectedBarber(barber)}
                        className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col items-center text-center gap-4 relative ${selectedBarber?.id === barber.id ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/50 hover:bg-accent/5'}`}
                      >
                        {selectedBarber?.id === barber.id && <CheckCircle2 className="absolute top-3 right-3 w-4 h-4 text-primary" />}
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/10 shadow-inner group-hover:scale-105 transition-transform">
                          <UserIcon className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium text-base">{barber.first_name || barber.name}</h3>
                          <p className="text-[10px] text-muted-foreground">Barbeiro Especialista</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Step 4: Date and Time */}
            {step === 4 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <h2 className="text-2xl font-semibold mb-6">Data e Hora</h2>
                
                <div className="space-y-3">
                  <label className="text-xs text-muted-foreground ml-1">Selecione uma data</label>
                  <div className="flex justify-center border border-border/50 bg-background/50 rounded-2xl p-2 backdrop-blur-sm">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                      className="rounded-md"
                      locale={ptBR}
                    />
                  </div>
                </div>

                {selectedDate && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <label className="text-xs text-muted-foreground ml-1">Horários Disponíveis</label>
                    {isLoadingTimes ? (
                      <div className="text-center py-10 italic text-sm text-muted-foreground">Consultando agenda...</div>
                    ) : availableTimes?.length === 0 ? (
                      <div className="text-center py-10 text-sm text-muted-foreground bg-primary/5 rounded-2xl border-2 border-dashed border-primary/10">
                        Poxa! Nenhum horário disponível nesta data. 😕<br/>
                        <span className="text-[10px] font-medium">Tente outro dia ou outro profissional.</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {availableTimes?.map((time) => {
                          const [hours, minutes] = time.split(':').map(Number);
                          const endDateTime = new Date();
                          endDateTime.setHours(hours, minutes + (selectedService?.duration_minutes || 30), 0, 0);
                          const endTimeStr = format(endDateTime, 'HH:mm');
                          return (
                            <div
                              key={time}
                              onClick={() => setSelectedTime(time)}
                              className={`p-3 text-center rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center ${selectedTime === time ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20' : 'border-border/50 bg-background/50 hover:border-primary/50'}`}
                            >
                              <span className="font-semibold text-base sm:text-lg">{time}</span>
                              <span className="text-[9px] opacity-80 leading-none">até {endTimeStr}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-10 pt-6 border-t border-border/50">
              <Button 
                variant="ghost" 
                onClick={() => setStep(step - 1)} 
                disabled={step === 1 || bookMutation.isPending}
                className="gap-2 h-12 px-6 text-muted-foreground"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar
              </Button>
              <Button 
                onClick={handleNext}
                disabled={
                  (step === 1 && (!phone || (isPhoneChecked && !phoneExists && !name))) ||
                  (step === 2 && !selectedService) ||
                  (step === 3 && !selectedBarber) ||
                  (step === 4 && (!selectedDate || !selectedTime)) ||
                  bookMutation.isPending || isCheckingPhone
                }
                className="gap-2 h-12 px-8 shadow-lg shadow-primary/20"
              >
                {isCheckingPhone ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {bookMutation.isPending ? 'Agendando...' : step === 4 ? 'Finalizar Agendamento' : 'Continuar'}
                {step < 4 && !isCheckingPhone && <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>

          </CardContent>
        </Card>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Resumo do Agendamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">Cliente:</span>
                <span className="font-medium">{name}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">Serviço:</span>
                <span className="font-medium text-primary">{selectedService?.name}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">Barbeiro:</span>
                <span className="font-medium">{selectedBarber?.first_name || selectedBarber?.name}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">Horário:</span>
                <span className="font-bold">
                  {selectedDate ? format(selectedDate, "dd/MM/yyyy") : ''} às <span className="text-primary">{selectedTime}</span>
                </span>
              </div>
              <div className="pt-3 border-t border-primary/10 flex justify-between items-baseline font-semibold">
                <span className="text-xs uppercase tracking-widest">Total:</span>
                <span className="text-2xl text-primary">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(selectedService?.price || 0))}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground ml-1">Algum recado? (Opcional)</label>
              <Textarea 
                placeholder="Ex: Gostaria de um café gelado..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-background border-border/50 min-h-[100px] rounded-xl focus:border-primary"
              />
            </div>
          </div>
          <DialogFooter className="gap-3 sm:gap-2">
            <Button variant="ghost" onClick={() => setIsConfirmModalOpen(false)}>
              Alterar dados
            </Button>
            <Button 
              className="h-12 px-8 shadow-lg shadow-primary/20"
              onClick={() => {
                setIsConfirmModalOpen(false);
                bookMutation.mutate();
              }}
              disabled={bookMutation.isPending}
            >
              {bookMutation.isPending ? 'Confirmando...' : 'Confirmar Agendamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
