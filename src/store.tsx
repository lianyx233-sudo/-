import React, { createContext, useContext, useState } from 'react';

export interface IPWork {
  id: string;
  type: string;
  prompt: string;
  imageUrl: string;
  threeViewUrl: string;
  createdAt: number;
}

export interface Inspiration {
  id: string;
  title: string;
  tags: string[];
}

interface AppState {
  inspirations: Inspiration[];
  addInspiration: (insp: Inspiration) => void;
  works: IPWork[];
  addWork: (work: IPWork) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [inspirations, setInspirations] = useState<Inspiration[]>([]);
  const [works, setWorks] = useState<IPWork[]>([]);

  const addInspiration = (insp: Inspiration) => {
    if (!inspirations.find((i) => i.id === insp.id)) {
      setInspirations([...inspirations, insp]);
    }
  };

  const addWork = (work: IPWork) => {
    setWorks([work, ...works]);
  };

  return (
    <AppContext.Provider value={{ inspirations, addInspiration, works, addWork }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
}
