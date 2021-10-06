/**
 *
 * @param bankMap
 * @param bank
 * @constructor
 */
const BankMapper = function (bankMap, bank) {
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

        return year + "-" + month + "-" + day;
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
 * @param bankMap
 * @param header {Array} An array with string objects.
 * @return {BankMapper} A BankMapper for the recognized bank.
 */
BankMapper.recognizeBank = (bankMap, header) => {
    const areArraysEqual = (arrayOne, arrayTwo) => {
        if (arrayOne == null || arrayTwo == null || arrayOne.length !== arrayTwo.length)
            return false;

        for (let index = 0, itemOne, itemTwo; itemOne = arrayOne[index], itemTwo = arrayTwo[index]; ++index) {
            if (itemOne.toLowerCase() !== itemTwo.toLowerCase())
                return false;
        }
        return true;
    };

    // Check the header
    for (const key in bankMap.getMapping()) {
        if (bankMap.getMapping().hasOwnProperty(key)) {
            if (!bankMap.getMapping()[key].hasOwnProperty("header"))
                continue;
            if (areArraysEqual(header, bankMap.getMapping()[key]["header"])) {
                return new BankMapper(bankMap, key);
            }
        }
    }

    throw "CouldNotBeRecognized";
};

/**
 * Recognize the bank based on a line in the CSV. For headerless CSV files.
 * @param bankMap
 * @param fields {Array} An array with string objects.
 * @return {BankMapper} A BankMapper for the recognized bank.
 */
BankMapper.recognizeBankHeaderless = (bankMap, fields) => {
    for (const key in bankMap.getMapping()) {
        if (bankMap.getMapping().hasOwnProperty(key)) {
            const ibanRegex = RegExp("[A-Z]{2}\\d{2}" + bankMap.getMapping()[key].bankName + "\\d{10}", "g");
            const accountColumns = bankMap.getMapping()[key].account;

            for (const col of accountColumns) {
                if (ibanRegex.test(fields[col]))
                    return new BankMapper(bankMap, key);
            }
        }
    }

    throw "CouldNotBeRecognized";
};