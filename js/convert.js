if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
    alert("The File APIs are not fully supported in this browser. Please use a different browser");
}

let bankMap = null;

// Parse all files added to the "file" button
const parse = function () {
    const parseFiles = function () {
        const files = document.getElementById("file").files;

        for (let file of files)
            parseFile(file);
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
const parseFile = function (file) {
    const converter = new FileStreamConverter();

    new FileStreamer(file,
        (result) => {
            converter.convert(result);
        },
        (error) => {
            converter.handleError(error, file);
        },
        (result) => {
            converter.complete(result);
            document.getElementById("file").value = "";
        }
    );
};

const FileStreamer = function (file, onStep, onError, onComplete) {
    let header = null;
    let numberOfCols = 0;
    let firstLineParsed = false;
    let incompleteRow = null;

    const FileRow = function (data, error) {
        this.data = data;
        this.error = error;
    };

    const FileStreamerResultStep = function (rows) {
        this.fields = header;
        this.rows = rows;
    };

    const FileStreamerResultComplete = function () {
        this.file = file;
        this.fields = header;
    };

    const isHeader = function (line) {
        // Look for empty spaces, dates and IBAN numbers
        const isNotHeaderRegex = /["']{2}[,;]|[,;]{2}|([\d]{1,4}[\-\/][\d]{1,2}[\-\/][\d]{1,4})|([A-Z]{2}\d{2}[A-Z]{4}\d{10})/g;
        return !isNotHeaderRegex.test(line);
    };

    const cleanFields = function (fields) {
        let cleanedFields = [];

        for (let field of fields) {
            field = field.replace(/(\r\n|\n|\r)/gm,"");

            if (field.endsWith(",") || field.endsWith(";"))
                field = field.substring(0, field.length - 1);

            if ((field.startsWith("\"") && field.endsWith("\"")) || (field.startsWith("\'") && field.endsWith("\'")))
                cleanedFields.push(field.substring(1, field.length - 1));
            else
                cleanedFields.push(field);
        }

        return cleanedFields;
    };

    const splitLineToFields = function (line) {
        const splitFieldsRegex = /("(?:[^"]|"")*"|[^,"\n\r]*)(,|;|\r?\n|\r|(.+$))/g;

        let fields = line.match(splitFieldsRegex);

        return cleanFields(fields);
    };

    const convertRowToJson = function (fields) {
        let dict = {};

        if (header !== null) {
            for (let index = 0; index < fields.length; ++index) {
                dict[header[index]] = fields[index];
            }
        } else {
            for (let index = 0; index < fields.length; ++index) {
                dict[index] = fields[index];
            }
        }

        return dict;
    };

    const endsWithNewLine = function (line) {
        return (line.endsWith("\r") || line.endsWith("\n"));
    };

    const checkRowForErrors = function (line, fields) {
        let error = null;

        if (firstLineParsed) {
            if (fields.length < numberOfCols)
                error = "TooFewColumns";
            else if (fields.length > numberOfCols)
                error = "TooManyColumns";
        }

        return error;
    };

    const isRowComplete = function (line, fields) {
        return endsWithNewLine(line);
    };

    const parseFirstRow = function (line, fields) {
        firstLineParsed = true;
        numberOfCols = fields.length;

        if (isHeader(line)) {
            header = fields;
        }
    };

    const splitRows = function (line) {
        return line.match(/.*(\r?\n|\r|$)/g);
    };

    const createResult = function (rowData) {
        return new FileStreamerResultStep(rowData);
    };

    const fillIncompleteRow = function (rows) {
        // Complete previous incomplete row
        if (incompleteRow !== null) {
            rows[0] = incompleteRow + rows[0];
            incompleteRow = null;
        }

        return rows;
    };

    const parseRow = function (line) {
        if (line === null || line === "")
            return null;

        const fields = splitLineToFields(line);

        if (! isRowComplete(line, fields)) {
            incompleteRow = line;
            return null;
        }

        const error = checkRowForErrors(line, fields);

        if (!firstLineParsed) {
            parseFirstRow(line, fields);

            // Don't return the header, if found
            if (header)
                return null;
        }

        // Finish row
        return new FileRow(convertRowToJson(fields), error);
    };

    const parseRows = function (rows) {
        // Parse all rows
        let fileRows = [];
        for (let row of rows) {
            let fileRow = parseRow(row);

            if (fileRow !== null && fileRow !== undefined)
                fileRows.push(fileRow);
        }

        if (fileRows.length > 0)
            onStep(createResult(fileRows));
    };

    const completeStreaming = function () {
        if (incompleteRow !== null && incompleteRow !== undefined && incompleteRow !== "") {
            const lastRow = incompleteRow + "\n";
            incompleteRow = null;
            onStep(createResult([parseRow(lastRow)]));
        }

        onComplete(new FileStreamerResultComplete());
    };

    const streamFile = function () {
        let loadedBytes = 0;
        let fileStepSize = 2048;
        let totalFileSize = file.size;
        let streamingProgress = 0;
        let fileReader = new FileReader();

        fileReader.onload = function(evt) {
            // Take result
            let rows = splitRows(evt.target.result);

            // Check rows for not completed
            rows = fillIncompleteRow(rows);

            // Parse all rows
            parseRows(rows);

            // Prepare for the second step
            loadedBytes += fileStepSize;
            streamingProgress = (loadedBytes/totalFileSize) * 100;

            if (loadedBytes <= totalFileSize) {
                // Parse the next part
                blob = file.slice(loadedBytes, loadedBytes + fileStepSize);
                fileReader.readAsText(blob);
            } else {
                // Completed streaming
                loadedBytes = totalFileSize;
                completeStreaming();
            }
        };

        let blob = file.slice(0, fileStepSize);
        fileReader.readAsText(blob);
    };

    streamFile();
};

