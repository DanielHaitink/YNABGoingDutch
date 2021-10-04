/**
 * LocalStorage class for settings panel.
 * @constructor
 */
const YNABSettingsStorage = function () {
    let _autoSync = false;
    let _pat = "";
    let retrieved = false;

    /**
     * Check if the settings are retrieved from localStorage.
     * @return {boolean}
     */
    this.isRetrieved = () => retrieved;

    /**
     * Export settings to a string.
     */
    this.export = function () {

    };

    /**
     * Import settings from a string.
     */
    this.import = function () {

    };

    /**
     * Clear the pat in localStorage.
     */
    this.clearPat = () => {
        window.localStorage.removeItem("pat");
    }

    /**
     * Set the PAT in localstorage.
     * @param pat {string}
     */
    this.setPat = (pat) => {
        _pat = pat;
        window.localStorage.setItem("pat", _pat)
    };

    /**
     * Set auto syncing to localstorage.
     * @param bool {Boolean}
     */
    this.setAutoSync = (bool) => {
        _autoSync = bool;
        window.localStorage.setItem("auto-sync", _autoSync.toString())
    };

    /**
     * Obtain the pat from localstorage.
     * @return {string}
     */
    this.getPat = () => _pat;

    /**
     * Obtain auto sync setting from localstorage.
     * @return {boolean}
     */
    this.isAutoSync = () => _autoSync;

    const retrieveFromStorage = function () {
        if (window.localStorage.getItem("pat") !== null)
            _pat = window.localStorage.getItem("pat");
        if (window.localStorage.getItem("auto-sync") !== null)
            _autoSync = JSON.parse(window.localStorage.getItem("auto-sync").toLowerCase());

        retrieved = true;
    };

    const init = function () {
        retrieveFromStorage();
    };

    init();
}