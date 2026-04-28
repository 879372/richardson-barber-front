import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Scissors, Calendar as CalendarIcon, Clock, User as UserIcon, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '@/lib/api';

// Types
type Service = { id: string; name: string; description: string; price: number; duration_minutes: number };
type Barber = { id: string; name: string; avatar_url: string | null };

const steps = [
  { id: 1, title: 'Serviço', icon: Scissors },
  { id: 2, title: 'Profissional', icon: UserIcon },
  { id: 3, title: 'Data e Hora', icon: Clock },
  { id: 4, title: 'Seus Dados', icon: CalendarIcon },
];

export default function BookingPortal() {
  const [step, setStep] = useState(1);
  
  // Booking State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  
  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
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
    queryKey: ['available-times', selectedBarber?.id, selectedDate],
    queryFn: async () => {
      if (!selectedBarber || !selectedDate) return [];
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await api.get<string[]>(`/users/${selectedBarber.id}/available_times/?date=${dateStr}`);
      return res.data;
    },
    enabled: !!selectedBarber && !!selectedDate,
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
        service_id: selectedService.id,
        barber_id: selectedBarber.id,
        date_time: dateTime.toISOString()
      });
    },
    onSuccess: () => {
      setIsSuccess(true);
    }
  });

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
    else bookMutation.mutate();
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-card p-8 rounded-2xl shadow-2xl border border-border/50 text-center space-y-6">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-3xl font-bold">Agendado!</h2>
          <p className="text-muted-foreground text-lg">
            Seu horário foi confirmado com sucesso. Te esperamos na barbearia!
          </p>
          <div className="bg-background rounded-lg p-4 border border-border/50 text-left space-y-2">
            <p><strong>Serviço:</strong> {selectedService?.name}</p>
            <p><strong>Profissional:</strong> {selectedBarber?.name}</p>
            <p><strong>Data:</strong> {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) : ''} às {selectedTime}</p>
          </div>
          <div className="space-y-3">
            <Button 
              className="w-full gap-2 bg-[#4285F4] hover:bg-[#4285F4]/90 border-none text-white"
              onClick={() => {
                const [hours, minutes] = selectedTime.split(':');
                const start = new Date(selectedDate!);
                start.setHours(parseInt(hours), parseInt(minutes));
                const end = new Date(start.getTime() + (selectedService?.duration_minutes || 30) * 60000);
                const fmt = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
                const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("Corte na Richardson Barber: " + (selectedService?.name || ""))}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent("Profissional: " + (selectedBarber?.name || ""))}&location=${encodeURIComponent("Richardson Barber Shop")}`;
                window.open(url, '_blank');
              }}
            >
              <Calendar className="w-4 h-4" /> Adicionar ao Google Calendar
            </Button>
            <Button variant="outline" className="w-full" size="lg" onClick={() => window.location.reload()}>
              Fazer novo agendamento
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
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-primary uppercase">
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
                <span className={`text-xs font-medium hidden md:block ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Form Content */}
        <Card className="border-border/50 shadow-2xl bg-card/50 backdrop-blur-xl">
          <CardContent className="p-4 sm:p-6 md:p-8">
            
            {/* Step 1: Services */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Escolha o Serviço</h2>
                {isLoadingServices ? (
                  <div className="text-center py-10 text-muted-foreground">Carregando serviços...</div>
                ) : (
                  <div className="grid gap-4">
                    {services?.map((svc) => (
                      <div 
                        key={svc.id}
                        onClick={() => setSelectedService(svc)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 flex justify-between items-center ${selectedService?.id === svc.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 hover:bg-accent/5'}`}
                      >
                        <div>
                          <h3 className="font-semibold text-lg">{svc.name}</h3>
                          <p className="text-sm text-muted-foreground">{svc.description}</p>
                          <span className="text-xs font-medium text-primary mt-1 inline-block">{svc.duration_minutes} min</span>
                        </div>
                        <div className="text-xl font-bold">
                          R$ {svc.price.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Barber */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                <h2 className="text-2xl font-bold mb-6">Escolha o Profissional</h2>
                {isLoadingBarbers ? (
                  <div className="text-center py-10 text-muted-foreground">Carregando profissionais...</div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {barbers?.map((barber) => (
                      <div 
                        key={barber.id}
                        onClick={() => setSelectedBarber(barber)}
                        className={`p-4 sm:p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 flex flex-col items-center text-center gap-2 sm:gap-3 ${selectedBarber?.id === barber.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 hover:bg-accent/5'}`}
                      >
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted flex items-center justify-center">
                          <UserIcon className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold">{barber.first_name || barber.name}</h3>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Date and Time */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <h2 className="text-2xl font-bold mb-6">Data e Hora</h2>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Selecione uma data</label>
                  <div className="flex justify-center border border-border bg-background rounded-xl p-2">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                      className="rounded-md"
                    />
                  </div>
                </div>

                {selectedDate && (
                  <div className="space-y-2 animate-in fade-in duration-300">
                    <label className="text-sm font-medium text-muted-foreground">Horários Disponíveis</label>
                    {isLoadingTimes ? (
                      <div className="text-center py-6 italic text-sm">Consultando horários...</div>
                    ) : availableTimes?.length === 0 ? (
                      <div className="text-center py-6 text-sm text-muted-foreground bg-accent/5 rounded-lg border border-dashed border-border">
                        Nenhum horário disponível para esta data.
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
                        {availableTimes?.map((time) => (
                          <div
                            key={time}
                            onClick={() => setSelectedTime(time)}
                            className={`p-3 text-center rounded-lg border-2 cursor-pointer font-medium transition-colors ${selectedTime === time ? 'bg-primary border-primary text-primary-foreground' : 'border-border bg-background hover:border-primary/50'}`}
                          >
                            {time}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 4: User Info */}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <h2 className="text-2xl font-bold mb-6">Seus Dados</h2>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nome Completo</label>
                    <Input 
                      placeholder="Ex: João Silva" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-12 bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">WhatsApp</label>
                    <Input 
                      placeholder="(00) 00000-0000" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-12 bg-background"
                    />
                  </div>
                </div>

                <div className="bg-accent/10 border border-primary/20 rounded-xl p-4 mt-6">
                  <h4 className="font-semibold text-primary mb-2">Resumo</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>{selectedService?.name} - R$ {selectedService?.price.toFixed(2)}</li>
                    <li>Com {selectedBarber?.name}</li>
                    <li>Em {selectedDate ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : ''} às {selectedTime}</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-border">
              <Button 
                variant="outline" 
                onClick={() => setStep(step - 1)} 
                disabled={step === 1 || bookMutation.isPending}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar
              </Button>
              <Button 
                onClick={handleNext}
                disabled={
                  (step === 1 && !selectedService) ||
                  (step === 2 && !selectedBarber) ||
                  (step === 3 && (!selectedDate || !selectedTime)) ||
                  (step === 4 && (!name || !phone)) ||
                  bookMutation.isPending
                }
                className="gap-2 px-4 sm:px-8"
              >
                {bookMutation.isPending ? 'Aguarde...' : step === 4 ? 'Confirmar Agendamento' : 'Avançar'}
                {step < 4 && <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
