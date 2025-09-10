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
      console.log('Fazendo chamada para API:', 'https://prisma-navigator.onrender.com');
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
        errorMessage = 'API não está respondendo. Verifique se o deployment no Render.com foi concluído com sucesso.';
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

  // Search articles
  const searchArticles = useCallback((request: SearchRequest) => {
    return handleAPICall(
      () => revPrismaAPI.searchArticles(request),
      (data) => {
        setProjectState(prev => ({
          ...prev,
          currentProject: data.project_id,
          searchResults: data,
        }));
      },
      `Busca concluída: ${request.project_name}`
    );
  }, [handleAPICall]);

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