import { useState } from 'react';
import { Part } from '@/types/build';
import { checkCompatibility } from '@/utils/compatibility';
import { BuildCompatibility } from '@/types/build';

export function useBuild() {
    const [selectedParts, setSelectedParts] = useState<Part[]>([]);
    const [buildName, setBuildName] = useState<string>('My Custom PC');

    const addPart = (part: Part) => {
        setSelectedParts((prev) => {
            const filtered = prev.filter((p) => p.category !== part.category);
            return [...filtered, part];
        });
    };

    const removePart = (partId: string) => {
        setSelectedParts((prev) => prev.filter((p) => p.part_id !== partId));
    };

    const clearBuild = () => {
        setSelectedParts([]);
    };

    const getTotalPrice = (): number => {
        return selectedParts.reduce((total, part) => total + part.price, 0);
    };

    const getCompatibility = (): BuildCompatibility => {
        return checkCompatibility(selectedParts);
    };

    return {
        selectedParts,
        buildName,
        setBuildName,
        addPart,
        removePart,
        clearBuild,
        getTotalPrice,
        getCompatibility,
    };
}