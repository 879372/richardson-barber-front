import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Scissors, Calendar, Clock, User as UserIcon, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

// Types
type Service = { id: string; name: string; description: string; price: number; duration_minutes: number };
type Barber = { id: string; name: string; avatar_url: string | null };

const steps = [
  { id: 1, title: 'Serviço', icon: Scissors },
  { id: 2, title: 'Profissional', icon: UserIcon },
  { id: 3, title: 'Data e Hora', icon: Clock },
  { id: 4, title: 'Seus Dados', icon: Calendar },
];

export default function BookingPortal() {
  const [step, setStep] = useState(1);
  
  // Booking State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  
  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  const [isSuccess, setIsSuccess] = useState(false);

  // Queries
  const { data: services, isLoading: isLoadingServices } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      // Mock data if backend is offline, else fetch
      try {
        const res = await api.get<Service[]>('/services');
        return res.data;
      } catch (e) {
        return [
          { id: '1', name: 'Corte Degradê', description: 'Corte na máquina e tesoura com finalização', price: 40, duration_minutes: 40 },
          { id: '2', name: 'Barba Terapia', description: 'Toalha quente, massagem e alinhamento', price: 35, duration_minutes: 30 },
          { id: '3', name: 'Corte + Barba', description: 'Combo completo de cabelo e barba', price: 70, duration_minutes: 70 },
        ];
      }
    }
  });

  const barbers: Barber[] = [
    { id: 'b1', name: 'Richardson', avatar_url: null },
    { id: 'b2', name: 'Matheus', avatar_url: null }
  ];

  const availableTimes = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

  const bookMutation = useMutation({
    mutationFn: async () => {
      // TODO: Connect to actual backend endpoint
      // await api.post('/schedules', { ... })
      return new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate network
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
            <p><strong>Data:</strong> {selectedDate} às {selectedTime}</p>
          </div>
          <Button className="w-full" size="lg" onClick={() => window.location.reload()}>
            Novo Agendamento
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center py-10 px-4">
      {/* Header */}
      <div className="text-center mb-10 space-y-2">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-primary uppercase">
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
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${isActive ? 'bg-primary border-primary text-primary-foreground' : 'bg-card border-border text-muted-foreground'}`}>
                  <Icon className="w-5 h-5" />
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
          <CardContent className="p-6 md:p-8">
            
            {/* Step 1: Services */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                <h2 className="text-2xl font-bold mb-6">Escolha o Serviço</h2>
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
                <div className="grid grid-cols-2 gap-4">
                  {barbers.map((barber) => (
                    <div 
                      key={barber.id}
                      onClick={() => setSelectedBarber(barber)}
                      className={`p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 flex flex-col items-center text-center gap-3 ${selectedBarber?.id === barber.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 hover:bg-accent/5'}`}
                    >
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <UserIcon className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold">{barber.name}</h3>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Date and Time */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <h2 className="text-2xl font-bold mb-6">Data e Hora</h2>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Selecione uma data</label>
                  <Input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full text-lg p-6 bg-background"
                  />
                </div>

                {selectedDate && (
                  <div className="space-y-2 animate-in fade-in duration-300">
                    <label className="text-sm font-medium text-muted-foreground">Horários Disponíveis</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {availableTimes.map((time) => (
                        <div
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`p-3 text-center rounded-lg border-2 cursor-pointer font-medium transition-colors ${selectedTime === time ? 'bg-primary border-primary text-primary-foreground' : 'border-border bg-background hover:border-primary/50'}`}
                        >
                          {time}
                        </div>
                      ))}
                    </div>
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
                    <li>Em {selectedDate?.split('-').reverse().join('/')} às {selectedTime}</li>
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
                className="gap-2 px-8"
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
