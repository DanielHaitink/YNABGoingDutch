/**
 * Holds data of the eventual CSV file, in YNAB format.
 * @param accountNumber {String} The unique number of the bank account.
 * @constructor
 */
const YNABAccountData = function (accountNumber) {
    const _header = ["Date", "Payee", "Category", "Memo", "Outflow", "Inflow"];
    const _data = [];

    /**
     * Add a line to the CSV.
     * @param data {{}} An array of strings.
     */
    this.addLine = (data) => {
        _data.push(data);
    };

    /**
     * Create syncable transactions for the YNAB api.
     * @return [Transaction]
     */
    this.getTransactions = ()  => {
        //TODO: create YNAB transactions
    };

    /**
     * Prompt a download for the new CSV file.
     */
    this.downloadCSV = () => {
        let blobText = "";
        blobText += _header.join(",");

        for (const line of _data) {
            blobText += "\"" + line.date + "\",\"" + line.payee + "\",\"" + line.category + "\",\"" +
                line.memo + "\",\"" + line.outflow + "\",\"" + line.inflow + "\"\r\n";
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