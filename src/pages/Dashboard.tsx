import MetricCard from "@/components/MetricCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Filter, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  Database,
  Brain,
  BarChart3,
  Download
} from "lucide-react";

const Dashboard = () => {
  // Mock data - em produção virá da API Python
  const metrics = [
    {
      title: "Artigos Coletados",
      value: "1,247",
      description: "Total de registros encontrados",
      icon: FileText,
      trend: { value: 12, isPositive: true }
    },
    {
      title: "Após Deduplicação",
      value: "892",
      description: "Registros únicos identificados",
      icon: Filter,
      trend: { value: 28, isPositive: false }
    },
    {
      title: "Incluídos",
      value: "156",
      description: "Artigos relevantes selecionados",
      icon: CheckCircle,
      trend: { value: 5, isPositive: true }
    },
    {
      title: "Excluídos",
      value: "736",
      description: "Artigos não relevantes",
      icon: XCircle
    }
  ];

  const qualityMetrics = [
    { label: "Precision", value: "0.902", color: "text-accent" },
    { label: "Recall", value: "0.925", color: "text-primary" },
    { label: "F1 Score", value: "0.913", color: "text-scientific-blue" },
    { label: "NNR", value: "1.11", color: "text-scientific-green" }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-scientific-navy">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Acompanhe o progresso da sua revisão sistemática
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="border-primary text-primary">
              <Download className="w-4 h-4 mr-2" />
              Exportar Dados
            </Button>
            <Button className="bg-gradient-primary">
              <BarChart3 className="w-4 h-4 mr-2" />
              Gerar PRISMA
            </Button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric, index) => (
            <MetricCard key={index} {...metric} />
          ))}
        </div>

        {/* Quality Metrics and Progress */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Quality Metrics */}
          <Card className="p-6 bg-gradient-subtle border-border/50">
            <div className="flex items-center mb-4">
              <TrendingUp className="w-5 h-5 text-primary mr-2" />
              <h3 className="text-lg font-semibold">Métricas de Qualidade</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {qualityMetrics.map((metric, index) => (
                <div key={index} className="text-center p-4 bg-background rounded-lg">
                  <div className={`text-2xl font-bold ${metric.color}`}>
                    {metric.value}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {metric.label}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Pipeline Status */}
          <Card className="p-6 bg-gradient-subtle border-border/50">
            <div className="flex items-center mb-4">
              <Database className="w-5 h-5 text-primary mr-2" />
              <h3 className="text-lg font-semibold">Status do Pipeline</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Busca Automática</span>
                <CheckCircle className="w-5 h-5 text-accent" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Deduplicação</span>
                <CheckCircle className="w-5 h-5 text-accent" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Triagem ML</span>
                <CheckCircle className="w-5 h-5 text-accent" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Análise de Qualidade</span>
                <CheckCircle className="w-5 h-5 text-accent" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Geração PRISMA</span>
                <div className="w-5 h-5 border-2 border-muted rounded-full animate-pulse" />
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="p-6 bg-gradient-subtle border-border/50">
          <div className="flex items-center mb-4">
            <Brain className="w-5 h-5 text-primary mr-2" />
            <h3 className="text-lg font-semibold">Atividade Recente</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span className="text-sm">Triagem ML executada com sucesso</span>
              </div>
              <span className="text-xs text-muted-foreground">há 2 min</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-sm">Deduplicação completada: 355 duplicatas removidas</span>
              </div>
              <span className="text-xs text-muted-foreground">há 5 min</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-scientific-blue rounded-full"></div>
                <span className="text-sm">Busca automática iniciada: 1.247 registros encontrados</span>
              </div>
              <span className="text-xs text-muted-foreground">há 12 min</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;