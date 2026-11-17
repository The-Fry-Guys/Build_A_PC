import React, { createContext, useMemo, useState, type ReactNode } from 'react';
import type { Part } from '@/types/build';

/** Holds the user's in-progress component selection across catalog and build routes. */
export interface BuildState {
  selectedParts: Part[];
  buildName: string;
  setBuildName: (name: string) => void;
  addPart: (part: Part) => void;
  removePart: (partId: string) => void;
  clearBuild: () => void;
  getTotalPrice: () => number;
}

export const BuildContext = createContext<BuildState | null>(null);

/** Creates the state and actions shared by a build provider. */
export function useBuildState(): BuildState {
  const [selectedParts, setSelectedParts] = useState<Part[]>([]);
  const [buildName, setBuildName] = useState('My Custom PC');

  return useMemo(() => ({
    selectedParts,
    buildName,
    setBuildName,
    addPart: (part: Part) => setSelectedParts((previous) => [
      ...previous.filter((existing) => existing.category !== part.category),
      part,
    ]),
    removePart: (partId: string) => setSelectedParts((previous) => previous.filter((part) => part.part_id !== partId)),
    clearBuild: () => setSelectedParts([]),
    getTotalPrice: () => selectedParts.reduce((total, part) => total + (part.price ?? 0), 0),
  }), [selectedParts, buildName]);
}

/** Makes one active build available to every descendant route. */
export function BuildProvider({ children }: { children: ReactNode }) {
  const build = useBuildState();
  return <BuildContext.Provider value={build}>{children}</BuildContext.Provider>;
}
