// RevPRISMA API Client

const API_BASE_URL = 'https://prisma-navigator-production.up.railway.app/api';

export interface SearchRequest {
  project_name: string;
  databases: string[];
  queries: Record<string, string>;
  date_start?: string;
  date_end?: string;
  filters_language?: string[];
  filters_pub_types_exclude?: string[];
  email?: string;
  api_keys?: Record<string, string>;
}

export interface SearchResponse {
  project_id: string;
  total_records: number;
  records_by_database: Record<string, number>;
  records: any[];
  message: string;
}

export interface ScreeningRequest {
  records: any[];
  include_keywords: string[];
  exclude_keywords: string[];
  include_logic: string;
  exclude_logic: string;
}

export interface MLScreeningRequest {
  records: any[];
  labels_data: Array<{ record_id: string; label: number }>;
  threshold: number;
}

export interface ProjectStatus {
  project_id: string;
  project_name: string;
  has_raw_data: boolean;
  has_deduplicated: boolean;
  has_screened: boolean;
  raw_count: number;
  dedup_count: number;
  screened_count: number;
  included_count?: number;
  excluded_count?: number;
}

export interface PrismaRequest {
  records_counts: Record<string, number>;
  custom_inputs?: Record<string, any>;
}

class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new APIError(response.status, error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export const revPrismaAPI = {
  // Health check
  async healthCheck() {
    const url = 'https://prisma-navigator-production.up.railway.app/health';
    const response = await fetch(url);
    if (!response.ok) {
      throw new APIError(response.status, `HTTP ${response.status}`);
    }
    return response.json();
  },

  // Search articles
  async searchArticles(request: SearchRequest): Promise<SearchResponse> {
    return apiRequest<SearchResponse>('/search', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  // Deduplicate records
  async deduplicateRecords(projectId: string, fuzzyThreshold: number = 95) {
    return apiRequest(`/deduplicate/${projectId}?fuzzy_threshold=${fuzzyThreshold}`, {
      method: 'POST',
    });
  },

  // Simple screening
  async screenSimple(projectId: string, screening: ScreeningRequest) {
    return apiRequest(`/screen-simple/${projectId}`, {
      method: 'POST',
      body: JSON.stringify(screening),
    });
  },

  // ML screening
  async screenML(projectId: string, mlRequest: MLScreeningRequest) {
    return apiRequest(`/screen-ml/${projectId}`, {
      method: 'POST',
      body: JSON.stringify(mlRequest),
    });
  },

  // Get metrics
  async getMetrics(projectId: string, labelsData?: Array<{ record_id: string; label: number }>) {
    const params = labelsData ? `?labels_file_data=${JSON.stringify(labelsData)}` : '';
    return apiRequest(`/metrics/${projectId}${params}`);
  },

  // Generate PRISMA diagram
  async generatePrisma(projectId: string, prismaRequest?: PrismaRequest) {
    return apiRequest(`/prisma/${projectId}`, {
      method: 'POST',
      body: prismaRequest ? JSON.stringify(prismaRequest) : undefined,
    });
  },

  // Export results
  async exportResults(projectId: string, format: 'excel' | 'csv' = 'excel'): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/export/${projectId}?format=${format}`);
    
    if (!response.ok) {
      throw new APIError(response.status, 'Export failed');
    }
    
    return response.blob();
  },

  // Get project status
  async getProjectStatus(projectId: string): Promise<ProjectStatus> {
    return apiRequest<ProjectStatus>(`/projects/${projectId}/status`);
  },

  // List projects
  async listProjects() {
    return apiRequest<{ projects: Array<{ project_id: string; project_name: string; created_at: string; status: string }> }>('/projects');
  },
};

export { APIError };