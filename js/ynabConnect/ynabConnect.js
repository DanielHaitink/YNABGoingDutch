let api = null;

const YNABConnect = function (pat) {
	api = new window.ynab.API(pat)
	const _budgets = []

	this.testConnection = async function () {
		try {
			const user = await api.user.getUser();
			return true;
		} catch (err) {
			// if (error.hasOwnProperty("error")) {
			//
			// }
			console.error(err);
			return false;
		}
	};

	this.refresh = async function (callback) {
		this._budgets.clear();

		await this.getBudgets(callback);
	}

	this.getBudgets = async function () {
		if (_budgets.length > 0)
			return _budgets;

		const budgetsResponse = await api.budgets.getBudgets();

		for (const budget of budgetsResponse.data.budgets)
			_budgets.push(new YNABBudget(budget));

		return _budgets;
	};
};

const YNABBudget = function (budget) {
	const _accounts = [];
	const _payees = [];
	let _transactions = [];

	this.getId = () => budget.id;

	this.getName = () => budget.name;

	this.getAccounts = async function () {
		if (_accounts.length > 0)
			return _accounts;

		const accounts = await api.accounts.getAccounts(budget.id);

		console.log(accounts)

		for (const account of accounts.data.accounts)
			_accounts.push(new YNABAccount(account, this));

		return _accounts;
	};

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
			transactions.sort((a,b) => a.date < b.date || a.amount < b.amount || a.memo < b.memo || a.payee.name < b.payee.name)

			// TODO: update occurrence numbers of transactions

			const jsonTransactions = []
			transactions.forEach((a) => jsonTransactions.push(a.getYNABTransaction()));

			console.log(jsonTransaction)

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

	const createImportId = () => {
		_import_id = "YNAB:"+ amount.toString() + ":" + date + ":" + "1"
		// ID format: YNAB:amount:ISOdate:occurrence
		// TODO: gerate ID when executing the import. Occurrence should be unique within import
		// Sort imported transactions on: 1) date 2) amount 3) payee 4) memo
	}

	this.getYNABTransaction = function () {
		const transaction = {
			account_id: account.getId(),
			category_id: null,
			payee_name: payee.getName(),
			cleared: window.ynab.SaveTransaction.ClearedEnum.Cleared,
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

	createImportId();
};

Transaction.createTransaction = async function (account, payeeName, date, amount, memo) {
	const payee = await account.getPayee(payeeName);

	const ynabAmount = Math.floor(amount * 1000)

	console.log("payee")
	console.log(payee)
	console.log(payee.getName())
	console.log(payee.getId())

	return new Transaction(account, payee, date, ynabAmount, memo);
}