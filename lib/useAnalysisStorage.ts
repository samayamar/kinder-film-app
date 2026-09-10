"use client";

import { useState, useEffect } from "react";

interface AnalysisData {
  filmName: string;
  alter: number;
  scores: any;
  gesamtscore: number;
  ampel: string;
  begruendung: string;
  empfehlung: string;
  elternhinweise: string[];
  kritische_szenen?: any[];
  timestamp?: number;
}

export function useAnalysisStorage() {
  const STORAGE_KEY = "filmabend-kids-analyses";

  const saveAnalysis = (analysis: AnalysisData) => {
    try {
      const analyses = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const newAnalysis = {
        ...analysis,
        timestamp: Date.now(),
      };
      analyses.unshift(newAnalysis);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(analyses));
    } catch (e) {
      console.error("Save Error:", e);
    }
  };

  const getAnalyses = (): AnalysisData[] => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (e) {
      console.error("Get Error:", e);
      return [];
    }
  };

  const getAnalysis = (index: number): AnalysisData | null => {
    try {
      const analyses = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return analyses[index] || null;
    } catch (e) {
      console.error("Get Single Error:", e);
      return null;
    }
  };

  const deleteAnalysis = (index: string) => {
    try {
      const analyses = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      analyses.splice(parseInt(index), 1);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(analyses));
    } catch (e) {
      console.error("Delete Error:", e);
    }
  };

  return { saveAnalysis, getAnalyses, getAnalysis, deleteAnalysis };
}
