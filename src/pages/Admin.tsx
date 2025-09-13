import { useAuth } from '@/contexts/AuthContext';
import { APIConnectionTest } from '@/components/APIConnectionTest';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, 
  Users, 
  Database, 
  Shield, 
  Activity,
  UserCheck,
  UserX,
  Edit3
} from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  role?: 'free_user' | 'premium_user' | 'admin';
}

const Admin = () => {
  const { user, userRole, hasRole } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect if not admin
  if (!user || !hasRole('admin')) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get roles for each user
      const usersWithRoles = await Promise.all(
        profiles.map(async (profile) => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.user_id)
            .single();

          return {
            ...profile,
            role: roleData?.role || 'free_user'
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar usuários",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'free_user' | 'premium_user' | 'admin') => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role: newRole }, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Perfil do usuário atualizado com sucesso",
      });

      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar perfil do usuário",
        variant: "destructive"
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'premium_user':
        return 'default';
      case 'free_user':
      default:
        return 'secondary';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'premium_user':
        return 'Premium';
      case 'free_user':
      default:
        return 'Gratuito';
    }
  };

  const adminStats = [
    {
      title: "Usuários Ativos",
      value: "127",
      description: "Últimos 30 dias",
      icon: Users,
      trend: { value: 12, isPositive: true }
    },
    {
      title: "Buscas Realizadas",
      value: "1,847",
      description: "Total no sistema",
      icon: Database,
      trend: { value: 8, isPositive: true }
    },
    {
      title: "Usuários Premium",
      value: "23",
      description: "Contas ativas",
      icon: UserCheck,
      trend: { value: 15, isPositive: true }
    },
    {
      title: "Sistema",
      value: "Online",
      description: "Todos os serviços funcionando",
      icon: Activity,
      trend: { value: 99.9, isPositive: true }
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-scientific-navy">Administração</h1>
            <p className="text-muted-foreground mt-1">
              Painel de controle do sistema RevPRISMA
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-accent/10 text-accent border-accent/20">
              <Shield className="w-3 h-3 mr-1" />
              Administrador
            </Badge>
          </div>
        </div>

        {/* API Status */}
        <Card className="p-6 bg-gradient-subtle border-border/50">
          <div className="flex items-center mb-4">
            <Settings className="w-5 h-5 text-primary mr-2" />
            <h3 className="text-lg font-semibold">Status da API</h3>
          </div>
          <APIConnectionTest />
        </Card>

        {/* Admin Stats */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {adminStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="p-6 bg-gradient-subtle border-border/50 hover:shadow-card-hover transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.description}</p>
                    {stat.trend && (
                      <div className={`flex items-center text-sm ${
                        stat.trend.isPositive ? "text-accent" : "text-destructive"
                      }`}>
                        <span>{stat.trend.isPositive ? "+" : ""}{stat.trend.value}%</span>
                      </div>
                    )}
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* User Management */}
        <Card className="p-6 bg-gradient-subtle border-border/50">
          <div className="flex items-center mb-4">
            <Users className="w-5 h-5 text-primary mr-2" />
            <h3 className="text-lg font-semibold">Gerenciamento de Usuários</h3>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Carregando usuários...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-card rounded-lg border">
                  <UserCheck className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <div className="text-2xl font-bold">{users.filter(u => u.role === 'free_user').length}</div>
                  <div className="text-sm text-muted-foreground">Gratuitos</div>
                </div>
                <div className="text-center p-4 bg-card rounded-lg border">
                  <UserCheck className="w-6 h-6 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold">{users.filter(u => u.role === 'premium_user').length}</div>
                  <div className="text-sm text-muted-foreground">Premium</div>
                </div>
                <div className="text-center p-4 bg-card rounded-lg border">
                  <Shield className="w-6 h-6 text-accent mx-auto mb-2" />
                  <div className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</div>
                  <div className="text-sm text-muted-foreground">Administradores</div>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                <div className="space-y-2">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-card rounded-lg border hover:shadow-sm transition-shadow">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div>
                            <p className="font-medium">{user.full_name || 'Nome não informado'}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Badge variant={getRoleBadgeVariant(user.role || 'free_user')}>
                          {getRoleLabel(user.role || 'free_user')}
                        </Badge>
                        
                        <div className="flex space-x-1">
                          {user.role !== 'admin' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateUserRole(user.user_id, 'admin')}
                              className="h-8 px-2"
                            >
                              <Shield className="w-3 h-3" />
                            </Button>
                          )}
                          {user.role !== 'premium_user' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateUserRole(user.user_id, 'premium_user')}
                              className="h-8 px-2"
                            >
                              <UserCheck className="w-3 h-3" />
                            </Button>
                          )}
                          {user.role !== 'free_user' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateUserRole(user.user_id, 'free_user')}
                              className="h-8 px-2"
                            >
                              <UserX className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Management Sections */}
        <div className="grid lg:grid-cols-1 gap-6">

          {/* System Configuration */}
          <Card className="p-6 bg-gradient-subtle border-border/50">
            <div className="flex items-center mb-4">
              <Settings className="w-5 h-5 text-primary mr-2" />
              <h3 className="text-lg font-semibold">Configurações do Sistema</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-sm">API Python Backend</span>
                <Badge className="bg-accent/10 text-accent border-accent/20">Online</Badge>
              </div>
              
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-sm">Banco de Dados</span>
                <Badge className="bg-accent/10 text-accent border-accent/20">Conectado</Badge>
              </div>
              
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-sm">APIs Externas</span>
                <Badge className="bg-primary/10 text-primary border-primary/20">3/5 Ativas</Badge>
              </div>
              
              <div className="flex items-center justify-between py-2">
                <span className="text-sm">Versão do Sistema</span>
                <Badge variant="secondary">v2.1.0</Badge>
              </div>
            </div>
            
            <div className="mt-6 space-y-2">
              <Button variant="outline" className="w-full border-accent text-accent">
                Configurar APIs
              </Button>
              <Button variant="outline" className="w-full">
                Logs do Sistema
              </Button>
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="p-6 bg-gradient-subtle border-border/50">
          <div className="flex items-center mb-4">
            <Activity className="w-5 h-5 text-primary mr-2" />
            <h3 className="text-lg font-semibold">Atividade Recente do Sistema</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span className="text-sm">Novo usuário registrado: maria@email.com</span>
              </div>
              <span className="text-xs text-muted-foreground">há 15 min</span>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-sm">Busca executada: OpenAlex + Crossref (1,234 resultados)</span>
              </div>
              <span className="text-xs text-muted-foreground">há 32 min</span>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-scientific-blue rounded-full"></div>
                <span className="text-sm">API PubMed: 847 registros processados</span>
              </div>
              <span className="text-xs text-muted-foreground">há 1h</span>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-scientific-green rounded-full"></div>
                <span className="text-sm">Backup automático completado</span>
              </div>
              <span className="text-xs text-muted-foreground">há 2h</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Admin;