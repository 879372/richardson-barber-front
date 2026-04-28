import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Calendar as CalendarIcon, Plus, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type WorkingHour = {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

const DAYS = [
  "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"
];

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: async () => (await api.get('/users/me/')).data });

  const { data: workingHours, isLoading: isLoadingHours } = useQuery({
    queryKey: ['working-hours', me?.id],
    queryFn: async () => {
      if (!me?.id) return [];
      const res = await api.get<WorkingHour[]>(`/working-hours/?barber=${me.id}`);
      return res.data;
    },
    enabled: !!me?.id,
  });

  const saveHourMutation = useMutation({
    mutationFn: async (data: any) => {
      const existing = workingHours?.find(h => h.day_of_week === data.day_of_week);
      if (existing) {
        return api.patch(`/working-hours/${existing.id}/`, data);
      }
      return api.post('/working-hours/', { ...data, barber: me.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['working-hours'] });
    },
  });

  const handleHourSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    saveHourMutation.mutate({
      day_of_week: parseInt(formData.get('day_of_week') as string),
      start_time: formData.get('start_time'),
      end_time: formData.get('end_time'),
      is_active: true,
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> Horário de Trabalho
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingHours ? (
              <div className="text-center py-4">Carregando...</div>
            ) : (
              <div className="space-y-3">
                {DAYS.map((day, index) => {
                  const hour = workingHours?.find(h => h.day_of_week === index);
                  return (
                    <div key={day} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background">
                      <div className="font-medium text-sm w-32">{day}</div>
                      <div className="flex-1 flex items-center gap-2 justify-end">
                        {hour ? (
                          <span className="text-sm font-bold">{hour.start_time.slice(0, 5)} - {hour.end_time.slice(0, 5)}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Não definido</span>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Plus className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-card border-border">
                            <DialogHeader>
                              <DialogTitle>Configurar {day}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleHourSubmit} className="space-y-4 pt-4">
                              <input type="hidden" name="day_of_week" value={index} />
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Início</label>
                                  <Input name="start_time" type="time" defaultValue={hour?.start_time.slice(0, 5) || "09:00"} required />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Fim</label>
                                  <Input name="end_time" type="time" defaultValue={hour?.end_time.slice(0, 5) || "19:00"} required />
                                </div>
                              </div>
                              <Button type="submit" className="w-full" disabled={saveHourMutation.isPending}>
                                {saveHourMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Salvar Horário
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

        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" /> Feriados e Bloqueios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-10 text-muted-foreground italic text-sm">
              Módulo de bloqueios manuais em desenvolvimento.
              Use a agenda para bloquear horários específicos.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
