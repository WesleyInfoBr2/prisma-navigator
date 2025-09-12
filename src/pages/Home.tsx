import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Search, BarChart3, FileText, Zap, Shield, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-scientific.jpg";

const Home = () => {
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
            <Link to="/auth">
              <Button size="lg" className="bg-gradient-primary hover:shadow-glow transition-all duration-300">
                Começar Agora
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to="/search">
              <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/5 backdrop-blur-sm">
                Configurar Busca
                <Search className="ml-2 w-5 h-5" />
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