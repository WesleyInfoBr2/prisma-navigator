import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, X, Database, Calendar, Filter } from "lucide-react";
import { useState } from "react";

const SearchConfiguration = () => {
  const [includeKeywords, setIncludeKeywords] = useState<string[]>(["machine learning", "education", "AI"]);
  const [excludeKeywords, setExcludeKeywords] = useState<string[]>(["animal study", "veterinary"]);
  const [newIncludeKeyword, setNewIncludeKeyword] = useState("");
  const [newExcludeKeyword, setNewExcludeKeyword] = useState("");

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

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-scientific-navy">Configuração de Busca</h1>
          <p className="text-muted-foreground mt-1">
            Configure os parâmetros para sua revisão sistemática
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search Strategy */}
            <Card className="p-6 bg-gradient-subtle border-border/50">
              <div className="flex items-center mb-4">
                <Search className="w-5 h-5 text-primary mr-2" />
                <h3 className="text-lg font-semibold">Estratégia de Busca</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="research-question">Pergunta de Pesquisa</Label>
                  <Textarea 
                    id="research-question"
                    placeholder="Descreva sua pergunta de pesquisa..."
                    className="mt-1"
                  />
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-date">Data Início</Label>
                    <Input type="date" id="start-date" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="end-date">Data Fim</Label>
                    <Input type="date" id="end-date" className="mt-1" />
                  </div>
                </div>
              </div>
            </Card>

            {/* Keywords Configuration */}
            <Card className="p-6 bg-gradient-subtle border-border/50">
              <div className="flex items-center mb-4">
                <Filter className="w-5 h-5 text-primary mr-2" />
                <h3 className="text-lg font-semibold">Palavras-chave</h3>
              </div>
              
              <div className="space-y-6">
                {/* Include Keywords */}
                <div>
                  <Label className="text-accent font-medium">Palavras de Inclusão</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Adicionar palavra-chave..."
                      value={newIncludeKeyword}
                      onChange={(e) => setNewIncludeKeyword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addIncludeKeyword()}
                    />
                    <Button onClick={addIncludeKeyword} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {includeKeywords.map((keyword, index) => (
                      <Badge key={index} variant="secondary" className="bg-accent/10 text-accent">
                        {keyword}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 ml-2"
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
                  <Label className="text-destructive font-medium">Palavras de Exclusão</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Adicionar palavra de exclusão..."
                      value={newExcludeKeyword}
                      onChange={(e) => setNewExcludeKeyword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addExcludeKeyword()}
                    />
                    <Button onClick={addExcludeKeyword} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {excludeKeywords.map((keyword, index) => (
                      <Badge key={index} variant="secondary" className="bg-destructive/10 text-destructive">
                        {keyword}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 ml-2"
                          onClick={() => removeExcludeKeyword(index)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Logic Configuration */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Lógica de Inclusão</Label>
                    <Select defaultValue="any">
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Qualquer palavra (OR)</SelectItem>
                        <SelectItem value="all">Todas as palavras (AND)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Lógica de Exclusão</Label>
                    <Select defaultValue="any">
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Qualquer palavra (OR)</SelectItem>
                        <SelectItem value="all">Todas as palavras (AND)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Database Selection */}
            <Card className="p-6 bg-gradient-subtle border-border/50">
              <div className="flex items-center mb-4">
                <Database className="w-5 h-5 text-primary mr-2" />
                <h3 className="text-lg font-semibold">Bases de Dados</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox id="pubmed" defaultChecked />
                  <Label htmlFor="pubmed">PubMed</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="scopus" defaultChecked />
                  <Label htmlFor="scopus">Scopus</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="wos" defaultChecked />
                  <Label htmlFor="wos">Web of Science</Label>
                </div>
              </div>
            </Card>

            {/* Screening Mode */}
            <Card className="p-6 bg-gradient-subtle border-border/50">
              <h3 className="text-lg font-semibold mb-4">Modo de Triagem</h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox id="simple" defaultChecked />
                  <Label htmlFor="simple">Triagem Simples</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="ml" />
                  <Label htmlFor="ml">Triagem ML Avançada</Label>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  A triagem ML requer arquivo de labels para treinamento do modelo.
                </p>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button className="w-full bg-gradient-primary">
                <Search className="w-4 h-4 mr-2" />
                Iniciar Busca
              </Button>
              <Button variant="outline" className="w-full border-primary text-primary">
                Salvar Configuração
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchConfiguration;