/**
 * Converts a streamed CSV file to the desired format
 * @constructor
 */
const Converter = function (bankMap, onConverted) {
    const _accounts = {}; // All the different account numbers in the file
    let _bankMapper = null; // The bank mapping for the file
    let _hasConversionFailed = false;
    let _recognizeFallback = false;

    // Convert the current CSV line
    const convertLine = (line) => {
        const account = _bankMapper.getAccount(line);

        // If account has not been seen before, create new account
        if (_accounts[account] == null)
            _accounts[account] = new YNABAccountData(account);

        const dataRow = {
            date: _bankMapper.getDate(line),
            payee: _bankMapper.getPayee(line),
            category: _bankMapper.getCategory(line),
            memo: _bankMapper.getMemo(line),
            outflow: _bankMapper.getOutflow(line),
            inflow: _bankMapper.getInflow(line)
        };

        _accounts[account].addLine(dataRow);
    };

    /**
     * Covert the file stream per chunk given.
     * @param results {FileStreamerResultStep} Result of the convertion.
     */
    this.convert = function (results) {
        if (_hasConversionFailed)
            return;

        // Init the BankMapper is none is created yet
        if (!_bankMapper) {
            try {
                if (results.fields && !_recognizeFallback) // Headered file
                    _bankMapper = BankMapper.recognizeBank(bankMap, results.fields);
                else // Headerless file
                    _bankMapper = BankMapper.recognizeBankHeaderless(bankMap, results.rows[0].data);

            } catch (e) {
                if (results.fields && !_recognizeFallback) {
                    console.warn("Headered file could not be recognized, trying to use fallback.")
                    _recognizeFallback = true;
                    return this.convert(results);
                }

                notie.alert({type: "error", text: "Bank could not be recognized!", position: "bottom"});
                _hasConversionFailed = true;
                return;
            }
        }

        // Loop through all the data
        for (let index = 0, line; line = results.rows[index]; ++index) {
            // check for error
            if (line.error !== null)
                continue;

            convertLine(line.data);
        }
    };

    /**
     * Handle occurred errors.
     * @param error {string} Error message.
     * @param file {File} The file in which the error occurred.
     */
    this.handleError = function (error, file) {
        if (_hasConversionFailed)
            return;

        notie.alert({type: "error", text: "An error occurred in file " + file.name + ": " + error, position: "bottom"});
    };

    /**
     * Completes the conversion and downloads the CSVs.
     * @param result {FileStreamerResultComplete} The information of the completed stream.
     */
    this.complete = function (result) {
        if (_hasConversionFailed)
            return;

        notie.alert({
            type: "success", text: result.file.name + " is completed successfully. Converted as " +
                _bankMapper.getBank(), position: "bottom"
        });

        const keys = Object.keys(_accounts);

        for (let index = 0, account; account = _accounts[keys[index]]; ++index) {
            // TODO: if connected to YNAB and user wants to connect, generate YNAB transactions
            // IF using the PAT, show one account and wait for user input.

            onConverted(_accounts)

            // new SelectionPopup("Test", ["a", "b", "c"], (e) => console.log(e));

            // account.downloadCSV();
        }
    };

    /**
     * Clear the convert data, such that a new account can be converted.
     */
    this.clear = () => {
        const keys = Object.keys(_accounts);
        keys.forEach(e => delete _accounts[e]);
        _bankMapper = null;
        _hasConversionFailed = false;
        _recognizeFallback = false;
    };
};
