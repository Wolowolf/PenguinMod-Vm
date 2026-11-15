/* eslint-disable */
// Desktop fork (docs/EXTENSION-ROADMAP.md step 3): the PenguinMod gallery's Ikelene/googleAuthExtension.js, moved into
// the VM as a built-in extension. Section 154: random numbers and the clock come from the runtime (Math.random, Date.now,
// performance.now and new Date() are Scratch.vm.runtime.pmRandom / pmDateNow / pmPerfNow).
// Desktop fork (extension merges): Discord Auth (NotHouse/DiscordAuth.js) is merged in: one "Sign-in" extension whose
// blocks take the service (Google or Discord) from a menu. Each service keeps its own login flow from before.
// It runs inside a function that gives it the gallery's Scratch object (extension-support/desktop-gallery-extension.js)
// and hides the names a bundler would act on (require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename): they are undefined, as in the gallery's <script>.
module.exports = require('../../../extension-support/desktop-gallery-extension')(function (Scratch, require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename) {
// Sign-in: lets players log in with their Google or Discord account, using the game maker's own login setup
// (Google Cloud "OAuth client"; Discord Developer Portal application). Nothing goes through anyone else's server:
// the game talks to the service directly and keeps the player's details only in memory while it runs.
// Desktop apps (this editor and packaged desktop games): the login opens in the player's browser and comes back to
// an http://127.0.0.1 address on the player's PC (OAuth code with PKCE; Google: a "Desktop app" client, any free port;
// Discord: the fixed address registered with the application).
// Web pages: the login opens in a popup that returns to a page on the game's own site (Google: a "Web application"
// client). Setup and a privacy policy template: the extension's documentation page.
(function (Scratch) {
    'use strict';

    const POPUP_TIMEOUT = 5 * 60 * 1000;

    // Each service's addresses and the details it gives. web: 'token' = the access token comes back in the
    // return page's address (Google); 'code' = a code exchanged for the token like on desktop (Discord).
    const SERVICES = {
        google: {
            name: 'Google',
            color: '#1a5fd0',
            authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
            tokenUrl: 'https://oauth2.googleapis.com/token',
            userUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
            desktopReturn: 'http://127.0.0.1/', // the app picks a free port
            web: 'token',
            popup: 'width=500,height=650',
            scope: email => (email ? 'openid profile email' : 'openid profile'),
            extraParams: { prompt: 'select_account' },
            details: email => (email ? 'name, picture, account ID and email address' : 'name, picture and account ID'),
            user: (info, email) => ({
                name: info.name || '',
                username: '',
                id: info.sub || '',
                picture: info.picture || '',
                email: email ? (info.email || '') : '',
            }),
            revoke: token => fetch('https://oauth2.googleapis.com/revoke', {
                method: 'POST',
                mode: 'no-cors',
                body: new URLSearchParams({ token }),
            }),
        },
        discord: {
            name: 'Discord',
            color: '#5865F2',
            authUrl: 'https://discord.com/oauth2/authorize',
            tokenUrl: 'https://discord.com/api/oauth2/token',
            userUrl: 'https://discord.com/api/v10/users/@me',
            desktopReturn: 'http://127.0.0.1:53682/discord',
            web: 'code',
            popup: 'width=500,height=750',
            scope: email => (email ? 'identify email' : 'identify'),
            extraParams: {},
            details: email => (email ? 'username, display name, avatar, user ID and email address' : 'username, display name, avatar and user ID'),
            user: (info, email) => ({
                name: info.global_name || info.username || '',
                username: info.username || '',
                id: info.id || '',
                picture: discordAvatarUrl(info),
                email: email ? (info.email || '') : '',
            }),
            revoke: (token, clientId) => fetch('https://discord.com/api/oauth2/token/revoke', {
                method: 'POST',
                body: new URLSearchParams({ client_id: clientId, token, token_type_hint: 'access_token' }),
            }),
        },
    };

    const discordAvatarUrl = (info) => {
        if (!info.id) return '';
        if (info.avatar) return `https://cdn.discordapp.com/avatars/${info.id}/${info.avatar}.png`;
        // Default avatar (accounts with the new username system).
        let index = 0;
        try {
            index = Number((BigInt(info.id) >> 22n) % 6n);
        } catch (e) { /* keep 0 */ }
        return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
    };

    const base64url = (bytes) => btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const randomString = () => base64url(crypto.getRandomValues(new Uint8Array(32)));
    const sha256 = async (text) => new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
    const isWebAddress = (text) => /^https?:\/\//i.test(text);
    // Set by the PenguinMod desktop app and by desktop games made with its packager.
    const desktopHelper = () => (typeof window.PMLogin === 'object' && window.PMLogin &&
        typeof window.PMLogin.loopback === 'function') ? window.PMLogin : null;

    // Asks the player before the login window opens; shows the game's privacy policy link.
    // Resolves with true (Continue) or false (Cancel). onContinue runs inside the click, so a
    // popup opened there is not blocked by the browser.
    const askPlayer = (service, details, privacyUrl, onContinue) => new Promise((resolve) => {
        const parent = document.fullscreenElement || document.body;
        const backdrop = document.createElement('div');
        backdrop.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;' +
            'justify-content:center;background:rgba(0,0,0,0.55);font-family:sans-serif;';
        const box = document.createElement('div');
        box.style.cssText = 'max-width:360px;margin:16px;padding:20px;border-radius:8px;background:#fff;' +
            'color:#222;font-size:14px;line-height:1.4;box-shadow:0 4px 20px rgba(0,0,0,0.4);';
        const title = document.createElement('div');
        title.style.cssText = 'font-size:17px;font-weight:bold;margin-bottom:10px;';
        title.textContent = `Log in with ${service.name}`;
        const text = document.createElement('p');
        text.style.margin = '0 0 10px';
        text.textContent = `This game will open ${service.name}'s login page. If you log in, the game gets your ${details}.`;
        const privacy = document.createElement('p');
        privacy.style.margin = '0 0 16px';
        if (isWebAddress(privacyUrl)) {
            const link = document.createElement('a');
            link.href = privacyUrl;
            link.textContent = 'Read the game\'s privacy policy';
            link.style.color = service.color;
            link.addEventListener('click', (e) => {
                e.preventDefault();
                window.open(privacyUrl, '_blank');
            });
            privacy.appendChild(link);
        } else {
            privacy.textContent = 'This game has not given a privacy policy.';
        }
        const buttons = document.createElement('div');
        buttons.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';
        const makeButton = (label, primary) => {
            const b = document.createElement('button');
            b.textContent = label;
            b.style.cssText = 'padding:7px 14px;border-radius:5px;font-size:14px;cursor:pointer;border:1px solid #888;' +
                (primary ? `background:${service.color};color:#fff;border-color:${service.color};` : 'background:#eee;color:#222;');
            return b;
        };
        const cancel = makeButton('Cancel', false);
        const ok = makeButton('Continue', true);
        const close = (answer) => {
            backdrop.remove();
            resolve(answer);
        };
        cancel.addEventListener('click', () => close(false));
        ok.addEventListener('click', () => {
            if (onContinue) onContinue();
            close(true);
        });
        buttons.append(cancel, ok);
        box.append(title, text, privacy, buttons);
        backdrop.appendChild(box);
        parent.appendChild(backdrop);
        ok.focus();
    });

    // Waits until the popup is back on the game's own site and returns that address.
    const waitForPopup = (popup, returnPage) => new Promise((resolve, reject) => {
        const start = Scratch.vm.runtime.pmDateNow();
        const timer = setInterval(() => {
            let href = '';
            try {
                href = popup.location.href; // throws while the popup shows the service's page
            } catch (e) { /* not back yet */ }
            if (href && href.startsWith(returnPage)) {
                clearInterval(timer);
                popup.close();
                resolve(href);
            } else if (popup.closed) {
                clearInterval(timer);
                reject(new Error('login window closed'));
            } else if (Scratch.vm.runtime.pmDateNow() - start > POPUP_TIMEOUT) {
                clearInterval(timer);
                popup.close();
                reject(new Error('timed out'));
            }
        }, 200);
    });

    class SignIn {
        constructor() {
            // per service: client ID and return address for each platform, and a client secret
            this.settings = {};
            for (const key of Object.keys(SERVICES)) {
                this.settings[key] = {
                    clientId: { desktop: '', web: '' },
                    secret: '',
                    returnAddress: { desktop: '', web: '' },
                };
            }
            this.privacyUrl = '';
            this.askEmail = false;
            this.busy = false;
            this.service = ''; // the service the player is logged in with
            this.token = '';
            this.user = null;
            this.error = '';
        }

        getInfo() {
            return {
                id: 'googleAuth',
                name: 'Sign-in',
                color1: '#4F6BED',
                color2: '#4560D6',
                color3: '#3A51B8',
                blocks: [
                    {
                        opcode: 'setClientId',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'set [SERVICE] client ID for [PLATFORM] to [ID]',
                        arguments: {
                            SERVICE: { type: Scratch.ArgumentType.STRING, menu: 'services', defaultValue: 'google' },
                            PLATFORM: { type: Scratch.ArgumentType.STRING, menu: 'platforms', defaultValue: 'desktop' },
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: '' },
                        },
                    },
                    {
                        opcode: 'setSecret',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'set [SERVICE] client secret to [SECRET]',
                        arguments: {
                            SERVICE: { type: Scratch.ArgumentType.STRING, menu: 'services', defaultValue: 'google' },
                            SECRET: { type: Scratch.ArgumentType.STRING, defaultValue: '' },
                        },
                    },
                    {
                        opcode: 'setReturnAddress',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'set [SERVICE] return address for [PLATFORM] to [URL]',
                        arguments: {
                            SERVICE: { type: Scratch.ArgumentType.STRING, menu: 'services', defaultValue: 'google' },
                            PLATFORM: { type: Scratch.ArgumentType.STRING, menu: 'platforms', defaultValue: 'web' },
                            URL: { type: Scratch.ArgumentType.STRING, defaultValue: 'https://example.com/callback.html' },
                        },
                    },
                    {
                        opcode: 'setPrivacy',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'set privacy policy address to [URL]',
                        arguments: {
                            URL: { type: Scratch.ArgumentType.STRING, defaultValue: 'https://example.com/privacy.html' },
                        },
                    },
                    {
                        opcode: 'setAskEmail',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'also ask for email address [ON]',
                        arguments: {
                            ON: { type: Scratch.ArgumentType.STRING, menu: 'yesNo', defaultValue: 'no' },
                        },
                    },
                    '---',
                    {
                        opcode: 'login',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'log in with [SERVICE]',
                        arguments: {
                            SERVICE: { type: Scratch.ArgumentType.STRING, menu: 'services', defaultValue: 'google' },
                        },
                    },
                    {
                        opcode: 'isLoggedIn',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'logged in?',
                    },
                    {
                        opcode: 'getUser',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'user [FIELD]',
                        arguments: {
                            FIELD: { type: Scratch.ArgumentType.STRING, menu: 'fields', defaultValue: 'name' },
                        },
                    },
                    {
                        opcode: 'getError',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'last login error',
                    },
                    {
                        opcode: 'logout',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'log out',
                    },
                ],
                menus: {
                    services: {
                        acceptReporters: false /* Desktop fork (section 265): only its own items work */,
                        items: [
                            { text: 'Google', value: 'google' },
                            { text: 'Discord', value: 'discord' },
                        ],
                    },
                    platforms: {
                        acceptReporters: false /* Desktop fork (section 265): only its own items work */,
                        items: [
                            { text: 'desktop app', value: 'desktop' },
                            { text: 'web page', value: 'web' },
                        ],
                    },
                    yesNo: { acceptReporters: false, items: ['yes', 'no'] },
                    fields: {
                        acceptReporters: false /* Desktop fork (section 265): only its own items work */,
                        items: [
                            { text: 'name', value: 'name' },
                            { text: 'username', value: 'username' },
                            { text: 'user ID', value: 'id' },
                            { text: 'picture URL', value: 'picture' },
                            { text: 'email', value: 'email' },
                            { text: 'service', value: 'service' },
                        ],
                    },
                },
            };
        }

        // the settings of a service from a menu value (also its shown name, any case), or null
        _settings(value) {
            const key = this._serviceKey(value);
            return key ? this.settings[key] : null;
        }

        _serviceKey(value) {
            const text = Scratch.Cast.toString(value).trim().toLowerCase();
            return Object.prototype.hasOwnProperty.call(SERVICES, text) ? text : '';
        }

        _platform(value) {
            const text = Scratch.Cast.toString(value).trim().toLowerCase();
            if (text === 'desktop' || text === 'desktop app') return 'desktop';
            if (text === 'web' || text === 'web page') return 'web';
            return '';
        }

        setClientId(args) {
            const settings = this._settings(args.SERVICE);
            const platform = this._platform(args.PLATFORM);
            if (settings && platform) settings.clientId[platform] = Scratch.Cast.toString(args.ID).trim();
        }

        setSecret(args) {
            const settings = this._settings(args.SERVICE);
            if (settings) settings.secret = Scratch.Cast.toString(args.SECRET).trim();
        }

        setReturnAddress(args) {
            const settings = this._settings(args.SERVICE);
            const platform = this._platform(args.PLATFORM);
            if (settings && platform) settings.returnAddress[platform] = Scratch.Cast.toString(args.URL).trim();
        }

        setPrivacy(args) {
            this.privacyUrl = Scratch.Cast.toString(args.URL).trim();
        }

        setAskEmail(args) {
            this.askEmail = Scratch.Cast.toString(args.ON) === 'yes';
        }

        async login(args) {
            const key = this._serviceKey(args.SERVICE);
            if (this.busy) return;
            if (!key) {
                this.error = 'unknown service';
                return;
            }
            this.busy = true;
            this.error = '';
            try {
                const service = SERVICES[key];
                const settings = this.settings[key];
                const platform = desktopHelper() ? 'desktop' : 'web';
                // Discord uses one application for both; Google needs a client of each type
                const clientId = settings.clientId[platform] ||
                    (key === 'discord' ? settings.clientId[platform === 'desktop' ? 'web' : 'desktop'] : '');
                if (!clientId) throw new Error(`no ${platform === 'desktop' ? 'desktop app' : 'web page'} client ID set`);
                const returnAddress = settings.returnAddress[platform] || (platform === 'desktop' ? service.desktopReturn : '');
                if (!isWebAddress(returnAddress)) throw new Error('no return address set');
                const details = service.details(this.askEmail);
                const state = randomString();
                const verifier = randomString();
                const codeFlow = platform === 'desktop' || service.web === 'code';
                const params = new URLSearchParams({
                    client_id: clientId,
                    redirect_uri: returnAddress,
                    response_type: codeFlow ? 'code' : 'token',
                    scope: service.scope(this.askEmail),
                    state,
                    ...service.extraParams,
                });
                if (codeFlow) {
                    params.set('code_challenge', base64url(await sha256(verifier)));
                    params.set('code_challenge_method', 'S256');
                }
                const authUrl = `${service.authUrl}?${params}`;

                let answer;
                let redirectUri = returnAddress;
                if (platform === 'desktop') {
                    if (!await askPlayer(service, details, this.privacyUrl)) {
                        this.error = 'cancelled';
                        return;
                    }
                    const result = await desktopHelper().loopback(authUrl);
                    if (result.error) throw new Error(result.error);
                    answer = new URLSearchParams(result.params || {});
                    redirectUri = result.redirectUri;
                } else {
                    let popup = null;
                    const go = await askPlayer(service, details, this.privacyUrl, () => {
                        popup = window.open(authUrl, `${key}Login`, service.popup);
                    });
                    if (!go) {
                        this.error = 'cancelled';
                        return;
                    }
                    if (!popup) throw new Error('the browser blocked the login window');
                    const back = new URL(await waitForPopup(popup, returnAddress));
                    answer = codeFlow ? back.searchParams : new URLSearchParams(back.hash.slice(1));
                }
                if (answer.get('error')) throw new Error(answer.get('error'));

                let token;
                if (codeFlow) {
                    if (answer.get('state') !== state || !answer.get('code')) throw new Error('login answer did not match');
                    const body = new URLSearchParams({
                        client_id: clientId,
                        grant_type: 'authorization_code',
                        code: answer.get('code'),
                        redirect_uri: redirectUri,
                        code_verifier: verifier,
                    });
                    if (platform === 'desktop' && settings.secret) body.set('client_secret', settings.secret);
                    const response = await fetch(service.tokenUrl, { method: 'POST', body });
                    const data = await response.json().catch(() => ({}));
                    if (!response.ok || !data.access_token) {
                        throw new Error(data.error_description || data.error || `${service.name} answered ${response.status}`);
                    }
                    token = data.access_token;
                } else {
                    if (answer.get('state') !== state || !answer.get('access_token')) throw new Error('login answer did not match');
                    token = answer.get('access_token');
                }

                const userResponse = await fetch(service.userUrl, { headers: { Authorization: `Bearer ${token}` } });
                if (!userResponse.ok) throw new Error(`${service.name} answered ${userResponse.status}`);
                const info = await userResponse.json();
                // logging in with another service (or again) ends the game's access with the previous login
                this._revoke();
                this.service = key;
                this.token = token;
                this.user = Object.assign(service.user(info, this.askEmail), { service: service.name });
            } catch (e) {
                this.error = e && e.message ? e.message : String(e);
            } finally {
                this.busy = false;
            }
        }

        _revoke() {
            if (!this.token || !this.service) return;
            const settings = this.settings[this.service];
            const clientId = settings.clientId.desktop || settings.clientId.web;
            SERVICES[this.service].revoke(this.token, clientId).catch(() => {});
        }

        isLoggedIn() {
            return !!this.user;
        }

        getUser(args) {
            if (!this.user) return '';
            const field = Scratch.Cast.toString(args.FIELD);
            return Object.prototype.hasOwnProperty.call(this.user, field) ? this.user[field] : '';
        }

        getError() {
            return this.error;
        }

        logout() {
            // Also ends the game's access at the service (the player stays logged in to the service itself).
            this._revoke();
            this.service = '';
            this.token = '';
            this.user = null;
            this.error = '';
        }
    }

    Scratch.extensions.register(new SignIn());
})(Scratch);
});
