const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(require.resolve('../pickup/api.js'), 'utf8');
const session = (access, refresh) => ({access_token: access, refresh_token: refresh,
    expires_in: 3600, user: {app_metadata: {pickup_captain: true}}});

test('organizer restores after reopening and sign out clears the saved session', async () => {
    const storage = new Map();
    const calls = [];
    const boot = () => vm.runInNewContext(`${source}\npickupApi`, {
        navigator: {}, AbortSignal,
        localStorage: {getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value),
            removeItem: key => storage.delete(key)},
        async fetch(url, options) {
            calls.push([url, options]);
            if (url === 'config.json') return Response.json({url: 'https://testproject.supabase.co', key: 'sb_publishable_test'});
            if (url.endsWith('grant_type=password')) return Response.json(session('first-token', 'first-refresh'));
            if (url.endsWith('grant_type=refresh_token')) {
                assert.equal(JSON.parse(options.body).refresh_token, 'first-refresh');
                return Response.json(session('second-token', 'second-refresh'));
            }
            if (url.endsWith('logout?scope=local')) return new Response(null, {status: 204});
            return Response.json([]);
        },
    });
    const first = boot();
    await first.configure();
    assert.equal(await first.restoreOrganizer(), false);
    await first.signIn('fixture@example.test', 'example-secret');
    assert.deepEqual([...storage.values()], ['first-refresh']);
    const reopened = boot();
    await reopened.configure();
    assert.equal(await reopened.restoreOrganizer(), true);
    await reopened.request('/rest/v1/pickup_departures');
    assert.equal(calls.at(-1)[1].headers.Authorization, 'Bearer second-token');
    await reopened.signOut();
    assert.equal(storage.size, 0);
    const afterSignOut = boot();
    await afterSignOut.configure();
    assert.equal(await afterSignOut.restoreOrganizer(), false);
});
