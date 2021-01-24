import { DropArea } from "./dropArea.js"
import { CSVGood } from "./CSVGood.js"
import notie from "./notie/notie.es6.js"

let bankMap = null;

// Add new drop area for drag and drop behaviour
new DropArea((files) => {

    const parseFiles = () => {
        for (const file of files)
            parseFile(file);
    };

    if (bankMap === null) {
        bankMap = new BankMap("banks.json", () => parseFiles());
    }
    else {
        parseFiles();
    }
});

/**
 * Parse the files in the input field, selected with the input button.
 */
export const parse = function () {
    const _input = document.getElementById("drop-input");

    const parseFiles = () => {
        for (const file of _input.files)
            parseFile(file);

        _input.value = "";
    };

    // Load JSON before parsing files
    if (bankMap === null) {
        bankMap = new BankMap("banks.json", () => parseFiles());
    }
    else {
        parseFiles();
    }
};

// Parse every file as a stream
/**
 * Parse a file as a stream.
 * @param file {File} A file that should be converted.
 */
const parseFile = function (file) {
    const _converter = new YNABConverter();

    new CSVGood(file,
        (result) => {
            _converter.convert(result);
        },
        (error) => {
            _converter.handleError(error, file);
        },
        (result) => {
            _converter.complete(result);
        }
    );
};

/**
 * Holds data of the eventual CSV file, in YNAB format.
 * @param accountNumber {String} The unique number of the bank account.
 * @constructor
 */
const YNABAccountData = function (accountNumber) {
    let _csvData = [
        ["Date", "Payee", "Category", "Memo", "Outflow", "Inflow"]
    ];

    /**
     * Add a line to the CSV.
     * @param data {Array} An array of strings.
     */
    this.addLine = (data) => {
        if (YNABAccountData.DATA_DIMENSION !== data.length) {
            console.error("Data is of the wrong size!");
            return;
        }

        _csvData.push(data);
    };

    /**
     * Prompt a download for the new CSV file.
     */
    this.downloadCSV = () => {
        let blobText = "";

        for (const line of _csvData) {
            for (const item of line) {
                blobText += "\"" + item + "\"";

                if (item !== line[line.length - 1])
                    blobText += ",";
            }
            blobText += "\r\n";
        }

        const date = new Date().toJSON().slice(0,10).replace(/-/g,"\/");
        const fileName = "ynab_" + accountNumber + "_" + date + ".csv";
        const blob = new Blob([blobText], {
            type: "text/csv;charset=utf-8;"
        });

        if (navigator.msSaveBlob) { // IE 10+
            navigator.msSaveBlob(blob, fileName);
        } else {
            const link = document.createElement("a");

            if (link.download !== undefined) {
                let url = URL.createObjectURL(blob);

                link.setAttribute("href", url);
                link.setAttribute("download", fileName);
                link.style.visibility = "hidden";

                document.body.appendChild(link);

                link.click();
            }
        }
    };
};

YNABAccountData.DATA_DIMENSION = 6;

/**
 * A mapping, which maps the bank CSVs to the YNAB format.
 * @param file {File} The file containing the JSON mapping.
 * @param onComplete {Function} The function that is called when the mapping is loaded.
 * @constructor
 */
