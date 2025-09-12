import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useSearch } from "@/contexts/SearchContext";
import { Navigate } from "react-router-dom";
import { 
  Download, 
  FileImage, 
  Settings, 
  RefreshCw,
  Database,
  Filter,
  CheckCircle,
  XCircle
} from "lucide-react";

const PrismaDiagram = () => {
  const { user } = useAuth();
  const { currentSearch, articles } = useSearch();

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // No search results message
  if (!currentSearch || articles.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center min-h-[60vh]">
            <Card className="p-8 bg-gradient-subtle border-border/50 text-center max-w-md">
              <Settings className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Diagrama PRISMA não disponível</h2>
              <p className="text-muted-foreground mb-4">
                Realize uma busca primeiro para gerar o diagrama PRISMA.
              </p>
              <Button asChild className="bg-gradient-primary">
                <a href="/search">Fazer Nova Busca</a>
              </Button>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Calculate real data from search results
  const totalResults = currentSearch.total_results;
  const afterDeduplication = articles.length;
  const duplicatesRemoved = Math.max(0, totalResults - afterDeduplication);
  const includedArticles = articles.filter(a => a.status === 'incluido').length;
  const excludedArticles = articles.filter(a => a.status === 'excluido').length;
  const pendingArticles = articles.filter(a => a.status === 'pending').length;
  
  // Get databases used from search
  const databasesUsed = currentSearch.databases_used || [];
  const resultsByDatabase = currentSearch.results_by_database || {};

  // Mock data for PRISMA flow - using real data where available
  const prismaData = {
    identification: {
      databases: databasesUsed.reduce((acc: any, db: string) => {
        acc[db] = resultsByDatabase[db] || 0;
        return acc;
      }, {}),
      total: totalResults
    },
    screening: {
      afterDuplication: afterDeduplication,
      duplicatesRemoved: duplicatesRemoved
    },
    eligibility: {
      fullTextAssessed: includedArticles + excludedArticles,
      excludedScreening: pendingArticles
    },
    included: {
      final: includedArticles,
      excludedFullText: excludedArticles,
      reasons: {
        wrongPopulation: Math.floor(excludedArticles * 0.4),
        wrongIntervention: Math.floor(excludedArticles * 0.3),
        wrongOutcome: Math.floor(excludedArticles * 0.2),
        studyDesign: Math.floor(excludedArticles * 0.1)
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-scientific-navy">Diagrama PRISMA 2020</h1>
            <p className="text-muted-foreground mt-1">
              Fluxograma da seleção de estudos para revisão sistemática
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="border-primary text-primary">
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            <Button className="bg-gradient-primary">
              <Download className="w-4 h-4 mr-2" />
              Baixar PNG
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* PRISMA Diagram */}
          <div className="lg:col-span-3">
            <Card className="p-6 bg-background border-border/50">
              <div className="space-y-6">
                {/* Identification Phase */}
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-scientific-navy mb-4">IDENTIFICAÇÃO</h3>
                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    {Object.entries(prismaData.identification.databases).map(([database, count]) => (
                      <Card key={database} className="p-4 bg-primary/5 border-primary/20">
                        <Database className="w-6 h-6 text-primary mx-auto mb-2" />
                        <div className="text-sm text-muted-foreground">{database}</div>
                        <div className="text-xl font-bold text-primary">{count as number}</div>
                      </Card>
                    ))}
                  </div>
                  <Card className="p-6 bg-gradient-primary text-primary-foreground">
                    <div className="text-sm opacity-90">Registros identificados através de buscas em bases de dados</div>
                    <div className="text-3xl font-bold mt-2">{prismaData.identification.total}</div>
                  </Card>
                </div>

                {/* Arrow Down */}
                <div className="flex justify-center">
                  <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary/60"></div>
                </div>

                {/* Screening Phase */}
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-scientific-navy mb-4">TRIAGEM</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card className="p-6 bg-gradient-accent text-accent-foreground">
                      <Filter className="w-6 h-6 mx-auto mb-2 opacity-90" />
                      <div className="text-sm opacity-90">Registros após deduplicação</div>
                      <div className="text-3xl font-bold mt-2">{prismaData.screening.afterDuplication}</div>
                    </Card>
                    <Card className="p-4 bg-muted border-destructive/20">
                      <XCircle className="w-6 h-6 text-destructive mx-auto mb-2" />
                      <div className="text-sm text-muted-foreground">Duplicatas removidas</div>
                      <div className="text-xl font-bold text-destructive">{prismaData.screening.duplicatesRemoved}</div>
                    </Card>
                  </div>
                </div>

                {/* Arrow Down */}
                <div className="flex justify-center">
                  <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[20px] border-l-transparent border-r-transparent border-t-accent/60"></div>
                </div>

                {/* Eligibility Phase */}
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-scientific-navy mb-4">ELEGIBILIDADE</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card className="p-6 bg-scientific-blue/10 border-scientific-blue/20">
                      <div className="text-sm text-muted-foreground">Artigos em texto completo avaliados</div>
                      <div className="text-3xl font-bold text-scientific-blue mt-2">{prismaData.eligibility.fullTextAssessed}</div>
                    </Card>
                    <Card className="p-4 bg-muted border-destructive/20">
                      <XCircle className="w-6 h-6 text-destructive mx-auto mb-2" />
                      <div className="text-sm text-muted-foreground">Excluídos na triagem</div>
                      <div className="text-xl font-bold text-destructive">{prismaData.eligibility.excludedScreening}</div>
                    </Card>
                  </div>
                </div>

                {/* Arrow Down */}
                <div className="flex justify-center">
                  <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[20px] border-l-transparent border-r-transparent border-t-scientific-blue/60"></div>
                </div>

                {/* Included Phase */}
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-scientific-navy mb-4">INCLUÍDOS</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card className="p-6 bg-gradient-accent text-accent-foreground">
                      <CheckCircle className="w-6 h-6 mx-auto mb-2 opacity-90" />
                      <div className="text-sm opacity-90">Estudos incluídos na síntese qualitativa</div>
                      <div className="text-3xl font-bold mt-2">{prismaData.included.final}</div>
                    </Card>
                    <Card className="p-4 bg-muted border-destructive/20">
                      <div className="text-sm text-muted-foreground mb-2">Excluídos texto completo</div>
                      <div className="text-xl font-bold text-destructive mb-3">{prismaData.included.excludedFullText}</div>
                      <div className="space-y-1 text-xs">
                        <div>• População incorreta: {prismaData.included.reasons.wrongPopulation}</div>
                        <div>• Intervenção incorreta: {prismaData.included.reasons.wrongIntervention}</div>
                        <div>• Desfecho incorreto: {prismaData.included.reasons.wrongOutcome}</div>
                        <div>• Desenho do estudo: {prismaData.included.reasons.studyDesign}</div>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar with Configuration */}
          <div className="space-y-6">
            {/* Manual Overrides */}
            <Card className="p-6 bg-gradient-subtle border-border/50">
              <div className="flex items-center mb-4">
                <Settings className="w-5 h-5 text-primary mr-2" />
                <h3 className="text-lg font-semibold">Ajustes Manuais</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="total-identified">Total Identificado</Label>
                  <Input 
                    id="total-identified" 
                    type="number" 
                    defaultValue={prismaData.identification.total}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="after-dedup">Após Deduplicação</Label>
                  <Input 
                    id="after-dedup" 
                    type="number" 
                    defaultValue={prismaData.screening.afterDuplication}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="full-text">Texto Completo</Label>
                  <Input 
                    id="full-text" 
                    type="number" 
                    defaultValue={prismaData.eligibility.fullTextAssessed}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="final-included">Incluídos Final</Label>
                  <Input 
                    id="final-included" 
                    type="number" 
                    defaultValue={prismaData.included.final}
                    className="mt-1"
                  />
                </div>
              </div>
            </Card>

            {/* Export Options */}
            <Card className="p-6 bg-gradient-subtle border-border/50">
              <h3 className="text-lg font-semibold mb-4">Opções de Exportação</h3>
              
              <div className="space-y-3">
                <Button variant="outline" className="w-full border-primary text-primary">
                  <FileImage className="w-4 h-4 mr-2" />
                  PNG (Alta Resolução)
                </Button>
                <Button variant="outline" className="w-full border-accent text-accent">
                  <FileImage className="w-4 h-4 mr-2" />
                  SVG (Vetorial)
                </Button>
                <Button variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              </div>
            </Card>

            {/* Statistics */}
            <Card className="p-6 bg-gradient-subtle border-border/50">
              <h3 className="text-lg font-semibold mb-4">Estatísticas</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Taxa de Deduplicação</span>
                  <Badge variant="secondary">
                    {((prismaData.screening.duplicatesRemoved / prismaData.identification.total) * 100).toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Taxa de Inclusão</span>
                  <Badge className="bg-accent/10 text-accent border-accent/20">
                    {((prismaData.included.final / prismaData.screening.afterDuplication) * 100).toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Precisão da Triagem</span>
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    {((prismaData.included.final / prismaData.eligibility.fullTextAssessed) * 100).toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrismaDiagram;