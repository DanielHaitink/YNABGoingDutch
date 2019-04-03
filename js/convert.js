if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
    alert("The File APIs are not fully supported in this browser.");
}

// Parse all files added to the "file" button
const parse = () => {
    const files = document.getElementById("file").files;

    for (const file of files)
        parseFile(file);
};

// Parse every file as a stream
const parseFile = function (file) {
    const converter = new FileStreamConverter();

    Papa.parse(file, {
        header: true,
        step: function (results, parser) {
            converter.convert(results, parser);
        },
        errors: function (error, file) {
            converter.handleError(error, file);
        },
        complete: function (results, file) {
            toastr.success(file.name + " was successfully parsed");
            converter.complete(results);
            document.getElementById("file").value = "";
        }
    });
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

        for (const line of csvData)
            blobText += line.join(";") + "\n";

        const fileName = accountNumber + ".csv";
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

const Field = function (fieldList, splits, splitsKeep) {
    const getFields = function (line) {
        let returnLine = "";

        for (const field of fieldList)
            returnLine += line[field];

        return returnLine;
    };

    // Return the line of the CSV
    this.getLine = function (line) {
        let text = getFields(line);

        // Quick fix for INGB
        if (Array.isArray(splits) && Array.isArray(splitsKeep)) {
            for (let key in splits) {
                if (splits.hasOwnProperty(key))
                    text = text.replace(splits[key] + ":", "|" + splits[key] + ":");
            }
            let explodedText = text.split("|");

            let items = {};
            for (let index in explodedText) {
                let match = explodedText[index].match(/^[a-zA-Z ]*:/);

                if (match === null) {
                    continue;
                }
                match = match[0];
                items[match.substring(0, match.length - 1)] = explodedText[index].trim();
            }

            let textKeep = "";
            for (let key in splitsKeep) {
                if (splitsKeep.hasOwnProperty(key)) {
                    if (items[splitsKeep[key]] === undefined) {
                        continue;
                    }
                    if (textKeep !== "") {
                        textKeep += " | ";
                    }
                    textKeep += items[splitsKeep[key]];
                }
            }
            return textKeep;
        }
        return text;
    };
};

const BankMapping = function (bank) {
    // Get the bank type of this BankMapping
    this.getBank = () => {
        return bank;
    };

    // Get the account number of the current line
    this.getAccount = function (line) {
        return BankMapping.mappings[bank].account.getLine(line);
    };

    // Return the date in the european format of the current line(DD-MM-YYYY)
    this.getDate = function (line) {
        const dateField = BankMapping.mappings[bank].date;
        const text = dateField.getLine(line);
        const dateFormat = BankMapping.mappings[bank].dateFormat;

        if (dateFormat === BankMapping.DEFAULT_DATE_FORMAT)
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
        return BankMapping.mappings[bank].payee.getLine(line);
    };

    // Get the category of the current line
    this.getCategory = function (line) {
        return BankMapping.mappings[bank].category.getLine(line);
    };

    // Get the memo of the current line
    this.getMemo = function (line) {
        return BankMapping.mappings[bank].memo.getLine(line);
    };

    // Check whether the indicator is positive or negative
    const isIndicatorPositive = function (indicatorField) {
        return indicatorField.includes(BankMapping.mappings[bank].positiveIndicator);

    };

    // Get the inflow of the current line
    this.getInflow = function (line) {
        const bankMap = BankMapping.mappings[bank];
        let value = bankMap.inflow.getLine(line);
        let indicator = value;

        if (bankMap.separateIndicator != null)
            indicator = bankMap.separateIndicator.getLine(line);

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
        const bankMap = BankMapping.mappings[bank];
        let value = bankMap.outflow.getLine(line);
        let indicator = value;

        if (bankMap.separateIndicator != null)
            indicator = bankMap.separateIndicator.getLine(line);

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
};

BankMapping.DEFAULT_DATE_FORMAT = "YYYY-MM-DD";
BankMapping.mappings = {
    RABO: {
        bankName: "RABO",
        header: ["IBAN/BBAN", "Munt", "BIC", "Volgnr", "Datum", "Rentedatum", "Bedrag", "Saldo na trn",
            "Tegenrekening IBAN/BBAN", "Naam tegenpartij", "Naam uiteindelijke partij", "Naam initi�rende partij",
            "BIC tegenpartij", "Code", "Batch ID", "Transactiereferentie", "Machtigingskenmerk", "Incassant ID",
            "Betalingskenmerk", "Omschrijving-1", "Omschrijving-2", "Omschrijving-3", "Reden retour", "Oorspr bedrag",
            "Oorspr munt", "Koers"],
        account: new Field(["IBAN/BBAN"]),
        date: new Field(["Datum"]),
        dateFormat: "YYYY-MM-DD",
        payee: new Field(["Naam tegenpartij"]),
        category: new Field([]),
        memo: new Field(["Omschrijving-1", "Omschrijving-2", "Omschrijving-3"]),
        outflow: new Field(["Bedrag"]),
        inflow: new Field(["Bedrag"]),
        positiveIndicator: "+",
        negativeIndicator: "-",
    },
    INGB: {
        bankName: "INGB",
        header: ["Datum", "Naam / Omschrijving", "Rekening", "Tegenrekening", "Code", "Af Bij", "Bedrag (EUR)", "MutatieSoort", "Mededelingen"],
        account: new Field(["Rekening"]),
        date: new Field(["Datum"]),
        dateFormat: "YYYYMMDD",
        payee: new Field(["Naam / Omschrijving"]),
        category: new Field([]),
        memo: new Field(
            ["Mededelingen"],
            ['Transactie', 'Term', 'Pasvolgnr', 'Omschrijving', 'IBAN', 'Kenmerk', 'Machtiging ID', 'Incassant ID'],
            ['Transactie', 'Term', 'Omschrijving', 'IBAN', 'Kenmerk']),
        outflow: new Field(["Bedrag (EUR)"]),
        inflow: new Field(["Bedrag (EUR)"]),
        positiveIndicator: "Bij",
        negativeIndicator: "Af",
        separateIndicator: new Field(["Af Bij"])
    }
};

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
    for (let key in BankMapping.mappings) {
        if (BankMapping.mappings.hasOwnProperty(key)) {
            if (areArraysEqual(header, BankMapping.mappings[key].header))
                return new BankMapping(key);
        }
    }
    toastr.error("File could not be parsed");
};

// Converts a streamed CSV file to the desired format
FileStreamConverter = function () {
    const accounts = {}; // All the different account numbers in the file
    let bankMap = null; // The bank mapping for the file

    const hasIndexErrors = function (index, errors) {
        return errors[index] != null;
    };

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
    this.convert = function (results, parser) {
        if (!bankMap) {
            bankMap = BankMapping.recognizeBank(results.meta.fields);
            toastr.info("Bank recognized as " + bankMap.getBank());
        }

        for (let index = 0, line; line = results.data[index]; ++index) {
            if (hasIndexErrors(index, results.errors))
                continue;

            convertLine(line);
        }
    };

    // Handle occurred errors
    this.handleError = function (error, file) {
        toastr.error("An error occurred in file " + file + ": " + error);
    };

    // Completes the conversion and downloads the CSVs
    this.complete = function (results) {
        let keys = Object.keys(accounts);

        for (let index = 0, account; account = accounts[keys[index]]; ++index) {
            account.downloadCSV();
        }
    };
};
