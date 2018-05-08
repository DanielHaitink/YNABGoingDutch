if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
    alert("The File APIs are not fully supported in this browser.");
}

parseFile = function (file) {
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
            toastr.success(file.name + " was succesfully parsed");
            converter.complete(results);
        }
    });
};

Dropzone.options.dropzone = {
    paramName: "file",
    clickable: true,
    uploadMultiple: true,
    ignoreHiddenFiles: true,
    accept: function (file, done) {
        if (file.name.endsWith(".csv")) {
            // TODO: check if file is succesfully parsed
            parseFile(file);
            this.removeFile(file);
            done();
        } else {
            toastr.error(file.name + " was not parsed");
            this.removeFile(file);
            done("Could not parse file " + file.name);
        }
    },
    acceptedMimeTypes: "text/csv",
    dictDefaultMessage: "Drag csv's here or click here to select the files from your device",
    complete: function (file) {
        this.removeFile(file);
    },
    addRemoveLinks: false
};

parse = () => {
    const files = document.getElementById("file").files;

    for (let index = 0, file; file = files[index]; ++index) {
        parseFile(file);
    }
};

AccountData = function (accountNumber) {
    let csvData = [
        ["Date", "Payee", "Category", "Memo", "Outflow", "Inflow"]
    ];

    this.addLine = function (data) {
        csvData.push(data);
    };

    this.downloadCSV = function () {
        let blobText = "";

        for (let index = 0, line; line = csvData[index]; ++index) {
            blobText += line.join(';') + '\n';
        }

        const fileName = accountNumber + ".csv";
        const blob = new Blob([blobText], {
            type: "text/csv;charset=utf-8;"
        });

        if (navigator.msSaveBlob) { // IE 10+
            navigator.msSaveBlob(blob, fileName);
        } else {
            const link = document.createElement("a");

            if (link.download != undefined) {
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

field = function (fieldList, splitAfter, splitBefore) {
    this.fieldList = fieldList;
    this.splitAfter = splitAfter;
    this.splitBefore = splitBefore;

    getFields = function (line) {
        returnLine = "";

        for (let index = 0, field; field = this.field.fieldList[index]; ++index) {
            console.log(line);
            console.log(field);
            console.log(returnLine);
            returnLine += line[field];
        }

        return returnLine;
    };

    this.getLine = function (line) {
        let text = getFields(line);
        if (this.splitAfter)
            text = text.split(this.splitAfter, 1)[1];
        if (this.splitBefore)
            text = text.split(this.splitBefore, 1)[0];

        console.log(text);
        return text;
    };
};

BankMapping = function (bank) {
    const DEFAULT_DATE_FORMAT = "YYYY-MM-DD";

    const mappings = {
        RABO: {
            account: new field(["IBAN/BBAN"]),
            date: new field(["Datum"]),
            dateFormat: "YYYY-MM-DD",
            payee: new field(["Naam Tegenpartij"]),
            category: new field([]),
            memo: new field(["Omschrijving-1", "Omschrijving-2", "Omschrijving-3"]),
            outflow: new field(["Bedrag"]),
            inflow: new field(["Bedrag"]),
            positiveIndicator: "+",
            negativeIndicator: "-",
            seperateIndicator: null
        },
        ING: {
            account: new field(["Rekening"]),
            date: new field(["Datum"]),
            dateFormat: "YYYYMMDD",
            payee: new field(["Naam / Omschrijving"]),
            category: new field([]),
            memo: new field(["Mededelingen"], "Omschrijving: ", " IBAN:"),
            outflow: new field(["Bedrag"]),
            inflow: new field(["Bedrag"]),
            positiveIndicator: "Bij",
            negativeIndicator: "Af",
            seperateIndicator: new field(["Af Bij"])
        }
    };

    this.getAccount = function (line) {
        console.log(bank);
        console.log(mappings);
        return mappings[bank].account.getLine(line);
    }

    this.getDate = function (line) {
        const dateField = mappings[bank].date;
        const text = dateField.getLine(line);
        const dateFormat = mappings[bank].dateFormat;

        if (dateFormat == DEFAULT_DATE_FORMAT)
            return text;

        let year = "", month = "", day = "";
        for (let i = 0, letter; letter = dateFormat[i]; ++i) {
            switch (letter) {
                case "Y":
                    year += text[i];
                case "M":
                    month += text[i];
                case "D":
                    day += text[i];
            }
        }

        return year + "-" + month + "-" + day;
    };

    this.getPayee = function (line) {
        return mappings[bank].payee.getLine(line);
    };

    this.getCategory = function (line) {
        return "";
    };

    this.getMemo = function (line) {
        return mappings[bank].memo.getLine(line);
    };

    isIndicatorPositive = function (indicatorField) {
        console.log(indicatorField);
        if (indicatorField.contains(mappings[bank].positiveIndicator))
            return true;
        return false;
    };

    this.getInflow = function (line) {
        const bankMap = mappings[bank];
        let value = bankMap.inflow.getLine(line);
        let indicator = value;

        if (bankMap.seperateIndicator != null)
            indicator = bankMap.seperateIndicator.getLine(line);

        if (isIndicatorPositive(indicator)) {
            if (bankMap.seperateIndicator != null)
                value = value.replace(bankMap.positiveIndicator, "");
            return value;
        }

        return "0";
    };

    this.getOutflow = function (line) {
        const bankMap = mappings[bank];
        let value = bankMap.outflow.getLine(line);
        let indicator = value;
        console.log(bankMap.outflow);
        console.log(indicator);
        console.log(mappings[bank]);

        if (bankMap.seperateIndicator != null)
            indicator = bankMap.seperateIndicator.getLine(line);

        if (!isIndicatorPositive(indicator)) {
            if (bankMap.seperateIndicator != null)
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

StreamConverter = function () {
    const accounts = {};
    const map = new BankMapping(BankMapping.RABO);
    console.log(map);
    console.log(BankMapping.RABO);

    isErrorIndex = function (index, errors) {
        if (errors[index] != null)
            return true;
        return false;
    };

    this.convert = function (results, parser) {
        for (let index = 0, line; line = results.data[index]; ++index) {
            if (isErrorIndex(index, results.errors))
                continue;

            this.convertLine(line);
        }
    };

    this.convertLine = function (line) {
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

    this.errorHandle = function (error, file) {
        alert("An error occured in file " + file + ": " + error);
    };

    this.complete = function (results) {
        console.log("Complete");

        let keys = Object.keys(accounts);
        for (let index = 0, account; account = accounts[keys[index]]; ++index) {
            account.downloadCSV();
        }
    };
};