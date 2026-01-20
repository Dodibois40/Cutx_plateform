'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'cutx-recent-searches';
const MAX_RECENT = 5;

interface RecentSearch {
  query: string;
  timestamp: number;
}

export function useRecentSearches() {
  const [searches, setSearches] = useState<RecentSearch[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as RecentSearch[];
        // Filter out old searches (older than 7 days)
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const recent = parsed.filter((s) => s.timestamp > oneWeekAgo);
        setSearches(recent);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Add a new search to history
  const addRecent = useCallback((query: string) => {
    if (query.length < 2) return;

    const trimmedQuery = query.trim().toLowerCase();

    setSearches((prev) => {
      // Remove duplicate if exists
      const filtered = prev.filter(
        (s) => s.query.toLowerCase() !== trimmedQuery
      );

      // Add new search at the beginning
      const updated: RecentSearch[] = [
        { query: query.trim(), timestamp: Date.now() },
        ...filtered,
      ].slice(0, MAX_RECENT);

      // Persist to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore localStorage errors
      }

      return updated;
    });
  }, []);

  // Clear all recent searches
  const clearRecent = useCallback(() => {
    setSearches([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Remove a specific search
  const removeRecent = useCallback((query: string) => {
    setSearches((prev) => {
      const filtered = prev.filter(
        (s) => s.query.toLowerCase() !== query.toLowerCase()
      );

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      } catch {
        // Ignore localStorage errors
      }

      return filtered;
    });
  }, []);

  return {
    recentSearches: searches.map((s) => s.query),
    addRecent,
    clearRecent,
    removeRecent,
  };
}
