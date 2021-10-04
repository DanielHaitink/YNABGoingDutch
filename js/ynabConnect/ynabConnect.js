let api = null;
// TODO: integrate api into YNABConnect

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
			const user = await api.user.getUser();
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
 * @param budget ynab budget obtained by the API.
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

const YNABAccount = function (account, budget) {
	this.getId = () => account.id;

	this.getName = () => account.name;

	this.createTransaction = async function (transaction) {
		try {
			const jsonTransaction = transaction.getYNABTransaction();

			console.log(jsonTransaction)

			await api.transactions.createTransaction(budget.getId(),{transaction: jsonTransaction});
		}
		catch (err) {
			console.error("ERROR");
			console.error(err)
		}
	};

	this.createTransactions = async function (transactions) {
		try {
			transactions.sort((a,b) => a.date < b.date || a.amount < b.amount || a.memo < b.memo)

			//|| (a.payee !== null && b.payee !==null && a.payee.name < b.payee.name)

			// TODO: update occurrence numbers of transactions

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

			await api.transactions.createTransactions(budget.getId(),{transactions: jsonTransactions});
		}
		catch (err) {
			console.error("ERROR");
			console.error(err)
		}
	}

	this.getPayee = async function (payeeName) {
		return await budget.getPayee(payeeName);
	};

	this.createImportId = function (date, amount) {
		"YNAB:"+ str(amount) + ":" + str(date) + ":" + "-1"
	};
};

const YNABPayee = function (payee) {
	this.isName = function (name) {
		return payee.name === name;
	}

	this.getName = () => payee.name;

	this.getId = () => payee.id;
};

YNABPayee.createNewPayee = function (name) {
	return new YNABPayee({name: name, id: null});
}

const Transaction = function (account, payee, date, amount, memo) {
	let _import_id = null;

	const createImportId = (occurrence) => {
		_import_id = "YNAB:"+ amount.toString() + ":" + date + ":" + occurrence.toFixed(0);
		// ID format: YNAB:amount:ISOdate:occurrence
		// TODO: gerate ID when executing the import. Occurrence should be unique within import
		// Sort imported transactions on: 1) date 2) amount 3) payee 4) memo
	};

	this.getDate = () => date;

	this.getAmount = () => amount;

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

Transaction.createTransaction = async function (account, payeeName, date, amount, memo) {
	const payee = await account.getPayee(payeeName);

	const ynabAmount = Math.floor(amount * 1000)

	if (memo.length > 200) {
		// clean memo
		memo = memo.replace( /\s{2,}/g, ' ' );

		if (memo.length > 200) // if still too long, cut memo
			memo = memo.slice(0, 199);

		console.log("memo too long, split memo");
	}

	return new Transaction(account, payee, date, ynabAmount, memo);
}