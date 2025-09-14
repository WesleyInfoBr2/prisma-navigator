import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useSearch } from "@/contexts/SearchContext";
import { Navigate, Link } from "react-router-dom";
import { 
  Download, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  XCircle,
  ExternalLink,
  FileText
} from "lucide-react";
import { useState } from "react";

const Results = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
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
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Nenhum resultado encontrado</h2>
              <p className="text-muted-foreground mb-4">
                Realize uma busca primeiro para ver os resultados aqui.
              </p>
<Link to="/search">
  <Button className="bg-gradient-primary">Fazer Nova Busca</Button>
</Link>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    if (status === "incluido") {
      return <Badge className="bg-accent/10 text-accent border-accent/20">Incluído</Badge>;
    } else if (status === "excluido") {
      return <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20">Excluído</Badge>;
    } else {
      return <Badge variant="outline">Pendente</Badge>;
    }
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 0.8) return "text-accent";
    if (score >= 0.5) return "text-primary";
    return "text-destructive";
  };

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (article.authors && article.authors.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "todos" || article.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-scientific-navy">Resultados</h1>
            <p className="text-muted-foreground mt-1">
              {filteredArticles.length} de {articles.length} artigos • Projeto: {currentSearch.project_name}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="border-primary text-primary">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button variant="outline" className="border-accent text-accent">
              <Download className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-6 bg-gradient-subtle border-border/50">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por título, autor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="incluido">Incluídos</SelectItem>
                  <SelectItem value="excluido">Excluídos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" className="border-primary text-primary">
              <Filter className="w-4 h-4 mr-2" />
              Filtros Avançados
            </Button>
          </div>
        </Card>

        {/* Results Table */}
        <Card className="bg-gradient-subtle border-border/50">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título & Autores</TableHead>
                  <TableHead>Periódico</TableHead>
                  <TableHead>Ano</TableHead>
                  <TableHead>Score ML</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArticles.map((article) => (
                  <TableRow key={article.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-foreground leading-tight">
                          {article.title}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {article.authors || 'Autores não informados'}
                        </div>
                        {article.doi && (
                          <div className="text-xs text-muted-foreground">
                            DOI: {article.doi}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{article.journal || 'N/A'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{article.year || 'N/A'}</div>
                    </TableCell>
                    <TableCell>
                      <div className={`font-medium ${getScoreColor(article.ml_score)}`}>
                        {article.ml_score ? article.ml_score.toFixed(2) : 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(article.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Summary Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-subtle border-border/50 text-center">
            <FileText className="w-8 h-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">{articles.length}</div>
            <div className="text-sm text-muted-foreground">Total de Artigos</div>
          </Card>
          <Card className="p-4 bg-gradient-subtle border-border/50 text-center">
            <CheckCircle className="w-8 h-8 text-accent mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">
              {articles.filter(a => a.status === "incluido").length}
            </div>
            <div className="text-sm text-muted-foreground">Incluídos</div>
          </Card>
          <Card className="p-4 bg-gradient-subtle border-border/50 text-center">
            <XCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">
              {articles.filter(a => a.status === "excluido").length}
            </div>
            <div className="text-sm text-muted-foreground">Excluídos</div>
          </Card>
          <Card className="p-4 bg-gradient-subtle border-border/50 text-center">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-primary font-bold">%</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {articles.length > 0 ? ((articles.filter(a => a.status === "incluido").length / articles.length) * 100).toFixed(1) : '0.0'}%
            </div>
            <div className="text-sm text-muted-foreground">Taxa de Inclusão</div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Results;