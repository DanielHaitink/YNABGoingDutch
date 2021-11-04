let api = null;
// TODO: integrate api into YNABConnect

/**
 * Connection class with the YNAB api.
 * @constructor
 */
const YNABConnect = function () {
    const _budgets = []
    let _pat = null;
    let _connected = false;
    //TODO: store number of connections within past hour (max 100 per hour allowed)

    /**
     * Connect through the API with the given PAT.
     * @param pat {string} Personal Access Token
     */
    this.connect = (pat) => {
        _pat = pat;
        api = new window.ynab.API(pat)
    };

    /**
     * Check if the API is connected.
     * @return {boolean}
     */
    this.isConnected = () => _connected;

    /**
     * Test the connection with the YNAB server.
     * @return {Promise<boolean>} A promise.
     */
    this.testConnection = async function () {
        try {
            await api.user.getUser();
            _connected = true;
        } catch (err) {
            console.error(err);
            _connected = false;
        }

        return _connected;
    };

    /**
     * Refresh all the budgets of the account.
     * @return {Promise<void>} A promise.
     */
    this.refresh = async function () {
        this._budgets.clear();

        await this.getBudgets();
    }

    /**
     * Obtain the budgets of the account.
     *
     * @return {Promise<*[YNABBudget]>} A promise.
     */
    this.getBudgets = async function () {
        if (_budgets.length > 0)
            return _budgets;

        const budgetsResponse = await api.budgets.getBudgets();

        for (const budget of budgetsResponse.data.budgets)
            _budgets.push(new YNABBudget(budget));

        return _budgets;
    };
};

/**
 * A YNAB budget. Contains the payees, transactions and accounts.
 * @param budget {{}} ynab budget obtained by the API.
 * @constructor
 */
const YNABBudget = function (budget) {
    const _accounts = [];
    const _payees = [];
    let _transactions = [];

    /**
     * Get the id of the budget.
     */
    this.getId = () => budget.id;

    /**
     * Get the name of the budget.
     */
    this.getName = () => budget.name;

    /**
     * Obtain the accounts of the budget.
     * @return {Promise<*[YNABAccount]>} A promise.
     */
    this.getAccounts = async function () {
        if (_accounts.length > 0)
            return _accounts;

        const accounts = await api.accounts.getAccounts(budget.id);

        console.log(accounts)

        for (const account of accounts.data.accounts)
            _accounts.push(new YNABAccount(account, this));

        return _accounts;
    };

    /**
     * Obtain the payees of the budget.
     * @return {Promise<void>} A promise.
     * @private
     */
    this._getPayees = async function () {
        if (_payees.length > 0)
            return;

        const payees = await api.payees.getPayees(this.getId());

        console.log(payees)

        for (const payee of payees.data.payees)
            _payees.push(new YNABPayee(payee));
    }

    const getTransactions = async function () {
        const transactionResult = await api.transactions.getTransactions(budget.id);

        _transactions = transactionResult.data.transactions.reverse();

        console.log(_transactions)
    }

    /**
     * Get a payee based on the name.
     * If no payee is found with the given name, a new payee will be created.
     * @param payeeName {string} Name of the Payee.
     * @return {Promise<YNABPayee|*>} A promise.
     */
    this.getPayee = async function (payeeName) {
        await this._getPayees();

        for (const payee of _payees)
            if (payee.isName(payeeName)) {
                console.log("found payee")
                return payee;
            }

        return YNABPayee.createNewPayee(payeeName);
    };
};

/**
 * A YNAB account. Can create transactions.
 * @param account {{}} Ynab account information obtained by the api.
 * @param budget {YNABBudget} YNAB parent budget.
 * @constructor
 */
