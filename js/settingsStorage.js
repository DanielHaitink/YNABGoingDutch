const YNABSettingsStorage = function () {
    let _autoSync = false;
    let _pat = "";
    let retrieved = false;

    this.isRetrieved = () => retrieved;

    this.export = function () {

    };

    this.import = function () {

    };

    this.setPat = (pat) => {
        _pat = pat;
        window.localStorage.setItem("pat", _pat)
    };

    this.setAutoSync = (bool) => {
        _autoSync = bool;
        window.localStorage.setItem("auto-sync", _autoSync.toString())
    };

    this.getPat = () => _pat;

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