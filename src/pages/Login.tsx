import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Scissors, Lock, User as UserIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';

const loginSchema = z.object({
  username: z.string().min(3, 'O usuário deve ter pelo menos 3 caracteres'),
  password: z.string().min(4, 'A senha deve ter pelo menos 4 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Get token
      const tokenRes = await api.post('/token/', data);
      const { access } = tokenRes.data;

      // 2. Set token temporarily to fetch user data
      localStorage.setItem('access_token', access);
      
      // 3. Get user info (Assuming there's a /users/me or similar, or just get from the list)
      // For now, let's assume the token endpoint doesn't return user data, 
      // but in a real Django setup we often customize it.
      // Let's just fetch the users and find the one that matches for now, 
      // or better, implement a /me endpoint in Django.
      
      const userRes = await api.get('/users/me/'); // I should implement this in Django
      
      setAuth(userRes.data, access);
      navigate('/dashboard');
    } catch (err: any) {
      setError('Usuário ou senha inválidos. Tente novamente.');
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
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20">
            <Scissors className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-black tracking-tight uppercase">
            Richardson<span className="text-primary">Barber</span>
          </CardTitle>
          <CardDescription>Painel Administrativo</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium ml-1">Usuário</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  {...register('username')}
                  placeholder="Seu usuário" 
                  className={`pl-10 h-12 bg-background/50 ${errors.username ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.username && <p className="text-xs text-destructive ml-1">{errors.username.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  {...register('password')}
                  type="password"
                  placeholder="••••••••" 
                  className={`pl-10 h-12 bg-background/50 ${errors.password ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.password && <p className="text-xs text-destructive ml-1">{errors.password.message}</p>}
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-lg font-bold gap-2" 
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar no Sistema'}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-muted-foreground">
              Problemas com acesso? Entre em contato com o administrador.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
