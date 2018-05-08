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

BankMapping = function () {
    field = function (fieldList, splitBefore = null, splitAfter = null) {
        getFields = function (line) {
            returnLine = "";

            for (let index = 0, field; field = fieldList[index]; ++index) {
                returnLine += field;
            }

            return returnLine;
        };

        getLine = function (line) {
            let text = getFields(line);
            if (splitAfter)
                text = text.split(splitAfter, 1)[1];
            if (splitBefore)
                text = text.split(splitBefore, 1)[0];
            return text;
        };
    };

    const DEFAULT_DATE_FORMAT = "YYYY-MM-DD";

    const mappings = {
        rabo = {
            date: new field(["Datum"]),
            dateFormat: "YYYY-MM-DD",
            payee: new field(["Naam Tegenpartij"]),
            category: new field([]),
            memo: new field(["Omschrijving-1", "Omschrijving-2", "Omschrijving-3"]),
            outflow: new field(["Bedrag"]),
            inflow: new field(["Bedrag"]),
            positiveIndicator: "+",
            negativeIndicator: "-"
        },
        ing = {
            date: new field(["Datum"]),
            dateFormat: "YYYYMMDD",
            payee: new field(["Mededelingen"]),
            category: new field([]),
            memo: new field(["Mededelingen"]),
            outflow: new field(["Bedrag"]),
            inflow: new field(["Bedrag"]),
            positiveIndicator: "Bij",
            negativeIndicator: "Af",
            seperateIndicator: ["Af Bij"]
        }
    };

    getDate = function(line, bank) {
        dateField = mappings[bank].date;
        text = dateField.getLine(line);
        dateFormat = mappings[bank].dateFormat;

        if dateFormat == 
        
        let year, month, day = "";
        for (let i = 0, letter; letter = text[i]; ++i) {
            switch(letter) {
                case "Y":
                    year += letter;
                case "M":
                    month += letter;
                case "D":
                    day += letter;
            }
        }

    };

};

StreamConverter = function () {
    const accounts = {};

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

    parseDescription = function (line) {
        return '\"' + line["Omschrijving-1"] + line["Omschrijving-2"] + line["Omschrijving-3"] + '\"';
    };

    parseInOutCome = function (amount) {
        let income, outcome = "0";

        if (amount.startsWith('-'))
            outcome = amount.replace('-', '');
        else
            income = amount.replace('+', '')

        return {
            outcome: outcome,
            income: income
        }
    };

    this.convertLine = function (line) {
        if (accounts[line["IBAN/BBAN"]] == null)
            accounts[line["IBAN/BBAN"]] = new AccountData(line["IBAN/BBAN"]);

        const inOutCome = parseInOutCome(line["Bedrag"]);

        const dataRow = [
            line["Datum"],
            line["Naam tegenpartij"],
            "",
            parseDescription(line),
            inOutCome["outcome"],
            inOutCome["income"]
        ];

        accounts[line["IBAN/BBAN"]].addLine(dataRow);
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