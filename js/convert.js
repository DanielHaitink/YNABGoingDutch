if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
    alert("The File APIs are not fully supported in this browser.");
}

const parse = () => {
    const files = document.getElementById("file").files;

    for (const file of files)
        parseFile(file);
};

const parseFile = function (file) {
    const converter = new StreamConverter();

    Papa.parse(file, {
        header: true,
        step: function (results, parser) {
            converter.convert(results, parser);
        },
        errors: function (error, file) {
            converter.errorHandle(error, file);
        },
        complete: function (results, file) {
            toastr.success(file.name + " was successfully parsed");
            converter.complete(results);
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
            blobText += line.join(';') + '\n';

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

    this.getLine = function (line) {
        let text = getFields(line);

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

            let textKeep = '';
            for (let key in splitsKeep) {
                if (splitsKeep.hasOwnProperty(key)) {
                    if (items[splitsKeep[key]] === undefined) {
                        continue;
                    }
                    if (textKeep !== "") {
                        textKeep += ' | ';
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
    this.getBank = () => {
        return bank;
    };

    this.getAccount = function (line) {
        return BankMapping.mappings[bank].account.getLine(line);
    };

    this.getDate = function (line) {
        const dateField = BankMapping.mappings[bank].date;
        const text = dateField.getLine(line);
        const dateFormat = BankMapping.mappings[bank].dateFormat;

        if (dateFormat === BankMapping.DEFAULT_DATE_FORMAT)
            return text;

        let year = "";
        let month = "";
        let day = "";
        console.log(dateFormat);
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

    this.getPayee = function (line) {
        return BankMapping.mappings[bank].payee.getLine(line);
    };

    this.getCategory = function (line) {
        return "";
    };

    this.getMemo = function (line) {
        return BankMapping.mappings[bank].memo.getLine(line);
    };

    const isIndicatorPositive = function (indicatorField) {
        return indicatorField.includes(BankMapping.mappings[bank].positiveIndicator);

    };

    this.getInflow = function (line) {
        const bankMap = BankMapping.mappings[bank];
        let value = bankMap.inflow.getLine(line);
        let indicator = value;

        if (bankMap.separateIndicator != null)
            indicator = bankMap.separateIndicator.getLine(line);

        if (isIndicatorPositive(indicator)) {
            if (bankMap.separateIndicator != null)
                value = value.replace(bankMap.positiveIndicator, "");
            return value;
        }

        return "0";
    };

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
            return value;
        }

        return "0";
    };
};

BankMapping.RABO = "RABO";
BankMapping.ING = "ING";
BankMapping.DEFAULT_DATE_FORMAT = "YYYY-MM-DD";
BankMapping.mappings = {
    RABO: {
        header: ["IBAN/BBAN", "Munt", "BIC", "Volgnr", "Datum", "Rentedatum", "Bedrag", "Saldo na trn", "Tegenrekening IBAN/BBAN", "Naam tegenpartij", "Naam uiteindelijke partij", "Naam initi�rende partij", "BIC tegenpartij", "Code", "Batch ID", "Transactiereferentie", "Machtigingskenmerk", "Incassant ID", "Betalingskenmerk", "Omschrijving-1", "Omschrijving-2", "Omschrijving-3", "Reden retour", "Oorspr bedrag", "Oorspr munt", "Koers"],
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
    ING: {
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
BankMapping.recognizeBank = function (header) {
    const areArraysEqual = (arrayOne, arrayTwo) => {
        for (let index = 0, itemOne, itemTwo; itemOne = arrayOne[index], itemTwo = arrayTwo[index]; ++index) {
            if (itemOne !== itemTwo)
                return false;
        }
        return true;
    };

    for (let key in BankMapping.mappings) {
        if (BankMapping.mappings.hasOwnProperty(key)) {
            if (areArraysEqual(header, BankMapping.mappings[key].header))
                return new BankMapping(key);
        }
    }
    alert("Could not be parsed");
};

StreamConverter = function () {
    const accounts = {};
    let map = null;

    const isErrorIndex = function (index, errors) {
        return errors[index] != null;

    };

    const convertLine = function (line) {
        const account = map.getAccount(line);

        if (accounts[account] == null)
            accounts[account] = new AccountData(account);

        const dataRow = [
            map.getDate(line),
            map.getPayee(line),
            map.getCategory(line),
            map.getMemo(line),
            map.getOutflow(line),
            map.getInflow(line)
        ];

        accounts[account].addLine(dataRow);
    };

    this.convert = function (results, parser) {
        if (!map) {
            map = BankMapping.recognizeBank(results.meta.fields);
            toastr.info("Bank recognized as " + map.getBank());
        }

        for (let index = 0, line; line = results.data[index]; ++index) {
            if (isErrorIndex(index, results.errors))
                continue;

            convertLine(line);
        }
    };

    this.errorHandle = function (error, file) {
        toastr.error("An error occurred in file " + file + ": " + error);
    };

    this.complete = function (results) {
        let keys = Object.keys(accounts);

        for (let index = 0, account; account = accounts[keys[index]]; ++index) {
            account.downloadCSV();
        }
    };
};