const YNABAccount = function (account, budget) {
    this.getId = () => account.id;

    this.getName = () => account.name;

    this.isOnBudget = () => account.on_budget;

    this.isClosed = () => account.closed;

    this.createTransaction = async function (transaction) {
        try {
            const jsonTransaction = transaction.getYNABTransaction(1);

            console.log(jsonTransaction)

            await api.transactions.createTransaction(budget.getId(), {transaction: jsonTransaction});
        } catch (err) {
            console.error("ERROR");
            console.error(err)
        }
    };

    /**
     * Create transactions and sync these with YNAB.
     * @param transactions {[Transaction]} Transactions to sync.
     * @return {Promise<void>}
     */
    this.createTransactions = async function (transactions) {
        try {
            transactions.sort((a, b) => a.getDate() < b.getDate() || a.getAmount() < b.getAmount() || a.getMemo() < b.getMemo())

            //|| (a.payee !== null && b.payee !==null && a.payee.name < b.payee.name)

            const jsonTransactions = [];
            let date = null;
            let amount = null;
            let occurrence = 1;
            transactions.forEach((a) => {
                if (a.getDate() === date && a.getAmount() === amount) {
                    occurrence += 1;
                } else {
                    date = a.getDate();
                    amount = a.getAmount();
                    occurrence = 1;
                }

                jsonTransactions.push(a.getYNABTransaction(occurrence));
            });

            console.log(jsonTransactions)

            await api.transactions.createTransactions(budget.getId(), {transactions: jsonTransactions});
        } catch (err) {
            console.error("ERROR");
            console.error(err)
        }
    }

    /**
     * Get a payee by name.
     * @param payeeName {string} The name of the payee.
     * @return {Promise<YNABPayee|*>}
     */
    this.getPayee = async function (payeeName) {
        return await budget.getPayee(payeeName);
    };
};

/**
 * A YNAB payee. contains the name of the payee and ID.
 * @param payee {{name, id}} YNAB payee information obtained by the API.
 * @constructor
 */
const YNABPayee = function (payee) {
    this.isName = function (name) {
        return payee.name === name;
    }

    this.getName = () => payee.name;

    this.getId = () => payee.id;
};

/**
 * Create a new YNABPayee.
 * @param name {string} Name of the payee.
 * @return {YNABPayee}
 */
YNABPayee.createNewPayee = function (name) {
    return new YNABPayee({name: name, id: null});
}

/**
 * A transaction of YNAB.
 * @param account {YNABAccount} The YNAB account of the transaction.
 * @param payee {YNABPayee} The payee of the transaction.
 * @param date {string} ISO date of the transaction.
 * @param amount {Number} Amount payed or received.
 * @param memo {string} Memo. Max 200 characters.
 * @constructor
 */
const Transaction = function (account, payee, date, amount, memo) {
    let _import_id = null;

    const createImportId = (occurrence) => {
        _import_id = "YNAB:" + amount.toString() + ":" + date + ":" + occurrence.toFixed(0);
        // ID format: YNAB:amount:ISOdate:occurrence
        // Sort imported transactions on: 1) date 2) amount 3) payee 4) memo
    };

    /**
     * Get the ISO date of the transaction. Format is YYYY-MM-DD.
     * @return {string}
     */
    this.getDate = () => date;

    /**
     * Get the amount of the transaction.
     * @return {Number}
     */
    this.getAmount = () => amount;

    /**
     * Get the memo of the transaction.
     * @return {string}
     */
    this.getMemo = () => memo;

    /**
     * Obatain a JSON transaction to be synced with YNAB.
     * @param occurrence {Number} The occurrence of the transaction. This is necessary for the import ID.
     * @return {{date: string, approved: boolean, amount: Number, account_id, category_id: null, import_id: null, payee_name, memo: string, cleared: (string|*)}}
     */
    this.getYNABTransaction = function (occurrence) {
        createImportId(occurrence);

        const transaction = {
            account_id: account.getId(),
            category_id: null,
            payee_name: payee.getName(),
            cleared: window.ynab.SaveTransaction.ClearedEnum.Uncleared,
            approved: true,
            date: date, // YYYY-MM-DD
            amount: amount,
            memo: memo,
            import_id: _import_id,
        }

        if (payee.getId() !== null)
            transaction.payee_id = payee.getId();

        return transaction;
    }
};

/**
 * Create a new transaction.
 * @param account {YNABAccount} The account which made this transaction.
 * @param payeeName {string} The name of the payee/receiver.
 * @param date {string} The ISO date of the transaction.
 * @param amount {Number} The amount payed or received.
 * @param memo {string} The memo.
 * @return {Promise<Transaction>}
 */
Transaction.createTransaction = async function (account, payeeName, date, amount, memo) {
    const payee = await account.getPayee(payeeName);

    const ynabAmount = Math.floor(amount * 1000)

    if (memo.length > 200) {
        // clean memo
        memo = memo.replace(/\s{2,}/g, ' ');

        if (memo.length > 200) // if still too long, cut memo
            memo = memo.slice(0, 199);

        console.log("memo too long, split memo");
    }

    return new Transaction(account, payee, date, ynabAmount, memo);
}