import React, { createContext, useMemo, useState, type ReactNode } from 'react';
import type { Part } from '@/types/build';

/** Holds the user's in-progress component selection across catalog and build routes. */
export interface BuildState {
  buildId: string | null;
  budget: number | null;
  selectedParts: Part[];
  buildName: string;
  setBuildId: (id: string | null) => void;
  setBudget: (budget: number | null) => void;
  setBuildName: (name: string) => void;
  loadBuild: (id: string, name: string, budget: number | null, parts: Part[]) => void;
  addPart: (part: Part) => void;
  removePart: (partId: string) => void;
  clearBuild: () => void;
  getTotalPrice: () => number;
}

export const BuildContext = createContext<BuildState | null>(null);

/** Creates the state and actions shared by a build provider. */
export function useBuildState(): BuildState {
  const [buildId, setBuildId] = useState<string | null>(null);
  const [budget, setBudget] = useState<number | null>(null);
  const [selectedParts, setSelectedParts] = useState<Part[]>([]);
  const [buildName, setBuildName] = useState('My Custom PC');

  return useMemo(() => ({
    buildId,
    budget,
    selectedParts,
    buildName,
    setBuildId,
    setBudget,
    setBuildName,
    loadBuild: (id: string, name: string, nextBudget: number | null, parts: Part[]) => {
      setBuildId(id);
      setBuildName(name);
      setBudget(nextBudget ?? null);
      setSelectedParts(parts);
    },
    addPart: (part: Part) => setSelectedParts((previous) => [
      ...previous.filter((existing) => existing.category !== part.category),
      part,
    ]),
    removePart: (partId: string) => setSelectedParts((previous) => previous.filter((part) => part.part_id !== partId)),
    clearBuild: () => { setBuildId(null); setBudget(null); setSelectedParts([]); setBuildName('My Custom PC'); },
    getTotalPrice: () => selectedParts.reduce((total, part) => total + (part.price ?? 0) * (part.quantity ?? 1), 0),
  }), [buildId, budget, selectedParts, buildName]);
}

/** Makes one active build available to every descendant route. */
export function BuildProvider({ children }: { children: ReactNode }) {
  const build = useBuildState();
  return <BuildContext.Provider value={build}>{children}</BuildContext.Provider>;
}
