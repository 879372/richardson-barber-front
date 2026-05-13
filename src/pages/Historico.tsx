import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  History, 
  User, 
  Calendar, 
  Clock, 
  ChevronRight, 
  ArrowRight,
  PlusCircle,
  Edit,
  Trash2,
  Search,
  Filter
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

type HistoryRecord = {
  history_id: number;
  id: number;
  user: string;
  action: string;
  date: string;
  status: string;
  client_name: string;
  service_name: string;
  changes: {
    field: string;
    old: any;
    new: any;
  }[];
};

const actionIcons: Record<string, any> = {
  'Criou': <PlusCircle className="w-4 h-4 text-green-500" />,
  'Editou': <Edit className="w-4 h-4 text-blue-500" />,
  'Apagou': <Trash2 className="w-4 h-4 text-red-500" />,
};

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-500/10 text-yellow-500' },
  confirmed: { label: 'Confirmado', color: 'bg-blue-500/10 text-blue-500' },
  completed: { label: 'Concluído', color: 'bg-green-500/10 text-green-500' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/10 text-red-500' },
  no_show: { label: 'Faltou', color: 'bg-gray-500/10 text-gray-500' },
};

export default function Historico() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: history, isLoading } = useQuery({
    queryKey: ['global-history'],
    queryFn: async () => {
      const res = await api.get<HistoryRecord[]>('/global-history/');
      return res.data;
    }
  });

  const filteredHistory = history?.filter(h => 
    h.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.action.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <History className="w-8 h-8 text-primary" />
            </div>
            Histórico de Atividade
          </h1>
          <p className="text-muted-foreground mt-1">Acompanhe todas as alterações nos agendamentos em tempo real.</p>
        </div>
        
        <div className="relative w-full md:w-72 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Buscar por usuário ou cliente..." 
            className="pl-10 bg-card/50 border-border/50 focus-visible:ring-primary h-11 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="relative space-y-4">
        {/* Timeline Vertical Line */}
        <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-border to-transparent hidden md:block" />

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-muted-foreground animate-pulse">Carregando histórico...</p>
          </div>
        ) : filteredHistory?.length === 0 ? (
          <div className="text-center py-20 bg-card/30 rounded-3xl border border-dashed border-border">
            <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <p className="text-muted-foreground">Nenhum registro encontrado para sua busca.</p>
          </div>
        ) : (
          filteredHistory?.map((record, index) => (
            <div key={record.history_id} className="relative md:pl-16 group">
              {/* Timeline dot */}
              <div className="absolute left-5 top-6 w-3 h-3 rounded-full bg-background border-2 border-primary hidden md:block z-10 group-hover:scale-125 transition-transform shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
              
              <Card className="border-border/50 bg-card/50 backdrop-blur-md hover:bg-card/80 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-0.5 overflow-hidden group">
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                        {actionIcons[record.action] || <History className="w-6 h-6 text-primary" />}
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-lg">{record.user}</span>
                          <span className="text-muted-foreground font-medium">{record.action.toLowerCase()} o agendamento de</span>
                          <span className="font-bold text-primary">{record.client_name}</span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(new Date(record.date), "dd 'de' MMMM", { locale: ptBR })}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {format(new Date(record.date), "HH:mm")}
                          </div>
                          <Badge variant="outline" className={cn("text-[10px] h-5 uppercase tracking-wider", statusMap[record.status]?.color)}>
                            {statusMap[record.status]?.label || record.status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border border-border/50 self-end lg:self-center">
                      <ChevronRight className="w-3 h-3" />
                      ID: {record.id}
                    </div>
                  </div>

                  {/* Changes List */}
                  {record.changes.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">Alterações detalhadas:</p>
                      {record.changes.map((change, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm bg-muted/30 p-3 rounded-xl border border-border/30">
                          <span className="font-bold text-muted-foreground min-w-[100px]">{fieldLabels[change.field] || change.field}:</span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-500 line-through text-xs">
                              {formatValue(change.field, change.old)}
                            </span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-500 font-bold text-xs">
                              {formatValue(change.field, change.new)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const fieldLabels: Record<string, string> = {
  'status': 'Status',
  'date_time': 'Data/Hora',
  'total_price': 'Valor',
  'notes': 'Notas',
  'service': 'Serviço',
  'barber': 'Barbeiro',
  'client': 'Cliente'
};

const formatValue = (field: string, value: any) => {
  if (value === null || value === undefined || value === "") return "Vazio";
  if (field === 'date_time') return format(new Date(value), "dd/MM/yy HH:mm");
  if (field === 'total_price') return `R$ ${parseFloat(value).toFixed(2)}`;
  if (field === 'status') return statusMap[value]?.label || value;
  return String(value);
};

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