const BankMap = function (file, onComplete) {
    let _mapping = null;

    const loadJsonFile = () => {
        const rawFile = new XMLHttpRequest();

        rawFile.overrideMimeType("application/json");
        rawFile.open("GET", file, true);

        rawFile.onreadystatechange = function() {
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

/**
 *
 * @param bank
 * @constructor
 */
const BankMapper = function (bank) {
    const _map = bankMap.getMapping()[bank];

    const getLine = (line, fieldList) => {
        let returnLine = "";

        for (const field of fieldList) {
            const fieldValue = line[field].trim();
            if (!!returnLine.trim() && !!fieldValue)
                returnLine += " ";
        
            returnLine += fieldValue;
         }

        return returnLine;
    };

    // Check whether the indicator is positive
    const isIndicatorPositive = function (indicatorField) {
        if (!_map.positiveIndicator) {
            if (!_map.negativeIndicator)
                throw "NoIndicatorsError";
            // Check for negative indicator
            return !isIndicatorNegative(indicatorField);
        }

        return indicatorField.includes(_map.positiveIndicator);
    };

    // Check whether the indicator is negative
    const isIndicatorNegative = function (indicatorField) {
        if (!_map.negativeIndicator) {
            if (!_map.positiveIndicator)
                throw "NoIndicatorsError";
            return !isIndicatorPositive(indicatorField);
        }

        return indicatorField.includes(_map.negativeIndicator);
    };

    /**
     * Get the bank type of this BankMapper.
     * @return {String} The key of the bank.
     */
    this.getBank = () => bank;

    /**
     * Get the account number of the current line.
     * @param line {String} A line from a CSV.
     * @return {string} The account number.
     */
    this.getAccount = (line) => getLine(line, _map.account);

    /**
     * Return the date in the european format of the current line(DD-MM-YYYY)
     * @param line {String} A line from a CSV.
     * @return {string} The date.
     */
    this.getDate = (line) => {
        const dateField = _map.date;
        const text = getLine(line, dateField);
        const dateFormat = _map.dateFormat;

        if (dateFormat === BankMapper.DEFAULT_DATE_FORMAT)
            return text;

        let year = "";
        let month = "";
        let day = "";
        for (let index = 0; index < dateFormat.length; ++index) {
            switch (dateFormat.charAt(index)) {
                case "Y":
                    year += text.charAt(index);
                    break;
                case "M":
                    month += text.charAt(index);
                    break;
                case "D":
                    day += text.charAt(index);
                    break;
            }
        }

        return day + "-" + month + "-" + year;
    };

    /**
     * Get the payee of the current line
     * @param line {String} A line from a CSV.
     * @return {string} The payee.
     */
    this.getPayee = (line) => {
        let payee = getLine(line, _map.payee);

        // Fallback method for ASN and SNS
        if (!payee || payee === "") {
            const memo = this.getMemo(line);

            if (memo.search("MCC") !== -1) {
                const splitMemo = memo.split('>');

                if (splitMemo.length > 0)
                    return splitMemo[0].trim();
            }
        }

        return payee;
    };

    /**
     * Get the category of the current line
     * @param line {String} A line from a CSV.
     * @return {string} The category.
     */
    this.getCategory = (line) => getLine(line, _map.category);

    /**
     * Get the memo of the current line
     * @param line {String} A line from a CSV.
     * @return {string} The Memo.
     */
    this.getMemo = (line) => getLine(line, _map.memo);

    /**
     * Get the inflow of the current line
     * @param line {String} A line from a CSV.
     * @return {string} The inflow.
     */
    this.getInflow = (line) => {
        let value = getLine(line, _map.inflow);
        let indicator = value;

        if (_map.separateIndicator)
            indicator = getLine(line, _map.separateIndicator);

        if (isIndicatorPositive(indicator)) {
            if (!_map.separateIndicator && _map.positiveIndicator)
                value = value.replace(_map.positiveIndicator, "");

            if (value.startsWith("+"))
                value = value.replace("+", "");

            value = value.replace(",", ".");
            return value;
        }

        return "0";
    };

    /**
     * Get the outflow of the current line
     * @param line {String} A line from a CSV.
     * @return {string} The outflow.
     */
    this.getOutflow = (line) => {
        let value = getLine(line, _map.outflow);
        let indicator = value;

        if (_map.separateIndicator)
            indicator = getLine(line, _map.separateIndicator);

        if (isIndicatorNegative(indicator)) {
            if (!_map.separateIndicator && _map.negativeIndicator)
                value = value.replace(_map.negativeIndicator, "");

            if (value.startsWith("-"))
                value = value.replace("-", "");

            value = value.replace(",", ".");
            return value;
        }

        return "0";
    };
};

BankMapper.DEFAULT_DATE_FORMAT = "YYYY-MM-DD";

/**
 * Recognize the bank based on the header.
 * @param header {Array} An array with string objects.
 * @return {BankMapper} A BankMapper for the recognized bank.
 */
BankMapper.recognizeBank = (header) => {
    const areArraysEqual = (arrayOne, arrayTwo) => {
        for (let index = 0, itemOne, itemTwo; itemOne = arrayOne[index], itemTwo = arrayTwo[index]; ++index) {
            if (itemOne.toLowerCase() !== itemTwo.toLowerCase())
                return false;
        }
        return true;
    };

    // Check the header
    for (const key in bankMap.getMapping()) {
        if (bankMap.getMapping().hasOwnProperty(key)) {
            if (areArraysEqual(header, bankMap.getMapping()[key].header)) {
                return new BankMapper(key);
            }
        }
    }

    throw "CouldNotBeRecognized";
};

/**
 * Recognize the bank based on a line in the CSV. For headerless CSV files.
 * @param fields {Array} An array with string objects.
 * @return {BankMapper} A BankMapper for the recognized bank.
 */
BankMapper.recognizeBankHeaderless = (fields) => {
    for (const key in bankMap.getMapping()) {
        if (bankMap.getMapping().hasOwnProperty(key)) {
            const ibanRegex = RegExp("[A-Z]{2}\\d{2}" + bankMap.getMapping()[key].bankName + "\\d{10}", "g");
            const accountColumns = bankMap.getMapping()[key].account;

            for (const col of accountColumns) {
                if (ibanRegex.test(fields[col]))
                    return new BankMapper(key);
            }
        }
    }

    throw "CouldNotBeRecognized";
};

/**
 * Converts a streamed CSV file to the desired format
 * @constructor
 */
const YNABConverter = function () {
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

        const dataRow = [
            _bankMapper.getDate(line),
            _bankMapper.getPayee(line),
            _bankMapper.getCategory(line),
            _bankMapper.getMemo(line),
            _bankMapper.getOutflow(line),
            _bankMapper.getInflow(line)
        ];

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
                    _bankMapper = BankMapper.recognizeBank(results.fields);
                else // Headerless file
                    _bankMapper = BankMapper.recognizeBankHeaderless(results.rows[0].data);

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

        notie.alert({type: "success", text: result.file.name + " is completed successfully. Converted as " +
                _bankMapper.getBank(), position: "bottom"});

        const keys = Object.keys(_accounts);

        for (let index = 0, account; account = _accounts[keys[index]]; ++index) {
            account.downloadCSV();
        }
    };
};
