import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock, Calendar as CalendarIcon, Plus, Loader2, Trash2, Target, Info, CalendarOff, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';

type WorkingHour = {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  break_start_time: string | null;
  break_end_time: string | null;
  is_active: boolean;
};

type TimeBlock = {
  id: number;
  start_time: string;
  end_time: string;
  reason: string;
  barber: number;
};

type Goal = {
  id: number;
  period: 'daily' | 'weekly' | 'monthly';
  target_amount: string;
  start_date: string;
  end_date: string | null;
};

const DAYS = [
  "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"
];

const periodLabels: Record<string, string> = {
  daily: 'Diária',
  weekly: 'Semanal',
  monthly: 'Mensal'
};

const formatCurrency = (value: string | number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(typeof value === 'string' ? parseFloat(value) : value);
};

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: async () => (await api.get('/users/me/')).data });
  const { data: barbers } = useQuery({ 
    queryKey: ['barbers'], 
    queryFn: async () => (await api.get('/users/')).data.filter((u: any) => u.role === 'barber'),
    enabled: me?.role === 'admin'
  });

  const [selectedBarberId, setSelectedBarberId] = useState<number | null>(null);
  
  const targetBarberId = me?.role === 'admin' ? selectedBarberId : me?.id;

  // WORKING HOURS
  const { data: workingHours, isLoading: isLoadingHours } = useQuery({
    queryKey: ['working-hours', targetBarberId],
    queryFn: async () => {
      if (!targetBarberId) return [];
      const res = await api.get<WorkingHour[]>(`/working-hours/?barber=${targetBarberId}`);
      return res.data;
    },
    enabled: !!targetBarberId,
  });

  const [openHourDialogId, setOpenHourDialogId] = useState<number | null>(null);
  const [isDayOff, setIsDayOff] = useState(false);

  const saveHourMutation = useMutation({
    mutationFn: async (data: any) => {
      const existing = workingHours?.find(h => h.day_of_week === data.day_of_week);
      if (existing) {
        return api.patch(`/working-hours/${existing.id}/`, data);
      }
      return api.post('/working-hours/', { ...data, barber: targetBarberId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['working-hours'] });
      setOpenHourDialogId(null);
      toast.success('Horário atualizado com sucesso!');
    },
    onError: () => toast.error('Erro ao atualizar horário.')
  });

  const handleHourSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const bStart = formData.get('break_start_time') as string;
    const bEnd = formData.get('break_end_time') as string;
    
    saveHourMutation.mutate({
      day_of_week: parseInt(formData.get('day_of_week') as string),
      start_time: isDayOff ? '00:00' : formData.get('start_time'),
      end_time: isDayOff ? '00:00' : formData.get('end_time'),
      break_start_time: isDayOff ? null : (bStart || null),
      break_end_time: isDayOff ? null : (bEnd || null),
      is_active: !isDayOff,
    });
  };

  // TIME BLOCKS
  const { data: blocks, isLoading: isLoadingBlocks } = useQuery({
    queryKey: ['time-blocks', targetBarberId],
    queryFn: async () => {
      if (!targetBarberId) return [];
      const res = await api.get<TimeBlock[]>(`/time-blocks/?barber=${targetBarberId}`);
      return res.data;
    },
    enabled: !!targetBarberId,
  });

  const [isBlockOpen, setIsBlockOpen] = useState(false);
  const [isFullDay, setIsFullDay] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [blockDate, setBlockDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [blockStart, setBlockStart] = useState('08:00');
  const [blockEnd, setBlockEnd] = useState('18:00');

  const saveBlockMutation = useMutation({
    mutationFn: async () => {
      const start = isFullDay ? `${blockDate}T00:00:00` : `${blockDate}T${blockStart}:00`;
      const end = isFullDay ? `${blockDate}T23:59:59` : `${blockDate}T${blockEnd}:00`;
      
      return api.post('/time-blocks/', {
        barber: targetBarberId,
        reason: blockReason,
        start_time: start,
        end_time: end,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-blocks'] });
      setIsBlockOpen(false);
      setBlockReason('');
      toast.success('Bloqueio registrado com sucesso!');
    },
    onError: () => toast.error('Erro ao registrar bloqueio.')
  });

  const deleteBlockMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/time-blocks/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-blocks'] });
      toast.success('Bloqueio removido.');
    },
    onError: () => toast.error('Erro ao remover bloqueio.')
  });

  // GOALS
  const { data: goals, isLoading: isLoadingGoals } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const res = await api.get<Goal[]>('/goals/');
      return res.data;
    }
  });

  const [isGoalOpen, setIsGoalOpen] = useState(false);
  const [goalPeriod, setGoalPeriod] = useState<'daily'|'weekly'|'monthly'>('monthly');
  const [goalTarget, setGoalTarget] = useState('');

  const saveGoalMutation = useMutation({
    mutationFn: async () => {
      return api.post('/goals/', {
        period: goalPeriod,
        target_amount: parseFloat(goalTarget),
        start_date: format(new Date(), 'yyyy-MM-dd')
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setIsGoalOpen(false);
      setGoalTarget('');
      toast.success('Meta definida com sucesso!');
    },
    onError: () => toast.error('Erro ao definir meta.')
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground text-sm">Gerencie horários, metas e bloqueios de agenda.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Working Hours */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xl font-medium">
                <Clock className="w-5 h-5 text-primary" /> Horário de Trabalho
              </CardTitle>
              
              {me?.role === 'admin' && (
                <Select 
                  value={selectedBarberId?.toString() || ''}
                  onValueChange={(val) => setSelectedBarberId(Number(val))}
                >
                  <SelectTrigger className="w-[200px] bg-background border-border/50">
                    <SelectValue placeholder="Profissional..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {barbers?.map((b: any) => (
                      <SelectItem key={b.id} value={b.id.toString()}>{b.first_name || b.username}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <CardDescription>Defina o horário padrão de atendimento semanal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!targetBarberId ? (
              <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border/50 rounded-2xl bg-muted/5">
                <Clock className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">Selecione um profissional acima.</p>
              </div>
            ) : isLoadingHours ? (
              <div className="text-center py-10 italic text-muted-foreground">Carregando horários...</div>
            ) : (
              <div className="space-y-3">
                {DAYS.map((day, index) => {
                  const hour = workingHours?.find(h => h.day_of_week === index);
                  return (
                    <div key={day} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-background/50 hover:bg-background transition-colors group">
                      <div className="font-medium text-sm w-32">{day}</div>
                      <div className="flex-1 flex items-center gap-3 justify-end">
                        {hour ? (
                          hour.is_active ? (
                            <div className="flex flex-col items-end">
                              <span className="text-sm font-medium text-primary">{hour.start_time.slice(0, 5)} — {hour.end_time.slice(0, 5)}</span>
                              {hour.break_start_time && hour.break_end_time && (
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Intervalo: {hour.break_start_time.slice(0, 5)} - {hour.break_end_time.slice(0, 5)}</span>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5 font-bold uppercase text-[10px]">Folga</Badge>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground italic font-medium">Não configurado</span>
                        )}
                        <Dialog open={openHourDialogId === index} onOpenChange={(isOpen) => {
                          setOpenHourDialogId(isOpen ? index : null);
                          if (isOpen) {
                            const h = workingHours?.find(x => x.day_of_week === index);
                            setIsDayOff(h ? !h.is_active : false);
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary">
                              <Plus className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-card border-border sm:max-w-sm">
                            <DialogHeader>
                              <DialogTitle className="text-xl font-medium">Configurar {day}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleHourSubmit} className="space-y-6 pt-4">
                              <input type="hidden" name="day_of_week" value={index} />
                              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/5 border border-border/50">
                                <Label htmlFor={`folga-${index}`} className="font-medium text-sm">Dia de Folga</Label>
                                <Switch 
                                  id={`folga-${index}`}
                                  checked={isDayOff}
                                  onCheckedChange={setIsDayOff}
                                />
                              </div>
                              
                              {!isDayOff && (
                                <>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label className="text-xs font-bold uppercase text-muted-foreground">Início</Label>
                                      <Input name="start_time" type="time" defaultValue={hour?.start_time.slice(0, 5) || "09:00"} required className="h-11 bg-background border-border/50" />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-xs font-medium uppercase text-muted-foreground">Fim</Label>
                                      <Input name="end_time" type="time" defaultValue={hour?.end_time.slice(0, 5) || "19:00"} required className="h-11 bg-background border-border/50" />
                                    </div>
                                  </div>
                                  <div className="space-y-4 pt-4 border-t border-border/50">
                                    <h4 className="text-xs font-medium uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                                      <Info className="w-3 h-3" /> Intervalo de Almoço
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label className="text-xs font-medium text-muted-foreground uppercase">Início</Label>
                                        <Input name="break_start_time" type="time" defaultValue={hour?.break_start_time?.slice(0, 5) || ""} className="h-11 bg-background border-border/50" />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-xs font-bold text-muted-foreground uppercase">Fim</Label>
                                        <Input name="break_end_time" type="time" defaultValue={hour?.break_end_time?.slice(0, 5) || ""} className="h-11 bg-background border-border/50" />
                                      </div>
                                    </div>
                                  </div>
                                </>
                              )}
                              <Button type="submit" className="w-full h-12 font-bold shadow-lg shadow-primary/20" disabled={saveHourMutation.isPending}>
                                {saveHourMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Salvar Configuração
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-8">
          {/* Feriados e Bloqueios */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl font-medium">
                  <CalendarOff className="w-5 h-5 text-primary" /> Feriados e Bloqueios
                </CardTitle>
                <CardDescription>Bloqueie horários ou dias inteiros.</CardDescription>
              </div>
              <Dialog open={isBlockOpen} onOpenChange={setIsBlockOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-2 font-bold h-9"><Plus className="w-4 h-4" /> Novo</Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border sm:max-w-md">
                  <DialogHeader><DialogTitle className="text-xl font-medium">Novo Bloqueio de Agenda</DialogTitle></DialogHeader>
                  <div className="space-y-5 py-4">
                    <div className="space-y-2">
                      <Label className="font-bold">Motivo</Label>
                      <Input placeholder="Ex: Feriado, Consulta Médica..." value={blockReason} onChange={(e) => setBlockReason(e.target.value)} className="h-11 bg-background border-border/50" />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/5 border border-border/50">
                      <Label className="font-medium text-sm">Bloquear o dia todo</Label>
                      <Switch checked={isFullDay} onCheckedChange={setIsFullDay} />
                    </div>

                    <div className="space-y-2">
                      <Label className="font-bold">Data</Label>
                      <Input type="date" value={blockDate} onChange={(e) => setBlockDate(e.target.value)} className="h-11 bg-background border-border/50" />
                    </div>

                    {!isFullDay && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="font-bold">Hora Início</Label>
                          <Input type="time" value={blockStart} onChange={(e) => setBlockStart(e.target.value)} className="h-11 bg-background border-border/50" />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold">Hora Fim</Label>
                          <Input type="time" value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)} className="h-11 bg-background border-border/50" />
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button 
                      className="w-full h-12 font-bold"
                      onClick={() => saveBlockMutation.mutate()} 
                      disabled={!blockReason || !blockDate || saveBlockMutation.isPending}
                    >
                      {saveBlockMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Salvar Bloqueio
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isLoadingBlocks ? <div className="text-center py-4 italic text-muted-foreground">Carregando...</div> : blocks?.length === 0 ? <div className="text-sm text-muted-foreground italic text-center py-6 border border-dashed border-border/50 rounded-xl">Nenhum bloqueio registrado.</div> : (
                <div className="space-y-3">
                  {blocks?.map(b => (
                    <div key={b.id} className="flex justify-between items-center p-3 border border-border/50 rounded-xl bg-background/50 group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <CalendarIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{b.reason || "Bloqueio"}</div>
                          <div className="text-[10px] font-bold text-muted-foreground uppercase">
                            {format(new Date(b.start_time), "dd 'de' MMM", { locale: ptBR })} • {format(new Date(b.start_time), 'HH:mm')} - {format(new Date(b.end_time), 'HH:mm')}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive h-8 w-8 hover:bg-destructive/10 rounded-full" onClick={() => deleteBlockMutation.mutate(b.id)}>
                        {deleteBlockMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metas */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl font-medium">
                  <Target className="w-5 h-5 text-primary" /> Metas de Faturamento
                </CardTitle>
                <CardDescription>Defina objetivos para seu negócio.</CardDescription>
              </div>
              <Dialog open={isGoalOpen} onOpenChange={setIsGoalOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-2 font-bold h-9"><Plus className="w-4 h-4" /> Nova</Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border sm:max-w-sm">
                  <DialogHeader><DialogTitle className="text-xl font-medium">Definir Nova Meta</DialogTitle></DialogHeader>
                  <div className="space-y-5 py-4">
                    <div className="space-y-2">
                      <Label className="font-bold">Período</Label>
                      <Select value={goalPeriod} onValueChange={(val) => setGoalPeriod(val as any)}>
                        <SelectTrigger className="h-11 bg-background border-border/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="daily">Diária</SelectItem>
                          <SelectItem value="weekly">Semanal</SelectItem>
                          <SelectItem value="monthly">Mensal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Valor Alvo (R$)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="number" step="0.01" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} className="h-11 bg-background border-border/50 pl-9" placeholder="0,00" />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button className="w-full h-12 font-bold shadow-lg shadow-primary/20" onClick={() => saveGoalMutation.mutate()} disabled={!goalTarget || saveGoalMutation.isPending}>Salvar Meta</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isLoadingGoals ? <div className="text-center py-4 italic text-muted-foreground">Carregando...</div> : goals?.length === 0 ? <div className="text-sm text-muted-foreground italic text-center py-6 border border-dashed border-border/50 rounded-xl">Nenhuma meta configurada.</div> : (
                <div className="space-y-3">
                  {goals?.map(g => (
                    <div key={g.id} className="flex justify-between items-center p-4 border border-border/50 rounded-xl bg-background/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <Target className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-black uppercase text-[10px] text-primary tracking-widest">{periodLabels[g.period]}</span>
                          <div className="text-lg font-medium">{formatCurrency(g.target_amount)}</div>
                        </div>
                      </div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase text-right leading-tight">
                        Ativa desde<br/>{format(new Date(g.start_date + 'T00:00:00'), 'dd/MM/yyyy')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
