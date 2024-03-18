import createAuth0Client from '@auth0/auth0-spa-js';

let auth0Client = null;

export async function initAuth() {
  auth0Client = await createAuth0Client({
    domain: 'tu-dominio.auth0.com',
    client_id: 'tu-id-de-cliente',
    audience: 'tu-id-de-audiencia',
    redirect_uri: window.location.origin,
  });
}

export function isAuthenticated() {
  return auth0Client.isAuthenticated();
}

export async function login() {
  await auth0Client.loginWithRedirect();
}

export async function logout() {
  await auth0Client.logout({
    returnTo: window.location.origin,
  });
}

export async function handleRedirectCallback() {
  await auth0Client.handleRedirectCallback();
}

export function getToken() {
  return auth0Client.getTokenSilently();
}
