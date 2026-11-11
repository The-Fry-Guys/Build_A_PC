import type { PropsWithChildren } from 'react';

/** Web owns its popup in the existing login component; iOS is outside this chunk. */
export default function GitHubProvider({ children }: PropsWithChildren) {
  return children;
}
