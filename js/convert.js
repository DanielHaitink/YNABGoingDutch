if (! (window.File && window.FileReader && window.FileList && window.Blob)) {
    alert("The File APIs are not fully supported in this browser.");
}

parse = () => {
    const files = document.getElementById("file").files;

    for (let index = 0, file; file = files[index]; ++index) {
        const converter = new StreamConverter();

        console.log(file);

        Papa.parse(file, {
            header: true,
            step: function (results, parser) {
                converter.convert(results, parser);
            },
            errors: function (error, file) {
                converter.errorHandle(error, file);
            },
            complete: function(results, file) {
                converter.complete(results);
            }
        });
    }
};

AccountData = function(accountNumber) {
    this.csvData = [["Date","Payee","Category","Memo","Outflow","Inflow"]];
    this.accountNumber = accountNumber;
    
    this.addLine = function(data) {
        this.csvData.push(data);
    };

    this.getDataBlob = function() {
        let blobText = "";

        for (let index = 0, line; line = this.csvData[index]; ++index) {
            blobText += line.join(';') + '\n';
        }

        console.log(blobText);
        //return new Blob(blobText);
    };
};

StreamConverter = function() {
    const accounts = {};

    isErrorIndex = function(index, errors) {
        if (errors[index] != null)
            return true;
        return false;
    };

    this.convert = function(results, parser) {
        console.log(results);
        console.log(parser);

        for (let index = 0, line; line = results.data[index]; ++index) {
            if (isErrorIndex(index, results.errors))
                continue;

            this.convertLine(line);
        }
    };

    parseDescription = function(line) {
        let description = line["Omschrijving-1"] + line["Omschrijving-2"] + line["Omschrijving-3"];
        
        return description;
    };

    parseInOutCome = function(amount) {
        let income, outcome = "0";

        console.log(amount);
        
        if (amount.startsWith('-'))
            outcome = amount.replace('-', '');
        else 
            income = amount.replace('+', '')

        return {
            income: income,
            outcome: outcome
        }
    };

    this.convertLine = function(line) {
        if (accounts[line["IBAN/BBAN"]] == null)
            accounts[line["IBAN/BBAN"]] = new AccountData(line["IBAN/BBAN"]);

        const inOutCome = parseInOutCome(line["Bedrag"]);

        const dataRow = [
            line["Datum"],
            line["Tegenrekening IBAN/BBAN"],
            "",
            parseDescription(line),
            inOutCome["outcome"],
            inOutCome["income"]
        ];

        accounts[line["IBAN/BBAN"]].addLine(dataRow);
    };

    this.errorHandle = function(error, file) {
        alert("An error occured in file " + file + ": " + error);
    };

    this.complete = function(results) {
        console.log("COMPLETE");
        console.log(accounts);

        let keys = Object.keys(accounts);
        for (let index = 0, account; account = accounts[keys[index]]; ++ index) {
            alert(index);
            account.getDataBlob();
        }
    };
};