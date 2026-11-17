import { useContext } from 'react';
import { BuildContext, useBuildState } from '@/hooks/build-context';

/** Shares the active build across screens, with a local fallback for isolated consumers. */
export function useBuild() {
    const sharedBuild = useContext(BuildContext);
    const localBuild = useBuildState();
    return sharedBuild ?? localBuild;
}
