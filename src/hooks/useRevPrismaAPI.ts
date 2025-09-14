import { useState, useCallback } from 'react';
import { revPrismaAPI, APIError, SearchRequest, ScreeningRequest, MLScreeningRequest, PrismaRequest } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface APIState {
  loading: boolean;
  error: string | null;
  data: any;
}

interface ProjectState {
  currentProject: string | null;
  projects: any[];
  searchResults: any;
  deduplicationResults: any;
  screeningResults: any;
  metrics: any;
  prismaData: any;
}

export const useRevPrismaAPI = () => {
  const { toast } = useToast();
  
  const [apiState, setApiState] = useState<APIState>({
    loading: false,
    error: null,
    data: null,
  });

  const [projectState, setProjectState] = useState<ProjectState>({
    currentProject: null,
    projects: [],
    searchResults: null,
    deduplicationResults: null,
    screeningResults: null,
    metrics: null,
    prismaData: null,
  });

  const setLoading = useCallback((loading: boolean) => {
    setApiState(prev => ({ ...prev, loading, error: loading ? null : prev.error }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setApiState(prev => ({ ...prev, error, loading: false }));
  }, []);

  const setData = useCallback((data: any) => {
    setApiState(prev => ({ ...prev, data, loading: false, error: null }));
  }, []);

  const handleAPICall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    onSuccess?: (data: T) => void,
    successMessage?: string
  ): Promise<T | null> => {
    try {
      setLoading(true);
      console.log('Fazendo chamada para API:', 'https://prisma-navigator-production.up.railway.app');
      const result = await apiCall();
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      setData(result);
      
      if (successMessage) {
        toast({
          title: "Sucesso",
          description: successMessage,
        });
      }
      
      return result;
    } catch (error) {
      console.error('Erro na API:', error);
      let errorMessage = 'Erro inesperado na comunicação com a API';
      
      if (error instanceof APIError) {
        errorMessage = error.message;
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'API não está respondendo. Verifique se o deployment no Railway foi concluído com sucesso.';
      }
      
      setError(errorMessage);
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      
      return null;
    }
  }, [setLoading, setData, setError, toast]);

  // Health check
  const checkHealth = useCallback(() => {
    return handleAPICall(
      () => revPrismaAPI.healthCheck(),
      undefined,
      "API está funcionando corretamente"
    );
  }, [handleAPICall]);

  // Helper function to normalize PubMed query for other databases
  const normalizeQuery = useCallback((pubmedQuery: string): string => {
    return pubmedQuery
      // Remove PubMed field tags like [Title/Abstract], [Title], [MeSH Terms], etc.
      .replace(/\[[\w\/\s]+\]/g, '')
      // Clean up extra spaces and normalize boolean operators
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

  // Helper function to auto-generate queries for other databases
  const generateQueriesFromPubMed = useCallback((pubmedQuery: string, databases: string[]) => {
    const normalizedQuery = normalizeQuery(pubmedQuery);
    const queries: Record<string, string> = {};
    
    databases.forEach(db => {
      if (db === 'pubmed') {
        queries[db] = pubmedQuery;
      } else {
        // Use normalized query for other databases
        queries[db] = normalizedQuery;
      }
    });
    
    return queries;
  }, [normalizeQuery]);

  // Search articles with automatic fallback and query normalization
  const searchArticles = useCallback(async (request: SearchRequest) => {
    const originalRequest = { ...request };
    
    try {
      setLoading(true);
      
      // First, try to normalize queries if user hasn't filled them
      const updatedRequest = { ...request };
      
      // If PubMed is selected and has a query, auto-generate others if they're empty
      if (request.databases.includes('pubmed') && request.queries.pubmed) {
        const generatedQueries = generateQueriesFromPubMed(request.queries.pubmed, request.databases);
        
        // Only replace empty queries
        Object.keys(generatedQueries).forEach(db => {
          if (!request.queries[db] || request.queries[db].trim() === '') {
            updatedRequest.queries[db] = generatedQueries[db];
          }
        });
      }
      
      console.log('Executando busca com queries:', updatedRequest.queries);
      
      const result = await revPrismaAPI.searchArticles(updatedRequest);
      
      setProjectState(prev => ({
        ...prev,
        currentProject: result.project_id,
        searchResults: result,
      }));
      
      setData(result);
      
      toast({
        title: "Sucesso",
        description: `Busca concluída: ${request.project_name}. Encontrados ${result.total_records || 0} artigos.`,
      });
      
      return result;
      
    } catch (error) {
      console.error('Erro na busca inicial:', error);
      
      // Check if error is related to PubMed XML parsing
      const isXMLError = error instanceof APIError && 
        (error.message.includes('XML') || error.message.includes('not well-formed'));
      
      // Try fallback without PubMed if it was included and caused XML error
      if (isXMLError && originalRequest.databases.includes('pubmed') && originalRequest.databases.length > 1) {
        console.log('Tentando busca sem PubMed devido a erro XML...');
        
        try {
          const fallbackRequest = {
            ...originalRequest,
            databases: originalRequest.databases.filter(db => db !== 'pubmed'),
            queries: { ...originalRequest.queries }
          };
          
          // Remove PubMed query
          delete fallbackRequest.queries.pubmed;
          
          // Generate normalized queries for remaining databases if needed
          if (originalRequest.queries.pubmed) {
            const normalizedQueries = generateQueriesFromPubMed(originalRequest.queries.pubmed, fallbackRequest.databases);
            Object.keys(normalizedQueries).forEach(db => {
              if (!fallbackRequest.queries[db] || fallbackRequest.queries[db].trim() === '') {
                fallbackRequest.queries[db] = normalizedQueries[db];
              }
            });
          }
          
          console.log('Executando busca de fallback:', fallbackRequest);
          
          const fallbackResult = await revPrismaAPI.searchArticles(fallbackRequest);
          
          setProjectState(prev => ({
            ...prev,
            currentProject: fallbackResult.project_id,
            searchResults: fallbackResult,
          }));
          
          setData(fallbackResult);
          
          toast({
            title: "Busca Concluída com Fallback",
            description: `PubMed falhou (erro XML), mas encontramos ${fallbackResult.total_records || 0} artigos nas outras bases.`,
            variant: "default",
          });
          
          return fallbackResult;
          
        } catch (fallbackError) {
          console.error('Erro na busca de fallback:', fallbackError);
          throw fallbackError;
        }
      } else {
        throw error;
      }
    }
  }, [setLoading, setData, toast, generateQueriesFromPubMed]);

  // Deduplicate records
  const deduplicateRecords = useCallback((projectId: string, fuzzyThreshold: number = 95) => {
    return handleAPICall(
      () => revPrismaAPI.deduplicateRecords(projectId, fuzzyThreshold),
      (data) => {
        setProjectState(prev => ({
          ...prev,
          deduplicationResults: data,
        }));
      },
      "Deduplicação concluída com sucesso"
    );
  }, [handleAPICall]);

  // Simple screening
  const screenSimple = useCallback((projectId: string, screening: ScreeningRequest) => {
    return handleAPICall(
      () => revPrismaAPI.screenSimple(projectId, screening),
      (data) => {
        setProjectState(prev => ({
          ...prev,
          screeningResults: data,
        }));
      },
      "Triagem concluída com sucesso"
    );
  }, [handleAPICall]);

  // ML screening
  const screenML = useCallback((projectId: string, mlRequest: MLScreeningRequest) => {
    return handleAPICall(
      () => revPrismaAPI.screenML(projectId, mlRequest),
      (data) => {
        setProjectState(prev => ({
          ...prev,
          screeningResults: data,
        }));
      },
      "Triagem ML concluída com sucesso"
    );
  }, [handleAPICall]);

  // Get metrics
  const getMetrics = useCallback((projectId: string, labelsData?: Array<{ record_id: string; label: number }>) => {
    return handleAPICall(
      () => revPrismaAPI.getMetrics(projectId, labelsData),
      (data) => {
        setProjectState(prev => ({
          ...prev,
          metrics: data,
        }));
      },
      "Métricas calculadas com sucesso"
    );
  }, [handleAPICall]);

  // Generate PRISMA
  const generatePrisma = useCallback((projectId: string, prismaRequest?: PrismaRequest) => {
    return handleAPICall(
      () => revPrismaAPI.generatePrisma(projectId, prismaRequest),
      (data) => {
        setProjectState(prev => ({
          ...prev,
          prismaData: data,
        }));
      },
      "Diagrama PRISMA gerado com sucesso"
    );
  }, [handleAPICall]);

  // Export results
  const exportResults = useCallback(async (projectId: string, format: 'excel' | 'csv' = 'excel') => {
    try {
      setLoading(true);
      const blob = await revPrismaAPI.exportResults(projectId, format);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `results.${format === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setLoading(false);
      
      toast({
        title: "Sucesso",
        description: "Arquivo exportado com sucesso",
      });
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof APIError 
        ? error.message 
        : 'Erro ao exportar arquivo';
      
      setError(errorMessage);
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      
      return false;
    }
  }, [setLoading, setError, toast]);

  // Get project status
  const getProjectStatus = useCallback((projectId: string) => {
    return handleAPICall(
      () => revPrismaAPI.getProjectStatus(projectId),
      undefined,
      undefined // No success message for status checks
    );
  }, [handleAPICall]);

  // List projects
  const listProjects = useCallback(() => {
    return handleAPICall(
      () => revPrismaAPI.listProjects(),
      (data) => {
        setProjectState(prev => ({
          ...prev,
          projects: data.projects,
        }));
      }
    );
  }, [handleAPICall]);

  // Set current project
  const setCurrentProject = useCallback((projectId: string | null) => {
    setProjectState(prev => ({
      ...prev,
      currentProject: projectId,
    }));
  }, []);

  // Clear project data
  const clearProjectData = useCallback(() => {
    setProjectState({
      currentProject: null,
      projects: [],
      searchResults: null,
      deduplicationResults: null,
      screeningResults: null,
      metrics: null,
      prismaData: null,
    });
  }, []);

  return {
    // API State
    loading: apiState.loading,
    error: apiState.error,
    data: apiState.data,

    // Project State
    currentProject: projectState.currentProject,
    projects: projectState.projects,
    searchResults: projectState.searchResults,
    deduplicationResults: projectState.deduplicationResults,
    screeningResults: projectState.screeningResults,
    metrics: projectState.metrics,
    prismaData: projectState.prismaData,

    // API Methods
    checkHealth,
    searchArticles,
    deduplicateRecords,
    screenSimple,
    screenML,
    getMetrics,
    generatePrisma,
    exportResults,
    getProjectStatus,
    listProjects,

    // State Management
    setCurrentProject,
    clearProjectData,
  };
};