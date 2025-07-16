import React, { createContext, useContext, useState, useCallback } from 'react';

interface SearchContextType {
  searchTarget: {
    categoryId: number;
    transactionId: number;
  } | null;
  setSearchTarget: (target: { categoryId: number; transactionId: number } | null) => void;
  clearSearchTarget: () => void;
}

const SearchContext = createContext<SearchContextType>({
  searchTarget: null,
  setSearchTarget: () => {},
  clearSearchTarget: () => {},
});

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchTarget, setSearchTargetState] = useState<{
    categoryId: number;
    transactionId: number;
  } | null>(null);

  const setSearchTarget = useCallback((target: { categoryId: number; transactionId: number } | null) => {
    setSearchTargetState(target);
  }, []);

  const clearSearchTarget = useCallback(() => {
    setSearchTargetState(null);
  }, []);

  return (
    <SearchContext.Provider value={{ searchTarget, setSearchTarget, clearSearchTarget }}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};
