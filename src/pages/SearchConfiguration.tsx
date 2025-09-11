import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, Plus, X, Database, Calendar, Filter, Mail, Key, Play, Loader2, CheckCircle } from "lucide-react";
import { APIConnectionTest } from "@/components/APIConnectionTest";
import { useRevPrismaAPI } from "@/hooks/useRevPrismaAPI";
import { SearchRequest } from "@/services/api";

const SearchConfiguration = () => {
  const { searchArticles, loading, currentProject, searchResults, error } = useRevPrismaAPI();
  
  const [config, setConfig] = useState({
    projectName: "",
    databases: ["pubmed"] as string[], // PubMed ativado por padrão
    queries: {
      pubmed: "artificial intelligence[Title/Abstract] AND education[Title/Abstract]",
      openalex: "",
      crossref: "",
      scopus: "",
      wos: ""
    },
    dateStart: "",
    dateEnd: "",
    email: "",
    filtersLanguage: [] as string[],
    filtersPubTypes: [] as string[]
  });

  const [includeKeywords, setIncludeKeywords] = useState<string[]>(["machine learning", "education", "AI"]);
  const [excludeKeywords, setExcludeKeywords] = useState<string[]>(["animal study", "veterinary"]);
  const [newIncludeKeyword, setNewIncludeKeyword] = useState("");
  const [newExcludeKeyword, setNewExcludeKeyword] = useState("");

  const handleDatabaseChange = (database: string, checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      databases: checked 
        ? [...prev.databases, database]
        : prev.databases.filter(db => db !== database)
    }));
  };

  const handleLanguageChange = (language: string, checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      filtersLanguage: checked
        ? [...prev.filtersLanguage, language]
        : prev.filtersLanguage.filter(lang => lang !== language)
    }));
  };

  const handlePubTypeChange = (pubType: string, checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      filtersPubTypes: checked
        ? [...prev.filtersPubTypes, pubType]
        : prev.filtersPubTypes.filter(type => type !== pubType)
    }));
  };

  const addIncludeKeyword = () => {
    if (newIncludeKeyword.trim()) {
      setIncludeKeywords([...includeKeywords, newIncludeKeyword.trim()]);
      setNewIncludeKeyword("");
    }
  };

  const addExcludeKeyword = () => {
    if (newExcludeKeyword.trim()) {
      setExcludeKeywords([...excludeKeywords, newExcludeKeyword.trim()]);
      setNewExcludeKeyword("");
    }
  };

  const removeIncludeKeyword = (index: number) => {
    setIncludeKeywords(includeKeywords.filter((_, i) => i !== index));
  };

  const removeExcludeKeyword = (index: number) => {
    setExcludeKeywords(excludeKeywords.filter((_, i) => i !== index));
  };

  const handleExecuteSearch = async () => {
    if (!config.projectName || config.databases.length === 0) {
      return;
    }

    // Validate email for PubMed
    if (config.databases.includes("pubmed") && (!config.email || !config.email.includes("@"))) {
      alert("Email válido é obrigatório para buscar no PubMed");
      return;
    }

    // Validate queries
    for (const db of config.databases) {
      const query = config.queries[db as keyof typeof config.queries];
      if (!query || !query.trim()) {
        alert(`Query para ${db} é obrigatória`);
        return;
      }
    }

    const searchRequest: SearchRequest = {
      project_name: config.projectName,
      databases: config.databases,
      queries: Object.fromEntries(
        config.databases.map(db => [db, config.queries[db as keyof typeof config.queries]])
      ),
      date_start: config.dateStart || undefined,
      date_end: config.dateEnd || undefined,
      filters_language: config.filtersLanguage,
      filters_pub_types_exclude: config.filtersPubTypes,
      email: config.email || undefined
    };

    await searchArticles(searchRequest);
  };

  const canExecuteSearch = config.projectName && config.databases.length > 0 && 
                          config.databases.some(db => config.queries[db as keyof typeof config.queries]);

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-scientific-navy">Configuração de Busca</h1>
          <p className="text-muted-foreground mt-1">
            Configure os parâmetros para sua revisão sistemática e execute a busca automática
          </p>
        </div>

        {/* API Connection Test */}
        <APIConnectionTest />

        {/* Search Results Alert */}
        {searchResults && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Busca concluída!</strong> Encontrados {searchResults.total_records} artigos.
              Projeto ID: {searchResults.project_id}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main Configuration */}
          <div className="lg:col-span-3 space-y-6">
            <Tabs defaultValue="project" className="w-full">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="project">Projeto</TabsTrigger>
                <TabsTrigger value="databases">Bases</TabsTrigger>
                <TabsTrigger value="queries">Queries</TabsTrigger>
                <TabsTrigger value="filters">Filtros</TabsTrigger>
              </TabsList>

              {/* Project Configuration */}
              <TabsContent value="project" className="space-y-6">
                <Card className="bg-gradient-subtle border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Search className="h-5 w-5" />
                      Informações do Projeto
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="project-name">Nome do Projeto *</Label>
                      <Input
                        id="project-name"
                        placeholder="Ex: Revisão IA em Educação"
                        value={config.projectName}
                        onChange={(e) => setConfig(prev => ({ ...prev, projectName: e.target.value }))}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="start-date">Data Início</Label>
                        <Input 
                          type="date" 
                          id="start-date"
                          value={config.dateStart}
                          onChange={(e) => setConfig(prev => ({ ...prev, dateStart: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="end-date">Data Fim</Label>
                        <Input 
                          type="date" 
                          id="end-date"
                          value={config.dateEnd}
                          onChange={(e) => setConfig(prev => ({ ...prev, dateEnd: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        E-mail (obrigatório para PubMed) *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={config.email}
                        onChange={(e) => setConfig(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Database Selection */}
              <TabsContent value="databases" className="space-y-6">
                {/* Open Access Sources */}
                <Card className="bg-gradient-subtle border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-green-600" />
                      Fontes Abertas (Gratuitas)
                    </CardTitle>
                    <CardDescription>
                      Bases de dados científicas com acesso livre e gratuito
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="pubmed" 
                            checked={config.databases.includes("pubmed")}
                            onCheckedChange={(checked) => handleDatabaseChange("pubmed", checked as boolean)}
                          />
                          <Label htmlFor="pubmed" className="flex items-center gap-2">
                            PubMed/MEDLINE
                            <Badge variant="secondary" className="text-xs">Medicina</Badge>
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground ml-6">
                          Base principal de literatura médica e biomédica
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="openalex"
                            checked={config.databases.includes("openalex")}
                            onCheckedChange={(checked) => handleDatabaseChange("openalex", checked as boolean)}
                          />
                          <Label htmlFor="openalex" className="flex items-center gap-2">
                            OpenAlex
                            <Badge variant="secondary" className="text-xs">Multidisciplinar</Badge>
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground ml-6">
                          Base ampla com 200M+ artigos de todas as áreas
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="crossref"
                            checked={config.databases.includes("crossref")}
                            onCheckedChange={(checked) => handleDatabaseChange("crossref", checked as boolean)}
                          />
                          <Label htmlFor="crossref" className="flex items-center gap-2">
                            Crossref
                            <Badge variant="secondary" className="text-xs">DOIs</Badge>
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground ml-6">
                          Registro oficial de DOIs e metadados de publicações
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Premium Sources */}
                <Card className="bg-gradient-subtle border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-amber-600" />
                      Bases Comerciais (Requer API Key)
                    </CardTitle>
                    <CardDescription>
                      Bases de dados premium que requerem chaves de API pagas
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="scopus"
                            checked={config.databases.includes("scopus")}
                            onCheckedChange={(checked) => handleDatabaseChange("scopus", checked as boolean)}
                          />
                          <Label htmlFor="scopus" className="flex items-center gap-2">
                            Scopus (Elsevier)
                            <Badge variant="outline" className="text-xs">API Key</Badge>
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground ml-6">
                          Base multidisciplinar com métricas de citação
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="wos"
                            checked={config.databases.includes("wos")}
                            onCheckedChange={(checked) => handleDatabaseChange("wos", checked as boolean)}
                          />
                          <Label htmlFor="wos" className="flex items-center gap-2">
                            Web of Science
                            <Badge variant="outline" className="text-xs">API Key</Badge>
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground ml-6">
                          Base premium com índice de citações e fator de impacto
                        </p>
                      </div>
                    </div>

                    {(config.databases.includes("scopus") || config.databases.includes("wos")) && (
                      <Alert>
                        <Key className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Configuração necessária:</strong> As chaves de API para Scopus e Web of Science devem ser configuradas nas variáveis de ambiente do servidor.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Query Configuration */}
              <TabsContent value="queries" className="space-y-6">
                <Card className="bg-gradient-subtle border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Search className="h-5 w-5" />
                      Queries de Busca
                    </CardTitle>
                    <CardDescription>
                      Configure as queries específicas para cada base de dados
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {config.databases.includes("pubmed") && (
                      <div>
                        <Label htmlFor="pubmed-query">Query PubMed/MEDLINE</Label>
                        <Textarea
                          id="pubmed-query"
                          placeholder='artificial intelligence[Title/Abstract] AND education[Title/Abstract]'
                          value={config.queries.pubmed}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            queries: { ...prev.queries, pubmed: e.target.value }
                          }))}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Exemplo simples: artificial intelligence[Title/Abstract] AND education[Title/Abstract]
                        </p>
                      </div>
                    )}

                    {config.databases.includes("openalex") && (
                      <div>
                        <Label htmlFor="openalex-query">Query OpenAlex</Label>
                        <Textarea
                          id="openalex-query"
                          placeholder='artificial intelligence AND education'
                          value={config.queries.openalex}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            queries: { ...prev.queries, openalex: e.target.value }
                          }))}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Busca em texto livre. Exemplo: artificial intelligence AND education
                        </p>
                      </div>
                    )}

                    {config.databases.includes("crossref") && (
                      <div>
                        <Label htmlFor="crossref-query">Query Crossref</Label>
                        <Textarea
                          id="crossref-query"
                          placeholder='artificial intelligence education'
                          value={config.queries.crossref}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            queries: { ...prev.queries, crossref: e.target.value }
                          }))}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Busca simples em texto. Exemplo: artificial intelligence education
                        </p>
                      </div>
                    )}

                    {config.databases.includes("scopus") && (
                      <div>
                        <Label htmlFor="scopus-query">Query Scopus</Label>
                        <Textarea
                          id="scopus-query"
                          placeholder='TITLE-ABS-KEY("artificial intelligence" AND education)'
                          value={config.queries.scopus}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            queries: { ...prev.queries, scopus: e.target.value }
                          }))}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Sintaxe Scopus. Exemplo: TITLE-ABS-KEY("artificial intelligence" AND education)  
                        </p>
                      </div>
                    )}

                    {config.databases.includes("wos") && (
                      <div>
                        <Label htmlFor="wos-query">Query Web of Science</Label>
                        <Textarea
                          id="wos-query"
                          placeholder='TS=("artificial intelligence" AND education)'
                          value={config.queries.wos}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            queries: { ...prev.queries, wos: e.target.value }
                          }))}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Sintaxe WoS. Exemplo: TS=("artificial intelligence" AND education)
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Filters */}
              <TabsContent value="filters" className="space-y-6">
                <Card className="bg-gradient-subtle border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Filter className="h-5 w-5" />
                      Filtros e Critérios
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Languages */}
                    <div>
                      <Label className="mb-3 block">Idiomas</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {["English", "Portuguese", "Spanish", "French"].map((lang) => (
                          <div key={lang} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`lang-${lang}`}
                              checked={config.filtersLanguage.includes(lang)}
                              onCheckedChange={(checked) => handleLanguageChange(lang, checked as boolean)}
                            />
                            <Label htmlFor={`lang-${lang}`} className="text-sm">{lang}</Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Publication Types to Exclude */}
                    <div>
                      <Label className="mb-3 block">Tipos de Publicação (Excluir)</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {["Comment", "Editorial", "Letter", "Review"].map((type) => (
                          <div key={type} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`pubtype-${type}`}
                              checked={config.filtersPubTypes.includes(type)}
                              onCheckedChange={(checked) => handlePubTypeChange(type, checked as boolean)}
                            />
                            <Label htmlFor={`pubtype-${type}`} className="text-sm">{type}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Keywords Configuration */}
            <Card className="bg-gradient-subtle border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Filter className="h-5 w-5" />
                  Palavras-chave
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Include Keywords */}
                <div>
                  <Label className="text-accent font-medium mb-2 block">Inclusão</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Adicionar..."
                      value={newIncludeKeyword}
                      onChange={(e) => setNewIncludeKeyword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addIncludeKeyword()}
                    />
                    <Button onClick={addIncludeKeyword} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {includeKeywords.map((keyword, index) => (
                      <Badge key={index} variant="secondary" className="bg-accent/10 text-accent text-xs">
                        {keyword}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 ml-1"
                          onClick={() => removeIncludeKeyword(index)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Exclude Keywords */}
                <div>
                  <Label className="text-destructive font-medium mb-2 block">Exclusão</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Adicionar..."
                      value={newExcludeKeyword}
                      onChange={(e) => setNewExcludeKeyword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addExcludeKeyword()}
                    />
                    <Button onClick={addExcludeKeyword} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {excludeKeywords.map((keyword, index) => (
                      <Badge key={index} variant="secondary" className="bg-destructive/10 text-destructive text-xs">
                        {keyword}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 ml-1"
                          onClick={() => removeExcludeKeyword(index)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                className="w-full bg-gradient-primary"
                onClick={handleExecuteSearch}
                disabled={!canExecuteSearch || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Executando Busca...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Executar Busca
                  </>
                )}
              </Button>
              
              {error && (
                <Alert variant="destructive">
                  <AlertDescription className="text-sm">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                <p className="font-medium mb-1">Status:</p>
                <p>✓ Projeto: {config.projectName ? "✅" : "⚠️"}</p>
                <p>✓ Bases: {config.databases.length > 0 ? "✅" : "⚠️"}</p>
                <p>✓ Email: {config.email ? "✅" : "⚠️"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchConfiguration;