import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Search, BarChart3, FileText, Zap, Shield, Globe, Clock, Eye, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSearch } from "@/contexts/SearchContext";
import { useEffect, useState } from "react";
import heroImage from "@/assets/hero-scientific.jpg";

const Home = () => {
  const { user } = useAuth();
  const { fetchUserSearches, setCurrentSearch, fetchArticlesForSearch } = useSearch();
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [loadingSearches, setLoadingSearches] = useState(false);

  useEffect(() => {
    if (user) {
      loadRecentSearches();
    }
  }, [user]);

  const loadRecentSearches = async () => {
    setLoadingSearches(true);
    try {
      const searches = await fetchUserSearches();
      setRecentSearches(searches.slice(0, 5)); // Mostrar apenas as 5 mais recentes
    } catch (error) {
      console.error('Erro ao carregar pesquisas recentes:', error);
    } finally {
      setLoadingSearches(false);
    }
  };

  const handleConsultarSearch = async (search: any) => {
    setCurrentSearch(search);
    await fetchArticlesForSearch(search.id);
  };

  const handleReutilizarSearch = (search: any) => {
    // Aqui poderíamos navegar para /search com os dados preenchidos
    // Por agora, apenas navegamos para a página de busca
    window.location.href = '/search';
  };
  const features = [
    {
      icon: Search,
      title: "Busca Automática",
      description: "Consulta simultânea em PubMed, Scopus e Web of Science via API"
    },
    {
      icon: Shield,
      title: "Deduplicação Inteligente",
      description: "Eliminação automática de duplicatas com fuzzy matching avançado"
    },
    {
      icon: BarChart3,
      title: "Machine Learning",
      description: "Triagem avançada com classificadores supervisionados"
    },
    {
      icon: FileText,
      title: "PRISMA 2020",
      description: "Geração automática de diagramas PRISMA completos"
    },
    {
      icon: Zap,
      title: "Métricas Precisas",
      description: "Precision, Recall, F1 Score e NNR calculados automaticamente"
    },
    {
      icon: Globe,
      title: "Padrões Internacionais",
      description: "Seguindo diretrizes PRISMA 2020 para reprodutibilidade científica"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImage} 
            alt="RevPRISMA - Ferramenta para Revisões Sistemáticas" 
            className="w-full h-full object-cover opacity-10"
          />
          <div className="absolute inset-0 bg-gradient-subtle/80"></div>
        </div>
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-scientific-navy mb-6">
            RevPRISMA
          </h1>
          <p className="text-xl md:text-2xl text-scientific-gray mb-8 max-w-3xl mx-auto">
            Ferramenta Automatizada para Revisões Sistemáticas e Geração de Diagramas PRISMA
          </p>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            Reduza o esforço manual, padronize processos e garanta reprodutibilidade científica 
            seguindo as diretrizes PRISMA 2020
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/search">
              <Button size="lg" className="bg-gradient-primary hover:shadow-glow transition-all duration-300">
                Começar Agora
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-scientific-navy mb-4">
            Funcionalidades Principais
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Um pipeline completo para revisões sistemáticas automatizadas
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="p-6 bg-card hover:shadow-scientific transition-all duration-200">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Recent Searches Section - Only show if user is logged in */}
      {user && (
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-scientific-navy mb-4">
              Pesquisas Recentes
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Suas últimas 5 pesquisas realizadas no sistema
            </p>
          </div>
          
          {loadingSearches ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Carregando pesquisas...</p>
            </div>
          ) : recentSearches.length > 0 ? (
            <div className="grid gap-4">
              {recentSearches.map((search, index) => (
                <Card key={search.id} className="p-6 bg-card hover:shadow-scientific transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {search.project_name}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {new Date(search.search_date).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{search.total_results} artigos encontrados</span>
                        <span>Bases: {search.databases_used?.join(', ')}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link to="/results">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleConsultarSearch(search)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Consultar
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleReutilizarSearch(search)}
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Reutilizar
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma pesquisa realizada ainda.</p>
              <Link to="/search">
                <Button className="mt-4">
                  Fazer Primeira Busca
                </Button>
              </Link>
            </div>
          )}
        </section>
      )}

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-primary">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-8">
            Pipeline Científico Completo
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-foreground mb-2">7</div>
              <div className="text-primary-foreground/80">Etapas Automatizadas</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-foreground mb-2">3</div>
              <div className="text-primary-foreground/80">Bases de Dados</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-foreground mb-2">100%</div>
              <div className="text-primary-foreground/80">PRISMA 2020</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;