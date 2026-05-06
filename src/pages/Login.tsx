import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Lock, User as UserIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const loginSchema = z.object({
  username: z.string().min(3, 'O usuário deve ter pelo menos 3 caracteres'),
  password: z.string().min(4, 'A senha deve ter pelo menos 4 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      // 1. Convert username to lowercase to make login case-insensitive
      const loginPayload = {
        ...data,
        username: data.username.toLowerCase()
      };

      // 2. Get token
      const tokenRes = await api.post('/token/', loginPayload);
      const { access } = tokenRes.data;

      // 2. Set token temporarily to fetch user data
      localStorage.setItem('access_token', access);
      
      // 3. Get user info
      const userRes = await api.get('/users/me/');
      
      setAuth(userRes.data, access);
      toast.success(`Bem-vindo, ${userRes.data.first_name || userRes.data.username}!`);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error('Usuário ou senha inválidos. Verifique seus dados.');
      localStorage.removeItem('access_token');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] -z-10" />

      <Card className="max-w-md w-full border-border/50 shadow-2xl bg-card/50 backdrop-blur-xl">
        <CardHeader className="text-center space-y-2">
          <div className="w-20 h-20 mx-auto mb-4 border border-primary/20 rounded-2xl overflow-hidden shadow-lg shadow-primary/10">
            <img src="/logo.png" alt="Richardson Barber" className="w-full h-full object-cover" />
          </div>
          <CardTitle className="text-3xl font-black tracking-tight uppercase">
            Richardson<span className="text-primary">Barber</span>
          </CardTitle>
          <CardDescription>Painel Administrativo</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold ml-1 uppercase tracking-wider text-muted-foreground">Usuário</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  {...register('username')}
                  placeholder="Seu usuário" 
                  className={`pl-10 h-12 bg-background/50 border-border/50 focus:border-primary transition-all ${errors.username ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.username && <p className="text-[10px] font-bold text-destructive ml-1 uppercase">{errors.username.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold ml-1 uppercase tracking-wider text-muted-foreground">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  {...register('password')}
                  type="password"
                  placeholder="••••••••" 
                  className={`pl-10 h-12 bg-background/50 border-border/50 focus:border-primary transition-all ${errors.password ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.password && <p className="text-[10px] font-bold text-destructive ml-1 uppercase">{errors.password.message}</p>}
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-lg font-black uppercase tracking-tight gap-2 shadow-lg shadow-primary/20" 
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Acessar Painel'}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Esqueceu sua senha? Procure o gerente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
