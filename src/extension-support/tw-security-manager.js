/* eslint-disable no-unused-vars */

/**
 * Responsible for determining various policies related to custom extension security.
 * The default implementation prevents automatic extension loading, but grants any
 * loaded extensions the maximum possible capabilities so as to retain compatibility
 * with a vanilla scratch-vm. You may override properties of an instance of this class
 * to customize the security policies as you see fit, for example:
 * ```js
 * vm.securityManager.canFetch = (url) => {
 *   return url.startsWith('https://turbowarp.org/');
 * };
 * vm.securityManager.canOpenWindow = (url) => {
 *   return url.startsWith('https://turbowarp.org/');
 * };
 * vm.securityManager.canRedirect = (url) => {
 *   return url.startsWith('https://turbowarp.org/');
 * };
 * ```
 */
class SecurityManager {
    // Desktop fork: getSandboxMode, canLoadExtensionFromProject and rewriteExtensionURL are gone: no
    // extension loads from an address (only built-ins, incl. the gallery extensions moved into the VM).

    /**
     * Determine whether an extension is allowed to fetch a remote resource URL.
     * This only applies to unsandboxed extensions that use the appropriate Scratch.* APIs.
     * Sandboxed extensions ignore this entirely as there is no way to force them to use our APIs.
     * data: and blob: URLs are always allowed (this method is never called).
     * @param {string} resourceURL The URL to check
     * @returns {Promise<boolean>|boolean} -
     */
    canFetch (resourceURL) {
        // By default, allow any requests.
        return Promise.resolve(true);
    }

    /**
     * Determine whether an extension is allowed to open a new window or tab to a given URL.
     * This only applies to unsandboxed extensions. Sandboxed extensions are unable to open windows.
     * javascript: URLs are always rejected (this method is never called).
     * @param {string} websiteURL The URL to check
     * @returns {Promise<boolean>|boolean} -
     */
    canOpenWindow (websiteURL) {
        // By default, allow all.
        return Promise.resolve(true);
    }

    /**
     * Determine whether an extension is allowed to redirect the current tab to a given URL.
     * This only applies to unsandboxed extensions. Sandboxed extensions are unable to redirect the parent
     * window, but are free to redirect their own sandboxed window.
     * javascript: URLs are always rejected (this method is never called).
     * @param {string} websiteURL The url to check
     * @returns {Promise<boolean>|boolean} -
     */
    canRedirect (websiteURL) {
        // By default, allow all.
        return Promise.resolve(true);
    }

    /**
     * Determine whether an extension is allowed to record audio from the user's microphone.
     * This could include raw audio data or a transcriptions.
     * Note that, even if this returns true, success is not guaranteed.
     * @returns {Promise<boolean>|boolean} -
     */
    canRecordAudio () {
        return Promise.resolve(true);
    }

    /**
     * Determine whether an extension is allowed to record video from the user's camera.
     * Note that, even if this returns true, success is not guaranteed.
     * @returns {Promise<boolean>|boolean} -
     */
    canRecordVideo () {
        return Promise.resolve(true);
    }

    /**
     * Determine whether an extension is allowed to read values from the user's clipboard
     * without user interaction.
     * Note that, even if this returns true, success is not guaranteed.
     * @returns {Promise<boolean>|boolean} -
     */
    canReadClipboard () {
        return Promise.resolve(true);
    }

    /**
     * Determine whether an extension is allowed to show notifications.
     * Note that, even if this returns true, success is not guaranteed.
     * @returns {Promise<boolean>|boolean} -
     */
    canNotify () {
        return Promise.resolve(true);
    }

    /**
     * Determine whether an extension is allowed to find the user's precise location using GPS
     * and other techniques. Note that, even if this returns true, success is not guaranteed.
     * @returns {Promise<boolean>|boolean} -
     */
    canGeolocate () {
        return Promise.resolve(true);
    }

    /**
     * Determine whether an extension is allowed to embed content from a given URL.
     * @param {string} documentURL The URL of the embed.
     * @returns {Promise<boolean>|boolean} -
     */
    canEmbed (documentURL) {
        return Promise.resolve(true);
    }

    /**
     * pm: Used to prompt the user if they would like to unsandbox a feature in the extension.
     * @returns {Promise<boolean>|boolean} -
     */
    canUnsandbox() {
        return Promise.resolve(false);
    }

    /**
     * pm: Used to prompt the user if they would allow screenshotting the camera.
     * @returns {Promise<boolean>|boolean} -
     */
    canScreenshotCamera() {
        return Promise.resolve(true);
    }

    /**
     * Determine whether an extension is allowed to download a URL with a given name.
     * @param {string} resourceURL The URL to download
     * @param {string} name The name of the fileAdd commentMore actions
     * @returns {Promise<boolean>|boolean} -
     */
    canDownload (resourceURL, name) {
        return Promise.resolve(true);
    }
}

module.exports = SecurityManager;