const AccountData = function (accountNumber) {
    let csvData = [
        ["Date", "Payee", "Category", "Memo", "Outflow", "Inflow"]
    ];

    this.addLine = function (data) {
        csvData.push(data);
    };

    this.downloadCSV = function () {
        let blobText = "";

        for (let line of csvData) {
            for (let item of line) {
                blobText += "\"" + item + "\"";

                if (item !== line[line.length - 1])
                    blobText += ",";
            }
            blobText += "\r\n";
        }

        const date = new Date().toJSON().slice(0,10).replace(/-/g,"\/");
        const fileName = accountNumber + "_" + date + ".csv";
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

const BankMap = function (file, onComplete) {
    this.mapping = null;

    const loadJsonFile = function () {
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
        this.mapping = JSON.parse(text);

        onComplete();
    };

    loadJsonFile();
};

const BankMapper = function (bank) {
    const DEFAULT_DATE_FORMAT = "YYYY-MM-DD";
    const map = bankMap.mapping[bank];

    const getLine = function (line, fieldList) {
        let returnLine = "";

        for (let field of fieldList)
            returnLine += line[field];

        return returnLine;
    };

    // Get the bank type of this BankMapper
    this.getBank = () => {
        return bank;
    };

    // Get the account number of the current line
    this.getAccount = function (line) {
        return getLine(line, map.account);
    };

    // Return the date in the european format of the current line(DD-MM-YYYY)
    this.getDate = function (line) {
        const dateField = map.date;
        const text = getLine(line, dateField);
        const dateFormat = map.dateFormat;

        if (dateFormat === DEFAULT_DATE_FORMAT)
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

    // Get the payee of the current line
    this.getPayee = function (line) {
        return getLine(line, map.payee);
    };

    // Get the category of the current line
    this.getCategory = function (line) {
        return getLine(line, map.category);
    };

    // Get the memo of the current line
    this.getMemo = function (line) {
        return getLine(line, map.memo);
    };

    // Check whether the indicator is positive
    const isIndicatorPositive = function (indicatorField) {
        if (!map.positiveIndicator) {
            if (!map.negativeIndicator)
                throw "NoIndicatorsError";
            // Check for negative indicator
            return !isIndicatorNegative(indicatorField);
        }

        return indicatorField.includes(map.positiveIndicator);
    };

    // Check whether the indicator is negative
    const isIndicatorNegative = function (indicatorField) {
        if (!map.negativeIndicator) {
            if (!map.positiveIndicator)
                throw "NoIndicatorsError";
            return !isIndicatorPositive(indicatorField);
        }

        return indicatorField.includes(map.negativeIndicator);
    };

    // Get the inflow of the current line
    this.getInflow = function (line) {
        let value = getLine(line, map.inflow);
        let indicator = value;

        if (map.separateIndicator)
            indicator = getLine(line, map.separateIndicator);

        if (isIndicatorPositive(indicator)) {
            if (!map.separateIndicator && map.positiveIndicator)
                value = value.replace(map.positiveIndicator, "");

            if (value.startsWith("+"))
                value = value.replace("+", "");

            value = value.replace(",", ".");
            return value;
        }

        return "0";
    };

    // Get the outflow of the current line
    this.getOutflow = function (line) {
        let value = getLine(line, map.outflow);
        let indicator = value;

        if (map.separateIndicator)
            indicator = getLine(line, map.separateIndicator);

        if (isIndicatorNegative(indicator)) {
            if (!map.separateIndicator && map.negativeIndicator)
                value = value.replace(map.negativeIndicator, "");

            if (value.startsWith("-"))
                value = value.replace("-", "");

            value = value.replace(",", ".");
            return value;
        }

        return "0";
    };
};

BankMapper.recognizeBank = function (header) {
    const areArraysEqual = (arrayOne, arrayTwo) => {
        for (let index = 0, itemOne, itemTwo; itemOne = arrayOne[index], itemTwo = arrayTwo[index]; ++index) {
            if (itemOne !== itemTwo)
                return false;
        }
        return true;
    };

    // Check the header
    for (let key in bankMap.mapping) {
        if (bankMap.mapping.hasOwnProperty(key)) {
            if (areArraysEqual(header, bankMap.mapping[key].header)) {
                return new BankMapper(key);
            }
        }
    }

    throw "CouldNotBeRecognized";
};

BankMapper.recognizeBankHeaderless = function (fields) {
    for (let key in bankMap.mapping) {
        if (bankMap.mapping.hasOwnProperty(key)) {
            const ibanRegex = RegExp("[A-Z]{2}\\d{2}" + bankMap.mapping[key].bankName + "\\d{10}", "g");

            const accountColumns = bankMap.mapping[key].account;
            for (let col of accountColumns) {
                if (ibanRegex.test(fields[col]))
                    return new BankMapper(key);
            }
        }
    }

    throw "CouldNotBeRecognized";
};

// Converts a streamed CSV file to the desired format
FileStreamConverter = function () {
    const accounts = {}; // All the different account numbers in the file
    let bankMapper = null; // The bank mapping for the file
    let failedConversion = false;

    // Convert the current CSV line
    const convertLine = function (line) {
        const account = bankMapper.getAccount(line);

        // If account has not been seen before, create new account
        if (accounts[account] == null)
            accounts[account] = new AccountData(account);

        const dataRow = [
            bankMapper.getDate(line),
            bankMapper.getPayee(line),
            bankMapper.getCategory(line),
            bankMapper.getMemo(line),
            bankMapper.getOutflow(line),
            bankMapper.getInflow(line)
        ];

        accounts[account].addLine(dataRow);
    };

    // Covert the file stream
    this.convert = function (results) {
        if (failedConversion)
            return;

        // Init the BankMapper is none is created yet
        if (!bankMapper) {
            try {
                if (results.fields) // Headered file
                    bankMapper = BankMapper.recognizeBank(results.fields);
                else // Headerless file
                    bankMapper = BankMapper.recognizeBankHeaderless(results.rows[0].data);

                toastr.info("Bank recognized as " + bankMapper.getBank());
            } catch (e) {
                toastr.error("Bank could not be recognized!");

                failedConversion = true;
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

    // Handle occurred errors
    this.handleError = function (error, file) {
        if (failedConversion)
            return;

        toastr.error("An error occurred in file " + file.name + ": " + error);
    };

    // Completes the conversion and downloads the CSVs
    this.complete = function (result) {
        if (failedConversion)
            return;

        toastr.success(result.file.name + " is completed successfully");

        const keys = Object.keys(accounts);

        for (let index = 0, account; account = accounts[keys[index]]; ++index) {
            account.downloadCSV();
        }
    };
};
