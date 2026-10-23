class UserData {
    constructor (runtime) {
        this._username = '';
        this._loggedIn = false;
        this.runtime = runtime;
    }

    /**
     * Handler for updating the username
     * @param {object} data Data posted to this ioDevice.
     * @property {!string} username The new username.
     */
    postData (data) {
        const usernameChanged = data.username !== this._username;
        this._username = data.username;
        this._loggedIn = false;
        if (data.loggedIn === true) {
            this._loggedIn = true;
        }
        // PMDESKTOP_HOOKS (section 119): tw runtime-options' "username changed"
        if (usernameChanged && this.runtime) {
            for (const hook of this.runtime.pmUsernameChangedHooks) hook();
        }
    }

    /**
     * Getter for username. Initially empty string, until set via postData.
     * @returns {!string} The current username
     */
    getUsername () {
        return this._username;
    }

    /**
     * Getter for loggedIn. Will be false, until set via postData.
     * @returns {boolean} The current loggedIn state
     */
    getLoggedIn() {
        return this._loggedIn;
    }
}

module.exports = UserData;
