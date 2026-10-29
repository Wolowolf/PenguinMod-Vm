/* eslint-disable */
// Desktop fork (docs/EXTENSION-ROADMAP.md step 3): the PenguinMod gallery's Ikelene/googleAuthExtension.js, moved into
// the VM as a built-in extension. The code is the gallery file unchanged except for section 154 (below).
// It runs inside a function that gives it the gallery's Scratch object (extension-support/desktop-gallery-extension.js)
// and hides the names a bundler would act on (require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename): they are undefined, as in the gallery's <script>.
// Desktop fork (section 154): random numbers and the clock come from the runtime: Math.random, Date.now,
// performance.now and new Date() are Scratch.vm.runtime.pmRandom / pmDateNow / pmPerfNow (new Date(pmDateNow())).
module.exports = require('../../../extension-support/desktop-gallery-extension')(function (Scratch, require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename) {
// Google Auth: lets players log in with their Google account, using the game maker's own Google
// login setup (Google Cloud "OAuth client"). Nothing goes through anyone else's server: the game
// talks to Google directly and keeps the player's details only in memory while it runs.
// Desktop apps (this editor and packaged desktop games): a "Desktop app" client, the login opens in
// the player's browser and comes back to http://127.0.0.1 on the player's PC (PKCE).
// Web pages: a "Web application" client, the login opens in a popup that returns to a page on the
// game's own site. Setup and a privacy policy template: the extension's documentation page.
(function (Scratch) {
    'use strict';

    const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
    const TOKEN_URL = 'https://oauth2.googleapis.com/token';
    const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
    const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
    const DESKTOP_REDIRECT = 'http://127.0.0.1/'; // the app picks a free port
    const POPUP_TIMEOUT = 5 * 60 * 1000;

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
        title.textContent = `Log in with ${service}`;
        const text = document.createElement('p');
        text.style.margin = '0 0 10px';
        text.textContent = `This game will open ${service}'s login page. If you log in, the game gets your ${details}.`;
        const privacy = document.createElement('p');
        privacy.style.margin = '0 0 16px';
        if (isWebAddress(privacyUrl)) {
            const link = document.createElement('a');
            link.href = privacyUrl;
            link.textContent = 'Read the game\'s privacy policy';
            link.style.color = '#1a5fd0';
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
                (primary ? 'background:#1a5fd0;color:#fff;border-color:#1a5fd0;' : 'background:#eee;color:#222;');
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
                href = popup.location.href; // throws while the popup shows Google's page
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

    class GoogleAuthExtension {
        constructor() {
            this.desktopClientId = '';
            this.desktopSecret = '';
            this.webClientId = '';
            this.webReturnPage = '';
            this.privacyUrl = '';
            this.askEmail = false;
            this.busy = false;
            this.token = '';
            this.user = null;
            this.error = '';
        }

        getInfo() {
            return {
                id: 'googleAuth',
                name: 'Google Auth',
                color1: '#4285F4',
                color2: '#357AE8',
                color3: '#2A56C6',
                blocks: [
                    {
                        opcode: 'setDesktop',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'set desktop app client ID [ID] secret [SECRET]',
                        arguments: {
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: '' },
                            SECRET: { type: Scratch.ArgumentType.STRING, defaultValue: '' },
                        },
                    },
                    {
                        opcode: 'setWeb',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'set web page client ID [ID] return page [PAGE]',
                        arguments: {
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: '' },
                            PAGE: { type: Scratch.ArgumentType.STRING, defaultValue: 'https://example.com/callback.html' },
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
                        text: 'log in with Google',
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
                    yesNo: { acceptReporters: false, items: ['yes', 'no'] },
                    fields: {
                        acceptReporters: true,
                        items: [
                            { text: 'name', value: 'name' },
                            { text: 'user ID', value: 'id' },
                            { text: 'picture URL', value: 'picture' },
                            { text: 'email', value: 'email' },
                        ],
                    },
                },
            };
        }

        setDesktop(args) {
            this.desktopClientId = Scratch.Cast.toString(args.ID).trim();
            this.desktopSecret = Scratch.Cast.toString(args.SECRET).trim();
        }

        setWeb(args) {
            this.webClientId = Scratch.Cast.toString(args.ID).trim();
            this.webReturnPage = Scratch.Cast.toString(args.PAGE).trim();
        }

        setPrivacy(args) {
            this.privacyUrl = Scratch.Cast.toString(args.URL).trim();
        }

        setAskEmail(args) {
            this.askEmail = Scratch.Cast.toString(args.ON) === 'yes';
        }

        scope() {
            return this.askEmail ? 'openid profile email' : 'openid profile';
        }

        async login() {
            if (this.busy) return;
            this.busy = true;
            this.error = '';
            try {
                const details = this.askEmail ? 'name, picture, account ID and email address' : 'name, picture and account ID';
                const token = desktopHelper() ? await this.loginDesktop(details) : await this.loginWeb(details);
                if (!token) return; // cancelled
                const response = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${token}` } });
                if (!response.ok) throw new Error(`Google answered ${response.status}`);
                const info = await response.json();
                this.token = token;
                this.user = {
                    name: info.name || '',
                    id: info.sub || '',
                    picture: info.picture || '',
                    email: this.askEmail ? (info.email || '') : '',
                };
            } catch (e) {
                this.error = e && e.message ? e.message : String(e);
            } finally {
                this.busy = false;
            }
        }

        async loginDesktop(details) {
            if (!this.desktopClientId) throw new Error('no desktop app client ID set');
            if (!await askPlayer('Google', details, this.privacyUrl)) {
                this.error = 'cancelled';
                return '';
            }
            const verifier = randomString();
            const state = randomString();
            const params = new URLSearchParams({
                client_id: this.desktopClientId,
                redirect_uri: DESKTOP_REDIRECT,
                response_type: 'code',
                scope: this.scope(),
                code_challenge: base64url(await sha256(verifier)),
                code_challenge_method: 'S256',
                state,
                prompt: 'select_account',
            });
            const result = await desktopHelper().loopback(`${AUTH_URL}?${params}`);
            if (result.error) throw new Error(result.error);
            const answer = result.params || {};
            if (answer.error) throw new Error(answer.error);
            if (answer.state !== state || !answer.code) throw new Error('login answer did not match');
            const body = new URLSearchParams({
                client_id: this.desktopClientId,
                code: answer.code,
                code_verifier: verifier,
                grant_type: 'authorization_code',
                redirect_uri: result.redirectUri,
            });
            if (this.desktopSecret) body.set('client_secret', this.desktopSecret);
            const response = await fetch(TOKEN_URL, { method: 'POST', body });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.access_token) {
                throw new Error(data.error_description || data.error || `Google answered ${response.status}`);
            }
            return data.access_token;
        }

        async loginWeb(details) {
            if (!this.webClientId) throw new Error('no web page client ID set');
            if (!isWebAddress(this.webReturnPage)) throw new Error('no return page set');
            const state = randomString();
            const params = new URLSearchParams({
                client_id: this.webClientId,
                redirect_uri: this.webReturnPage,
                response_type: 'token',
                scope: this.scope(),
                state,
                prompt: 'select_account',
            });
            let popup = null;
            const go = await askPlayer('Google', details, this.privacyUrl, () => {
                popup = window.open(`${AUTH_URL}?${params}`, 'googleLogin', 'width=500,height=650');
            });
            if (!go) {
                this.error = 'cancelled';
                return '';
            }
            if (!popup) throw new Error('the browser blocked the login window');
            const href = await waitForPopup(popup, this.webReturnPage);
            const answer = new URLSearchParams(new URL(href).hash.slice(1));
            if (answer.get('error')) throw new Error(answer.get('error'));
            if (answer.get('state') !== state || !answer.get('access_token')) throw new Error('login answer did not match');
            return answer.get('access_token');
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
            // Also ends the game's access at Google (the player's account stays logged in to Google itself).
            if (this.token) {
                fetch(REVOKE_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    body: new URLSearchParams({ token: this.token }),
                }).catch(() => {});
            }
            this.token = '';
            this.user = null;
            this.error = '';
        }
    }

    Scratch.extensions.register(new GoogleAuthExtension());
})(Scratch);
});
