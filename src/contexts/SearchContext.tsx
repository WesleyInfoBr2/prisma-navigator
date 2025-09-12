import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export interface SearchResult {
  id: string;
  project_name: string;
  databases_used: string[];
  queries: any; // Using any to handle Supabase Json type
  total_results: number;
  results_by_database: any; // Using any to handle Supabase Json type
  search_date: string;
  status: string;
}

export interface Article {
  id: string;
  search_id: string;
  title: string;
  authors: string | null;
  journal: string | null;
  year: number | null;
  doi: string | null;
  abstract: string | null;
  ml_score: number | null;
  status: string;
  source_database: string;
}

interface SearchContextType {
  currentSearch: SearchResult | null;
  articles: Article[];
  loading: boolean;
  setCurrentSearch: (search: SearchResult | null) => void;
  setArticles: (articles: Article[]) => void;
  clearData: () => void;
  fetchUserSearches: () => Promise<SearchResult[]>;
  saveSearchResult: (searchData: Omit<SearchResult, 'id'>) => Promise<string | null>;
  fetchArticlesForSearch: (searchId: string) => Promise<Article[]>;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentSearch, setCurrentSearch] = useState<SearchResult | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const clearData = () => {
    setCurrentSearch(null);
    setArticles([]);
  };

  const fetchUserSearches = async (): Promise<SearchResult[]> => {
    if (!user) return [];
    
    setLoading(true);
    const { data, error } = await supabase
      .from('search_results')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setLoading(false);
    if (error) {
      console.error('Error fetching searches:', error);
      return [];
    }
    return data || [];
  };

  const saveSearchResult = async (searchData: Omit<SearchResult, 'id'>): Promise<string | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('search_results')
      .insert({
        project_name: searchData.project_name,
        databases_used: searchData.databases_used,
        queries: searchData.queries as any,
        total_results: searchData.total_results,
        results_by_database: searchData.results_by_database as any,
        search_date: searchData.search_date,
        status: searchData.status,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving search:', error);
      return null;
    }

    setCurrentSearch(data);
    return data.id;
  };

  const fetchArticlesForSearch = async (searchId: string): Promise<Article[]> => {
    setLoading(true);
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('search_id', searchId)
      .order('created_at', { ascending: false });

    setLoading(false);
    if (error) {
      console.error('Error fetching articles:', error);
      return [];
    }

    const fetchedArticles = data || [];
    setArticles(fetchedArticles);
    return fetchedArticles;
  };

  // Load most recent search when user logs in
  useEffect(() => {
    const loadMostRecentSearch = async () => {
      if (user && !currentSearch) {
        const searches = await fetchUserSearches();
        if (searches.length > 0) {
          const mostRecent = searches[0];
          setCurrentSearch(mostRecent);
          await fetchArticlesForSearch(mostRecent.id);
        }
      }
    };

    loadMostRecentSearch();
  }, [user]);

  const value = {
    currentSearch,
    articles,
    loading,
    setCurrentSearch,
    setArticles,
    clearData,
    fetchUserSearches,
    saveSearchResult,
    fetchArticlesForSearch,
  };

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};