import { Redirect, type Href } from 'expo-router';

/** Legacy tab URL now lands on the parts catalog. */
export default function ExploreRedirect() {
  return <Redirect href={'/parts' as Href} />;
}
