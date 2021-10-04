/**
 * A mapping, which maps the bank CSVs to the YNAB format.
 * @param file {string} The file containing the JSON mapping.
 * @param onComplete {Function} The function that is called when the mapping is loaded.
 * @constructor
 */
const BankMap = function (file, onComplete) {
    let _mapping = null;
    const defaultFile = "banks.json";

    const loadJsonFile = () => {
        const rawFile = new XMLHttpRequest();

        rawFile.overrideMimeType("application/json");
        rawFile.open("GET", file, true);

        rawFile.onreadystatechange = function () {
            if (rawFile.readyState === 4 && rawFile.status == "200") {
                setMapping(rawFile.responseText);
            }
        };

        rawFile.send(null);
    };

    const setMapping = (text) => {
        _mapping = JSON.parse(text);

        onComplete();
    };

    /**
     * Get the bank mapping.
     * @return {JSON} The bank mapping JSON.
     */
    this.getMapping = () => _mapping;

    loadJsonFile();
};
