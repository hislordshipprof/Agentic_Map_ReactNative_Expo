/**
 * Legacy Route Tab - redirects to /route-display
 *
 * Kept for backward compatibility. The route display is now a stack screen.
 */

import { Redirect } from 'expo-router';

export default function RouteRedirect() {
  return <Redirect href="/route-display" />;
}
