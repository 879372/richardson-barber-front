import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scissors, Clock, DollarSign, Plus, Loader2, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from 'sonner';

type Service = {
  id: number;
  name: string;
  description: string;
  price: string;
  duration_minutes: number;
  is_active: boolean;
};

const formatCurrency = (value: string | number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(typeof value === 'string' ? parseFloat(value) : value);
};

export default function Services() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const queryClient = useQueryClient();

  const { data: services, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await api.get<Service[]>('/services/');
      return res.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Service>) => {
      if (editingService) {
        return api.patch(`/services/${editingService.id}/`, data);
      }
      return api.post('/services/', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setIsOpen(false);
      setEditingService(null);
      toast.success(editingService ? 'Serviço atualizado!' : 'Serviço criado!');
    },
    onError: () => toast.error('Erro ao salvar serviço.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/services/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Serviço excluído!');
    },
    onError: () => toast.error('Erro ao excluir serviço.'),
  });

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: formData.get('price') as string,
      duration_minutes: parseInt(formData.get('duration_minutes') as string),
      is_active: true,
    };
    saveMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Serviços</h1>
          <p className="text-muted-foreground text-sm">Configure os serviços oferecidos pela barbearia.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) setEditingService(null);
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2 font-bold shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4" /> Novo Serviço
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">{editingService ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-bold">Nome do Serviço</label>
                <Input 
                  name="name" 
                  defaultValue={editingService?.name} 
                  placeholder="Ex: Corte Degradê"
                  required 
                  className="bg-background border-border/50 h-11"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">Descrição (Opcional)</label>
                <Textarea 
                  name="description" 
                  defaultValue={editingService?.description} 
                  placeholder="Ex: Corte com acabamento na navalha e lavagem inclusa."
                  className="bg-background border-border/50 min-h-[80px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold">Preço (R$)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      name="price" 
                      type="number" 
                      step="0.01" 
                      defaultValue={editingService?.price} 
                      placeholder="0,00"
                      required 
                      className="bg-background border-border/50 pl-9 h-11"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">Duração (min)</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      name="duration_minutes" 
                      type="number" 
                      defaultValue={editingService?.duration_minutes} 
                      placeholder="30"
                      required 
                      className="bg-background border-border/50 pl-9 h-11"
                    />
                  </div>
                </div>
              </div>
              <Button type="submit" className="w-full h-12 font-bold text-lg mt-2" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingService ? 'Salvar Alterações' : 'Criar Serviço'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full text-center py-10 italic text-muted-foreground">Carregando serviços...</div>
        ) : (
          services?.map((service) => (
            <Card key={service.id} className="overflow-hidden border-border/50 bg-card/50 hover:border-primary/30 transition-all group">
              <CardHeader className="bg-primary/5 pb-4">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <Scissors className="w-6 h-6" />
                  </div>
                  <div className="font-black text-xl text-primary">{formatCurrency(service.price)}</div>
                </div>
                <CardTitle className="mt-4 text-xl font-bold">{service.name}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2 h-10">
                  {service.description || 'Sem descrição.'}
                </p>
                <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                    <Clock className="w-3.5 h-3.5" />
                    {service.duration_minutes} min
                  </div>
                  <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                    <div className={`w-2 h-2 rounded-full ${service.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                    {service.is_active ? 'Ativo' : 'Inativo'}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 font-bold h-9 gap-1.5 border-border/50 hover:bg-primary/10 hover:text-primary" 
                    onClick={() => handleEdit(service)}
                  >
                    <Edit className="w-3.5 h-3.5" /> Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 w-9 p-0 border-border/50 text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm('Tem certeza que deseja excluir este serviço?')) {
                        deleteMutation.mutate(service.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
