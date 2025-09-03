import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRevPrismaAPI } from "@/hooks/useRevPrismaAPI";
import { CheckCircle, XCircle, Loader2, Activity } from "lucide-react";

interface APIConnectionTestProps {
  className?: string;
}

export function APIConnectionTest({ className }: APIConnectionTestProps) {
  const { checkHealth, loading, error, data } = useRevPrismaAPI();

  const handleTestConnection = async () => {
    await checkHealth();
  };

  const getStatusColor = () => {
    if (loading) return "bg-warning";
    if (error) return "bg-destructive";
    if (data) return "bg-success";
    return "bg-muted";
  };

  const getStatusIcon = () => {
    if (loading) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (error) return <XCircle className="h-4 w-4" />;
    if (data) return <CheckCircle className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (loading) return "Testando conexão...";
    if (error) return "Falha na conexão";
    if (data) return "Conectado";
    return "Não testado";
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Status da API RevPRISMA
        </CardTitle>
        <CardDescription>
          Teste a conexão com o backend Python
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${getStatusColor()} text-white`}>
              {getStatusIcon()}
              {getStatusText()}
            </Badge>
            {data && (
              <span className="text-sm text-muted-foreground">
                v{data.version}
              </span>
            )}
          </div>
          
          <Button 
            onClick={handleTestConnection} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testando...
              </>
            ) : (
              "Testar Conexão"
            )}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Erro de conexão:</strong> {error}
              <br />
              <span className="text-sm">
                Certifique-se de que a API está rodando em http://localhost:8000
              </span>
            </AlertDescription>
          </Alert>
        )}

        {data && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Conexão estabelecida!</strong> A API está funcionando corretamente.
              <br />
              <span className="text-sm">Status: {data.status}</span>
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <div>• URL da API: http://localhost:8000</div>
          <div>• Documentação: http://localhost:8000/docs</div>
          <div>• Para iniciar a API: <code className="bg-muted px-1 rounded">cd backend && ./start.sh</code></div>
        </div>
      </CardContent>
    </Card>
  );
}