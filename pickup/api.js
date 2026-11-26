'use strict';
const pickupApi = (() => {
  let settings;
  let session;
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
      const result = await this.request('/auth/v1/token?grant_type=password', {email, password});
      if (result.user?.app_metadata?.pickup_captain !== true) throw new Error('A captain account is required.');
      session = result.access_token;
    },
  };
})();
