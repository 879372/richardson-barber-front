import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, Phone, Calendar, Mail, History, FileText, Loader2, Save } from 'lucide-react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Customer = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  birth_date: string;
  internal_notes: string;
};

type Appointment = {
  id: number;
  service_name: string;
  barber_name: string;
  date_time: string;
  status: string;
  total_price: string;
};

export default function Customers() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await api.get<Customer[]>('/users/?role=client');
      return res.data;
    },
  });

  const { data: history, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['customer-history', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      const res = await api.get<Appointment[]>(`/appointments/?client=${selectedCustomer.id}`);
      return res.data;
    },
    enabled: !!selectedCustomer,
  });

  const updateNotesMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomer) return;
      return api.patch(`/users/${selectedCustomer.id}/`, { internal_notes: notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      if (selectedCustomer) {
        setSelectedCustomer({ ...selectedCustomer, internal_notes: notes });
      }
    },
  });

  const handleOpenDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setNotes(customer.internal_notes || "");
  };

  const statusMap: Record<string, string> = {
    pending: "Pendente",
    confirmed: "Confirmado",
    completed: "Concluído",
    cancelled: "Cancelado",
    no_show: "Faltou",
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-10">Carregando clientes...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Data Nasc.</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                      Nenhum cliente cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  customers?.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{customer.first_name || customer.username}</div>
                            <div className="text-xs text-muted-foreground">{customer.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                          {customer.phone || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          {customer.birth_date || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => handleOpenDetails(customer)}
                        >
                          Ver Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-card border-l border-border">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Ficha do Cliente
            </SheetTitle>
            <SheetDescription>
              Dados detalhados e histórico de {selectedCustomer?.first_name || selectedCustomer?.username}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-8 space-y-8">
            {/* Informações Básicas */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Dados de Contato</h3>
              <div className="grid gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border/50">
                  <Phone className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{selectedCustomer?.phone || "Não informado"}</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border/50">
                  <Mail className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{selectedCustomer?.email || "Não informado"}</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border/50">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Nasc: {selectedCustomer?.birth_date || "Não informado"}</span>
                </div>
              </div>
            </div>

            {/* Observações Internas */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Observações Técnicas
                </h3>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 gap-1 text-primary"
                  onClick={() => updateNotesMutation.mutate()}
                  disabled={updateNotesMutation.isPending}
                >
                  {updateNotesMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  Salvar
                </Button>
              </div>
              <Textarea 
                placeholder="Ex: Prefere máquina 2, alérgico a tal produto..."
                className="min-h-[100px] bg-background border-border/50"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Histórico de Agendamentos */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4" />
                Histórico de Serviços
              </h3>
              <div className="space-y-3">
                {isLoadingHistory ? (
                  <div className="text-center py-4 text-xs italic">Carregando histórico...</div>
                ) : history?.length === 0 ? (
                  <div className="text-center py-4 text-xs text-muted-foreground">Nenhum serviço registrado.</div>
                ) : (
                  history?.map((app) => (
                    <div key={app.id} className="p-3 rounded-lg border border-border/50 bg-background space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-bold">{app.service_name}</span>
                        <Badge variant="outline" className="text-[10px] h-4">
                          {statusMap[app.status] || app.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>{format(new Date(app.date_time), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                        <span className="font-medium text-foreground">R$ {app.total_price}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
