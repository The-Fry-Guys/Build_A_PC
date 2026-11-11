import { useState } from 'react';
import { Part } from '@/types/build';
import { checkCompatibility } from '@/utils/compatibility';
import { BuildCompatibility } from '@/types/build';

/* Manages the local state for a user's PC build, allowing them to view parts and construct a pc to. */
export function useBuild() {
    const [selectedParts, setSelectedParts] = useState<Part[]>([]);
    const [buildName, setBuildName] = useState<string>('My Custom PC');

    /* Adds a selected part to the build.
     * If a part of the same category already exists, it is replaced to prevent invalid configurations. */
    const addPart = (part: Part) => {
        setSelectedParts((prev) => {
            const filtered = prev.filter((p) => p.category !== part.category);
            return [...filtered, part];
        });
    };

    /* Removes a specific part from the user's current build using its unique ID. */
    const removePart = (partId: string) => {
        setSelectedParts((prev) => prev.filter((p) => p.part_id !== partId));
    };

    /* Resets the builder by removing all currently selected parts. */
    const clearBuild = () => {
        setSelectedParts([]);
    };

    /* Calculates the combined price of all parts currently in the build array. */
    const getTotalPrice = (): number => {
        return selectedParts.reduce((total, part) => total + part.price, 0);
    };

    /* Evaluates the current parts to determine if they are compatible.
     * This directly satisfies the PRD-3 acceptance criterion to view whether their current parts are compatible or not, and which part causes incompatability. */
    const getCompatibility = (): BuildCompatibility => {
        return checkCompatibility(selectedParts);
    };

    /* Exposes the build state and modification functions to the client UI screens. */
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