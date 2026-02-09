/**
 * Root Index - Initial Routing
 *
 * Always redirects to the animated splash screen on cold start.
 * Splash handles the animation, then routes to the appropriate destination.
 */

import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/splash" />;
}
