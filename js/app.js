const App = function () {
    let dropArea = null;
    let bankMapLoaded = false;
    let bankMap = new BankMap("banks.json", () => bankMapLoaded = true);
    const ynabConnect = new YNABConnect();
    const settingsStorage = new YNABSettingsStorage();
    const ynabSettings = new YNABSettings(ynabConnect, settingsStorage);
    const converter = new Converter(bankMap, e => finishConvert(e));

    /**
     * Parse a file as a stream.
     * @param file {File} A file that should be converted.
     */
    const parseFile = function (file) {
        converter.clear();

        new CSVGood(file,
            (result) => {
                converter.convert(result);
            },
            (error) => {
                converter.handleError(error, file);
            },
            (result) => {
                converter.complete(result);
            }
        );
    };

    const finishConvert = (data) => {
        const fallbackPopup = (accountData) => {
            new QuestionPopup("Would you like to download the CSV?", (answer) => {
                if (answer) {
                    accountData.downloadCSV();
                }
            });
        };

        const syncAccount = (account, accountData) => {
            if (account == null)
                return fallbackPopup(accountData);

            console.log(account.getName());
            accountData.getTransactions(account).then(
                (transactions) => {
                    if (transactions == null)
                        return fallbackPopup(accountData);

                    console.log(transactions);
                    const promise = account.createTransactions(transactions);

                    promise.then(
                        () => {
                            notie.alert({type: "success", text: "Synced the transactions.", position: "bottom"});
                        }
                    );

                    promise.catch(
                        (error) => {
                            notie.alert({
                                type: "error",
                                text: "Error while syncing the transactions.",
                                position: "bottom"
                            });
                        }
                    );
                }
            );
        };

        const chooseAccount = (budget, accountData, accountName) => {
            if (budget == null)
                return fallbackPopup(accountData);

            console.log(budget.getName());
            budget.getAccounts().then(
                (accounts) => {
                    if (accounts == null)
                        return fallbackPopup(accountData);

                    const accountNames = [];
                    const closed = [];
                    const tracking = [];
                    const onBudget = [];
                    accounts.forEach((e, i) => {
                        accountNames.push(e.getName());

                        if (e.isClosed())
                            closed.push(i)
                        else if (!e.isOnBudget())
                            tracking.push(i);
                        else
                            onBudget.push(i);
                    });


                    new SelectionPopup("Which account for " + accountName + "?", accountNames,
                        (e) => syncAccount(accounts[e], accountData),
                        {"Budget": onBudget, "Tracking": tracking, "Closed": closed});
                }
            )
        };

        for (const [key, value] of Object.entries(data)) {
            console.log(key);


            if (settingsStorage.isAutoSync() && ynabConnect.isConnected()) {
                ynabConnect.getBudgets().then(
                    (budgets) => {
                        if (budgets == null)
                            return fallbackPopup(value);

                        const budgetNames = [];
                        budgets.forEach(e => budgetNames.push(e.getName()))
                        new SelectionPopup("Which budget for " + key + "?", budgetNames, (e) => chooseAccount(budgets[e], value, key));
                    }
                );
            } else {
                // Download file
                value.downloadCSV();
            }
        }
    };

    const init = () => {
        document.getElementById("drop-input").addEventListener("change", () => {
            const _input = document.getElementById("drop-input");

            for (const file of _input.files)
                parseFile(file);

            _input.value = "";
        });

        dropArea = new DropArea((files) => {
            for (const file of files)
                parseFile(file);
        });

        document.getElementById("settings-cog").addEventListener("click", () => {
            ynabSettings.showYnabSettings();
        })
    };

    init();
};

window.addEventListener("load", () => new App());
