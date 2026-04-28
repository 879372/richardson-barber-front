import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, AlertCircle, ShoppingCart, Plus, Loader2, Trash2 } from 'lucide-react';
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

type Product = {
  id: number;
  name: string;
  brand: string;
  stock_quantity: number;
  sale_price: string;
  unit_cost: string;
  min_stock_alert: number;
};

export default function Products() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaleOpen, setIsSaleOpen] = useState(false);
  const [sellingProduct, setSellingProduct] = useState<Product | null>(null);
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
    },
  });

  const sellMutation = useMutation({
    mutationFn: async (data: { product: number; quantity: number; unit_price: string; total_price: string; payment_method: string }) => {
      return api.post('/product-sales/', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsSaleOpen(false);
      setSellingProduct(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/products/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
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
    const data = {
      product: sellingProduct.id,
      quantity,
      unit_price: sellingProduct.sale_price,
      total_price: (parseFloat(sellingProduct.sale_price) * quantity).toFixed(2),
      payment_method: formData.get('payment_method') as string,
    };
    sellMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
        
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) setEditingProduct(null);
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Novo Produto</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome do Produto</label>
                <Input name="name" defaultValue={editingProduct?.name} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Marca</label>
                <Input name="brand" defaultValue={editingProduct?.brand} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Preço de Venda (R$)</label>
                  <Input name="sale_price" type="number" step="0.01" defaultValue={editingProduct?.sale_price} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Custo Unitário (R$)</label>
                  <Input name="unit_cost" type="number" step="0.01" defaultValue={editingProduct?.unit_cost} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Qtd. em Estoque</label>
                  <Input name="stock_quantity" type="number" defaultValue={editingProduct?.stock_quantity} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Alerta de Estoque Baixo</label>
                  <Input name="min_stock_alert" type="number" defaultValue={editingProduct?.min_stock_alert} required />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingProduct ? 'Salvar Alterações' : 'Adicionar Produto'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sale Dialog */}
      <Dialog open={isSaleOpen} onOpenChange={setIsSaleOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Venda de Produto</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaleSubmit} className="space-y-4 pt-4">
            <div className="p-4 rounded-lg bg-primary/5 space-y-1">
              <div className="text-sm text-muted-foreground">Produto selecionado</div>
              <div className="font-bold text-lg">{sellingProduct?.name}</div>
              <div className="text-xs text-primary font-medium">Preço unitário: R$ {sellingProduct?.sale_price}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantidade</label>
                <Input name="quantity" type="number" defaultValue="1" min="1" max={sellingProduct?.stock_quantity} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Forma de Pagamento</label>
                <select name="payment_method" className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                  <option value="pix">PIX</option>
                  <option value="cash">Dinheiro</option>
                  <option value="credit">Cartão de Crédito</option>
                  <option value="debit">Cartão de Débito</option>
                </select>
              </div>
            </div>

            <Button type="submit" className="w-full gap-2" disabled={sellMutation.isPending}>
              {sellMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
              Finalizar Venda
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle>Estoque de Produtos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-10">Carregando estoque...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {products?.map((product) => (
                <div key={product.id} className="p-4 rounded-xl border border-border/50 flex flex-col gap-3 bg-background hover:bg-accent/5 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Package className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold">{product.name}</div>
                      <div className="text-xs text-muted-foreground">{product.brand || 'Marca não informada'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black">R$ {parseFloat(product.sale_price).toFixed(2)}</div>
                      <Badge variant={product.stock_quantity <= product.min_stock_alert ? "destructive" : "secondary"}>
                        {product.stock_quantity <= product.min_stock_alert && <AlertCircle className="w-3 h-3 mr-1" />}
                        {product.stock_quantity} un
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 border-t border-border/50 pt-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="default" size="sm" className="flex-1 h-8 gap-1 bg-primary/20 text-primary hover:bg-primary/30 border-none" onClick={() => handleSell(product)}>
                      <ShoppingCart className="w-3 h-3" /> Vender
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1 h-8" onClick={() => handleEdit(product)}>Editar</Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-destructive hover:bg-destructive/10"
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
                <div className="col-span-full text-center py-10 text-muted-foreground">
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
