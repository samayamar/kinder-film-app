"use client";

import { useCallback } from "react";

interface AnalysisResult {
  filmName: string;
  alter: number;
  [key: string]: any;
}

interface StoredAnalysis extends AnalysisResult {
  id: string;
  savedAt: string;
  isFavorite: boolean;
}

export function useAnalysisStorage() {
  const saveAnalysis = useCallback((analysis: AnalysisResult) => {
    const analyses = getAnalyses();
    const newAnalysis: StoredAnalysis = {
      ...analysis,
      id: Date.now().toString(),
      savedAt: new Date().toISOString(),
      isFavorite: false,
    };
    analyses.push(newAnalysis);
    localStorage.setItem("filmabend-kids-analyses", JSON.stringify(analyses));
  }, []);

  const getAnalyses = useCallback(() => {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem("filmabend-kids-analyses");
    return data ? JSON.parse(data) : [];
  }, []);

  const deleteAnalysis = useCallback((id: string) => {
    const analyses = getAnalyses().filter((a: StoredAnalysis) => a.id !== id);
    localStorage.setItem("filmabend-kids-analyses", JSON.stringify(analyses));
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    const analyses = getAnalyses().map((a: StoredAnalysis) =>
      a.id === id ? { ...a, isFavorite: !a.isFavorite } : a
    );
    localStorage.setItem("filmabend-kids-analyses", JSON.stringify(analyses));
  }, []);

  return { saveAnalysis, getAnalyses, deleteAnalysis, toggleFavorite };
}
