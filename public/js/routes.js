// Route guard. Pure function so it can be tested without a browser.
export const ROUTES = Object.freeze(['home', 'thankyou', 'auth', 'profile', 'play', 'board', 'journey', 'rules']);

// Reference behaviour (INFERRED from client source, VERIFIED that logged-out visitors see only the wrap):
//  - Once the wrap is live, Home is the public thank-you page, logged in or not, and /thankyou is always public.
//  - Everything else needs a logged-in account. Logged-out visitors are sent to the login screen.
//  - A logged-in account without a name is sent to the profile screen first.
export function resolveRoute(requested, { loggedIn, hasName, wrapActive }) {
  const route = ROUTES.includes(requested) ? requested : 'home';
  if (route === 'thankyou') return 'thankyou';
  if (route === 'home' && wrapActive) return 'home';
  if (!loggedIn) return 'auth';
  if (!hasName) return 'profile';
  if (route === 'auth') return 'home';
  return route;
}
