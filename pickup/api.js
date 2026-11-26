'use strict';
const pickupApi = (() => {
  let settings;
  let session;
  let expiry = 0;
  let refreshToken;
  let renewal;
  const storageKey = 'twt-pickup-organizer-refresh';

  function readToken() {
    try { return localStorage.getItem(storageKey); } catch { return null; }
  }

  function saveToken(value) {
    refreshToken = value;
    try {
      if (value) localStorage.setItem(storageKey, value);
      else localStorage.removeItem(storageKey);
    } catch {}
  }

  async function exchange(grant, body) {
    const response = await fetch(`${settings.url}/auth/v1/token?grant_type=${grant}`, {
      method: 'POST', headers: {apikey: settings.key, 'Content-Type': 'application/json'},
      body: JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(10000),
    });
    if (response.status === 400 || response.status === 401 || response.status === 403) return null;
    if (!response.ok) throw new Error('Organizer sign-in is temporarily unavailable. Try again shortly.');
    return response.json();
  }

  function accept(result) {
    if (result?.user?.app_metadata?.pickup_captain !== true ||
        typeof result.access_token !== 'string' || typeof result.refresh_token !== 'string') return false;
    session = result.access_token;
    expiry = Date.now() + Number(result.expires_in) * 1000;
    saveToken(result.refresh_token);
    return true;
  }

  function renew() {
    if (renewal) return renewal;
    const refresh = async () => {
      const token = readToken() || refreshToken;
      if (!token) return false;
      const result = await exchange('refresh_token', {refresh_token: token});
      if (accept(result)) return true;
      session = undefined;
      expiry = 0;
      saveToken(null);
      return false;
    };
    renewal = (navigator.locks ? navigator.locks.request(storageKey, refresh) : refresh())
      .finally(() => { renewal = null; });
    return renewal;
  }
  return {
    async configure() {
      const response = await fetch('config.json', {cache: 'no-store'});
      if (!response.ok) throw new Error('Pickup is not set up yet.');
      settings = await response.json();
      if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(settings.url) ||
          settings.url === 'https://vdxunrhcahgkwtzvjjdj.supabase.co' ||
          !/^sb_publishable_[\w-]+$/.test(settings.key)) throw new Error('Pickup is not set up yet.');
    },
    async request(path, body, method = body ? 'POST' : 'GET') {
      if (session && Date.now() + 45000 >= expiry && !await renew()) {
        throw new Error('Your organizer session ended. Sign in again.');
      }
      const headers = {apikey: settings.key, 'Content-Type': 'application/json'};
      if (session) headers.Authorization = 'Bearer ' + session;
      const response = await fetch(settings.url + path, {
        method, headers, cache: 'no-store', signal: AbortSignal.timeout(10000),
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) throw new Error('Could not complete the request. Check your details and try again.');
      const result = await response.text();
      return result ? JSON.parse(result) : null;
    },
    async signIn(email, password) {
      if (!accept(await exchange('password', {email, password}))) {
        throw new Error('Check your organizer email and password.');
      }
    },
    restoreOrganizer: renew,
    async signOut() {
      if (renewal) await renewal.catch(() => {});
      const token = session;
      session = undefined;
      expiry = 0;
      saveToken(null);
      if (!token) return;
      await fetch(`${settings.url}/auth/v1/logout?scope=local`, {
        method: 'POST', headers: {apikey: settings.key, Authorization: `Bearer ${token}`},
        signal: AbortSignal.timeout(5000),
      }).catch(() => {});
    },
  };
})();
