import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, AlertCircle, ShoppingCart, Plus, Loader2, Trash2, Edit, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';

type Product = {
  id: number;
  name: string;
  brand: string;
  stock_quantity: number;
  sale_price: string;
  unit_cost: string;
  min_stock_alert: number;
};

const formatCurrency = (value: string | number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(typeof value === 'string' ? parseFloat(value) : value);
};

export default function Products() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaleOpen, setIsSaleOpen] = useState(false);
  const [sellingProduct, setSellingProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await api.get<Product[]>('/products/');
      return res.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Product>) => {
      if (editingProduct) {
        return api.patch(`/products/${editingProduct.id}/`, data);
      }
      return api.post('/products/', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsOpen(false);
      setEditingProduct(null);
      toast.success(editingProduct ? 'Produto atualizado!' : 'Produto cadastrado!');
    },
    onError: () => toast.error('Erro ao salvar produto.')
  });

  const sellMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/sales/', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsSaleOpen(false);
      setSellingProduct(null);
      toast.success('Venda realizada com sucesso!');
    },
    onError: () => toast.error('Erro ao realizar venda.')
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/products/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto removido do estoque.');
    },
    onError: () => toast.error('Erro ao excluir produto.')
  });

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsOpen(true);
  };

  const handleSell = (product: Product) => {
    setSellingProduct(product);
    setIsSaleOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      brand: formData.get('brand') as string,
      sale_price: formData.get('sale_price') as string,
      unit_cost: formData.get('unit_cost') as string,
      stock_quantity: parseInt(formData.get('stock_quantity') as string),
      min_stock_alert: parseInt(formData.get('min_stock_alert') as string),
    };
    saveMutation.mutate(data);
  };

  const handleSaleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!sellingProduct) return;
    const formData = new FormData(e.currentTarget);
    const quantity = parseInt(formData.get('quantity') as string);
    const unitPrice = sellingProduct.sale_price;
    const totalAmount = (parseFloat(unitPrice) * quantity).toFixed(2);
    const method = formData.get('payment_method') as string;

    const data = {
      products: [
        {
          id: sellingProduct.id,
          quantity,
          unit_price: unitPrice
        }
      ],
      payments: [
        {
          method,
          amount: totalAmount
        }
      ]
    };
    sellMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estoque e Vendas</h1>
          <p className="text-muted-foreground text-sm">Gerencie seus produtos e vendas diretas.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) setEditingProduct(null);
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2 font-bold shadow-lg shadow-primary/20"><Plus className="w-4 h-4" /> Novo Produto</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-bold">Nome do Produto</label>
                <Input 
                  name="name" 
                  defaultValue={editingProduct?.name} 
                  placeholder="Ex: Pomada Efeito Matte"
                  required 
                  className="bg-background border-border/50 h-11"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">Marca</label>
                <Input 
                  name="brand" 
                  defaultValue={editingProduct?.brand} 
                  placeholder="Ex: Suavecito"
                  className="bg-background border-border/50 h-11"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold">Preço de Venda (R$)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      name="sale_price" 
                      type="number" 
                      step="0.01" 
                      defaultValue={editingProduct?.sale_price} 
                      placeholder="0,00"
                      required 
                      className="bg-background border-border/50 pl-9 h-11"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">Custo Unitário (R$)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      name="unit_cost" 
                      type="number" 
                      step="0.01" 
                      defaultValue={editingProduct?.unit_cost} 
                      placeholder="0,00"
                      className="bg-background border-border/50 pl-9 h-11"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold">Qtd. em Estoque</label>
                  <Input 
                    name="stock_quantity" 
                    type="number" 
                    defaultValue={editingProduct?.stock_quantity} 
                    placeholder="0"
                    required 
                    className="bg-background border-border/50 h-11"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">Alerta de Estoque</label>
                  <Input 
                    name="min_stock_alert" 
                    type="number" 
                    defaultValue={editingProduct?.min_stock_alert} 
                    placeholder="5"
                    required 
                    className="bg-background border-border/50 h-11"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-12 font-bold text-lg mt-2" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingProduct ? 'Salvar Alterações' : 'Adicionar ao Estoque'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sale Dialog */}
      <Dialog open={isSaleOpen} onOpenChange={setIsSaleOpen}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Venda Direta</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaleSubmit} className="space-y-4 pt-4">
            <div className="p-4 rounded-xl bg-primary/5 space-y-1 border border-primary/10">
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Produto selecionado</div>
              <div className="font-bold text-lg">{sellingProduct?.name}</div>
              <div className="text-sm text-primary font-black">Preço: {sellingProduct && formatCurrency(sellingProduct.sale_price)}</div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold">Quantidade</label>
                <Input 
                  name="quantity" 
                  type="number" 
                  defaultValue="1" 
                  min="1" 
                  max={sellingProduct?.stock_quantity} 
                  required 
                  className="h-11 bg-background border-border/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">Forma de Pagamento</label>
                <Select name="payment_method" defaultValue="pix">
                  <SelectTrigger className="h-11 bg-background border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="credit">Cartão de Crédito</SelectItem>
                    <SelectItem value="debit">Cartão de Débito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" className="w-full h-12 gap-2 font-bold text-lg shadow-lg shadow-primary/10" disabled={sellMutation.isPending}>
              {sellMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-5 h-5" />}
              Finalizar Venda
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Lista de Produtos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-10 italic text-muted-foreground">Carregando estoque...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {products?.map((product) => (
                <div key={product.id} className="p-4 rounded-xl border border-border/50 flex flex-col gap-3 bg-background hover:border-primary/30 transition-all group relative overflow-hidden">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform border border-primary/10">
                      <Package className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-sm">{product.name}</div>
                      <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">{product.brand || 'Marca n/a'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-primary">{formatCurrency(product.sale_price)}</div>
                      <Badge 
                        variant="outline"
                        className={`text-[9px] h-5 font-bold uppercase border-none ${product.stock_quantity <= product.min_stock_alert ? "bg-red-500/10 text-red-500" : "bg-muted text-muted-foreground"}`}
                      >
                        {product.stock_quantity <= product.min_stock_alert && <AlertCircle className="w-3 h-3 mr-1" />}
                        {product.stock_quantity} un
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 border-t border-border/50 pt-3 mt-1">
                    <Button variant="default" size="sm" className="flex-1 h-9 gap-1.5 font-bold bg-primary/20 text-primary hover:bg-primary/30 border-none shadow-none" onClick={() => handleSell(product)}>
                      <ShoppingCart className="w-3.5 h-3.5" /> Vender
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 w-9 p-0 border-border/50 hover:bg-primary/10 hover:text-primary" onClick={() => handleEdit(product)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-9 w-9 p-0 border-border/50 text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm('Tem certeza que deseja excluir este produto?')) {
                          deleteMutation.mutate(product.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {products?.length === 0 && (
                <div className="col-span-full text-center py-10 text-muted-foreground italic">
                  Nenhum produto cadastrado no estoque.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
