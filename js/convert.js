if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
    alert("The File APIs are not fully supported in this browser. Please use a different browser");
}

// Parse all files added to the "file" button
const parse = () => {
    const files = document.getElementById("file").files;

    for (let file of files)
        parseFile(file);
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

            // TODO: fix errors. Probably not parsed correctly.

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
        let fileStepSize = 50;
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

        for (let line of csvData)
            blobText += line.join(";") + "\n";

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

const BankMapping = function (header) {
    const DEFAULT_DATE_FORMAT = "YYYY-MM-DD";
    let bank = null;

    const getLine = function (line, fieldList) {
        let returnLine = "";

        for (let field of fieldList)
            returnLine += line[field];

        return returnLine;
    };

    const readJsonFile = function (file, callback) {
        const rawFile = new XMLHttpRequest();

        rawFile.overrideMimeType("application/json");
        rawFile.open("GET", file, true);

        rawFile.onreadystatechange = function() {
            if (rawFile.readyState === 4 && rawFile.status == "200") {
                callback(rawFile.responseText);
            }
        };

        rawFile.send(null);
    };

    // Get the bank type of this BankMapping
    this.getBank = () => {
        return bank;
    };

    // Get the account number of the current line
    this.getAccount = function (line) {
        return getLine(line, this.mappings[bank].account);
    };

    // Return the date in the european format of the current line(DD-MM-YYYY)
    this.getDate = function (line) {
        const dateField = this.mappings[bank].date;
        const text = getLine(line, dateField);
        const dateFormat = this.mappings[bank].dateFormat;

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
        return getLine(line, this.mappings[bank].payee);
    };

    // Get the category of the current line
    this.getCategory = function (line) {
        return getLine(line, this.mappings[bank].category);
    };

    // Get the memo of the current line
    this.getMemo = function (line) {
        return getLine(line, this.mappings[bank].memo);
    };

    // Check whether the indicator is positive or negative
    const isIndicatorPositive = function (indicatorField) {
        return indicatorField.includes(this.mappings[bank].positiveIndicator);
    };

    // Get the inflow of the current line
    this.getInflow = function (line) {
        const bankMap = this.mappings[bank];
        let value = getLine(line, bankMap.inflow);
        let indicator = value;

        if (bankMap.separateIndicator != null)
            indicator = getLine(line, bankMap.separateIndicator);

        if (isIndicatorPositive(indicator)) {
            if (bankMap.separateIndicator != null)
                value = value.replace(bankMap.positiveIndicator, "");

            value = value.replace(",", ".");
            return value;
        }

        return "0";
    };

    // Get the outflow of the current line
    this.getOutflow = function (line) {
        const bankMap = this.mappings[bank];
        let value = getLine(line, bankMap.outflow);
        let indicator = value;

        if (bankMap.separateIndicator != null)
            indicator = getLine(line, bankMap.separateIndicator);

        if (!isIndicatorPositive(indicator)) {
            if (bankMap.separateIndicator != null)
                value = value.replace(bankMap.negativeIndicator, "");
            if (value.startsWith("-"))
                value = value.replace("-", "");

            value = value.replace(",", ".");
            return value;
        }

        return "0";
    };

    const recognizeBank = function () {
        const areArraysEqual = (arrayOne, arrayTwo) => {
            for (let index = 0, itemOne, itemTwo; itemOne = arrayOne[index], itemTwo = arrayTwo[index]; ++index) {
                if (itemOne !== itemTwo)
                    return false;
            }
            return true;
        };

        console.log(this.mappings);

        // Check the header
        for (let key in this.mappings) {
            if (this.mappings.hasOwnProperty(key)) {
                if (header) {
                    if (areArraysEqual(header, this.mappings[key].header)) {
                        bank = key;
                        return;
                    }
                }
            }
        }

        throw "CouldNotBeRecognized";
    };

    readJsonFile("banks.json", function(text) {
        console.log(text);
        this.mappings = JSON.parse(text);
        console.log(mappings);
    });

    recognizeBank();
};

// this.mappings = {
//     RABO: {
//         bankName: "RABO",
//         header: ["IBAN/BBAN", "Munt", "BIC", "Volgnr", "Datum", "Rentedatum", "Bedrag", "Saldo na trn",
//             "Tegenrekening IBAN/BBAN", "Naam tegenpartij", "Naam uiteindelijke partij", "Naam initi�rende partij",
//             "BIC tegenpartij", "Code", "Batch ID", "Transactiereferentie", "Machtigingskenmerk", "Incassant ID",
//             "Betalingskenmerk", "Omschrijving-1", "Omschrijving-2", "Omschrijving-3", "Reden retour", "Oorspr bedrag",
//             "Oorspr munt", "Koers"],
//         account: new Field(["IBAN/BBAN"]),
//         date: new Field(["Datum"]),
//         dateFormat: "YYYY-MM-DD",
//         payee: new Field(["Naam tegenpartij"]),
//         category: new Field([]),
//         memo: new Field(["Omschrijving-1", "Omschrijving-2", "Omschrijving-3"]),
//         outflow: new Field(["Bedrag"]),
//         inflow: new Field(["Bedrag"]),
//         positiveIndicator: "+",
//         negativeIndicator: "-",
//     },
//     INGB: {
//         bankName: "INGB",
//         header: ["Datum", "Naam / Omschrijving", "Rekening", "Tegenrekening", "Code", "Af Bij", "Bedrag (EUR)", "MutatieSoort", "Mededelingen"],
//         account: new Field(["Rekening"]),
//         date: new Field(["Datum"]),
//         dateFormat: "YYYYMMDD",
//         payee: new Field(["Naam / Omschrijving"]),
//         category: new Field([]),
//         memo: new Field(["Mededelingen"]),
//         outflow: new Field(["Bedrag (EUR)"]),
//         inflow: new Field(["Bedrag (EUR)"]),
//         positiveIndicator: "Bij",
//         negativeIndicator: "Af",
//         separateIndicator: new Field(["Af Bij"])
//     }
// };

// Recognize the bank using the header
BankMapping.recognizeBank = function (header) {
    const areArraysEqual = (arrayOne, arrayTwo) => {
        for (let index = 0, itemOne, itemTwo; itemOne = arrayOne[index], itemTwo = arrayTwo[index]; ++index) {
            if (itemOne !== itemTwo)
                return false;
        }
        return true;
    };

    // Check the header
    for (let key in this.mappings) {
        if (this.mappings.hasOwnProperty(key)) {
            if (header)
                if (areArraysEqual(header, this.mappings[key].header))
                    return new BankMapping(key);
        }
    }
};

// Converts a streamed CSV file to the desired format
FileStreamConverter = function () {
    const accounts = {}; // All the different account numbers in the file
    let bankMap = null; // The bank mapping for the file
    let failedConversion = false;

    // Convert the current CSV line
    const convertLine = function (line) {
        const account = bankMap.getAccount(line);

        // If account has not been seen before, create new account
        if (accounts[account] == null)
            accounts[account] = new AccountData(account);

        const dataRow = [
            bankMap.getDate(line),
            bankMap.getPayee(line),
            bankMap.getCategory(line),
            bankMap.getMemo(line),
            bankMap.getOutflow(line),
            bankMap.getInflow(line)
        ];

        accounts[account].addLine(dataRow);
    };

    // Covert the file stream
    this.convert = function (results) {
        if (failedConversion)
            return;

        if (!bankMap) {
            try {
                bankMap = BankMapping(results.fields);

                if (!bankMap) { // Failed recognizing bank
                    toastr.error("Bank could not be recognized!");
                    failedConversion = true;
                    return;
                }

                toastr.info("Bank recognized as " + bankMap.getBank());
            } catch (e) {
                toastr.error("Bank could not be recognized!");
                failedConversion = true;
                return;
            }
        }

        for (let index = 0, line; line = results.rows[index]; ++index) {
            // check for error
            if (line.error != null)
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
