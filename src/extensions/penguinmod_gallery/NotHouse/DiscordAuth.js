/* eslint-disable */
// Desktop fork (docs/EXTENSION-ROADMAP.md step 3): the PenguinMod gallery's NotHouse/DiscordAuth.js, moved into
// the VM as a built-in extension. The code is the gallery file unchanged.
// It runs inside a function that gives it the gallery's Scratch object (extension-support/desktop-gallery-extension.js)
// and hides the names a bundler would act on (require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename): they are undefined, as in the gallery's <script>.
module.exports = require('../../../extension-support/desktop-gallery-extension')(function (Scratch, require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename) {
// Discord Auth: lets players log in with their Discord account, using the game maker's own Discord
// application (Developer Portal, "Public Client" turned on). Nothing goes through anyone else's
// server: the game talks to Discord directly (OAuth2 code with PKCE, no secret) and keeps the
// player's details only in memory while it runs.
// Desktop apps (this editor and packaged desktop games): the login opens in the player's browser and
// comes back to an http://127.0.0.1 address on the player's PC. Web pages: the login opens in a popup
// that returns to a page on the game's own site. Setup and a privacy policy template: the
// extension's documentation page.
(function (Scratch) {
    'use strict';

    const AUTH_URL = 'https://discord.com/oauth2/authorize';
    const TOKEN_URL = 'https://discord.com/api/oauth2/token';
    const REVOKE_URL = 'https://discord.com/api/oauth2/token/revoke';
    const USER_URL = 'https://discord.com/api/v10/users/@me';
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
            link.style.color = '#5865F2';
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
                (primary ? 'background:#5865F2;color:#fff;border-color:#5865F2;' : 'background:#eee;color:#222;');
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
        const start = Date.now();
        const timer = setInterval(() => {
            let href = '';
            try {
                href = popup.location.href; // throws while the popup shows Discord's page
            } catch (e) { /* not back yet */ }
            if (href && href.startsWith(returnPage)) {
                clearInterval(timer);
                popup.close();
                resolve(href);
            } else if (popup.closed) {
                clearInterval(timer);
                reject(new Error('login window closed'));
            } else if (Date.now() - start > POPUP_TIMEOUT) {
                clearInterval(timer);
                popup.close();
                reject(new Error('timed out'));
            }
        }, 200);
    });

    class DiscordAuthExtension {
        constructor() {
            this.clientId = '';
            this.desktopReturn = 'http://127.0.0.1:53682/discord';
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
                id: 'discordauth',
                name: 'Discord Auth',
                color1: '#5865F2',
                color2: '#4752C4',
                color3: '#3C45A5',
                blocks: [
                    {
                        opcode: 'setClient',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'set client ID [ID]',
                        arguments: {
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: '' },
                        },
                    },
                    {
                        opcode: 'setDesktopReturn',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'set desktop app return address [URL]',
                        arguments: {
                            URL: { type: Scratch.ArgumentType.STRING, defaultValue: 'http://127.0.0.1:53682/discord' },
                        },
                    },
                    {
                        opcode: 'setWebReturn',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'set web page return page [URL]',
                        arguments: {
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
                        text: 'log in with Discord',
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
                            FIELD: { type: Scratch.ArgumentType.STRING, menu: 'fields', defaultValue: 'username' },
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
                            { text: 'username', value: 'username' },
                            { text: 'display name', value: 'displayName' },
                            { text: 'user ID', value: 'id' },
                            { text: 'avatar URL', value: 'avatar' },
                            { text: 'email', value: 'email' },
                        ],
                    },
                },
            };
        }

        setClient(args) {
            this.clientId = Scratch.Cast.toString(args.ID).trim();
        }

        setDesktopReturn(args) {
            this.desktopReturn = Scratch.Cast.toString(args.URL).trim();
        }

        setWebReturn(args) {
            this.webReturnPage = Scratch.Cast.toString(args.URL).trim();
        }

        setPrivacy(args) {
            this.privacyUrl = Scratch.Cast.toString(args.URL).trim();
        }

        setAskEmail(args) {
            this.askEmail = Scratch.Cast.toString(args.ON) === 'yes';
        }

        async login() {
            if (this.busy) return;
            this.busy = true;
            this.error = '';
            try {
                if (!this.clientId) throw new Error('no client ID set');
                const details = this.askEmail ? 'username, display name, avatar, user ID and email address' : 'username, display name, avatar and user ID';
                const verifier = randomString();
                const state = randomString();
                const desktop = desktopHelper();
                const returnAddress = desktop ? this.desktopReturn : this.webReturnPage;
                if (!isWebAddress(returnAddress)) throw new Error('no return address set');
                const params = new URLSearchParams({
                    client_id: this.clientId,
                    redirect_uri: returnAddress,
                    response_type: 'code',
                    scope: this.askEmail ? 'identify email' : 'identify',
                    code_challenge: base64url(await sha256(verifier)),
                    code_challenge_method: 'S256',
                    state,
                });
                const authUrl = `${AUTH_URL}?${params}`;

                let answer;
                let redirectUri = returnAddress;
                if (desktop) {
                    if (!await askPlayer('Discord', details, this.privacyUrl)) {
                        this.error = 'cancelled';
                        return;
                    }
                    const result = await desktop.loopback(authUrl);
                    if (result.error) throw new Error(result.error);
                    answer = new URLSearchParams(result.params || {});
                    redirectUri = result.redirectUri;
                } else {
                    let popup = null;
                    const go = await askPlayer('Discord', details, this.privacyUrl, () => {
                        popup = window.open(authUrl, 'discordLogin', 'width=500,height=750');
                    });
                    if (!go) {
                        this.error = 'cancelled';
                        return;
                    }
                    if (!popup) throw new Error('the browser blocked the login window');
                    answer = new URL(await waitForPopup(popup, returnAddress)).searchParams;
                }
                if (answer.get('error')) throw new Error(answer.get('error'));
                if (answer.get('state') !== state || !answer.get('code')) throw new Error('login answer did not match');

                const response = await fetch(TOKEN_URL, {
                    method: 'POST',
                    body: new URLSearchParams({
                        client_id: this.clientId,
                        grant_type: 'authorization_code',
                        code: answer.get('code'),
                        redirect_uri: redirectUri,
                        code_verifier: verifier,
                    }),
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok || !data.access_token) {
                    throw new Error(data.error_description || data.error || `Discord answered ${response.status}`);
                }
                const userResponse = await fetch(USER_URL, { headers: { Authorization: `Bearer ${data.access_token}` } });
                if (!userResponse.ok) throw new Error(`Discord answered ${userResponse.status}`);
                const info = await userResponse.json();
                this.token = data.access_token;
                this.user = {
                    username: info.username || '',
                    displayName: info.global_name || info.username || '',
                    id: info.id || '',
                    avatar: this.avatarUrl(info),
                    email: this.askEmail ? (info.email || '') : '',
                };
            } catch (e) {
                this.error = e && e.message ? e.message : String(e);
            } finally {
                this.busy = false;
            }
        }

        avatarUrl(info) {
            if (!info.id) return '';
            if (info.avatar) return `https://cdn.discordapp.com/avatars/${info.id}/${info.avatar}.png`;
            // Default avatar (accounts with the new username system).
            let index = 0;
            try {
                index = Number((BigInt(info.id) >> 22n) % 6n);
            } catch (e) { /* keep 0 */ }
            return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
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
            // Also ends the game's access at Discord (the player stays logged in to Discord itself).
            if (this.token) {
                fetch(REVOKE_URL, {
                    method: 'POST',
                    body: new URLSearchParams({
                        client_id: this.clientId,
                        token: this.token,
                        token_type_hint: 'access_token',
                    }),
                }).catch(() => {});
            }
            this.token = '';
            this.user = null;
            this.error = '';
        }
    }

    Scratch.extensions.register(new DiscordAuthExtension());
})(Scratch);
});
