const YNABConnect = function (PAT) {
	const _pat = PAT;

	this.testConnection = async function () {
		const api = new window.ynab.API(_pat);
		const budgetsResponse = await api.budgets.getBudgets();
		const budgets = budgetsResponse.data.budgets;
		for (let budget of budgets) {
			console.log("Found budget ", budget.name);

			const accountResponse = await api.accounts.getAccounts(budget.id);
			const accounts = accountResponse.data.accounts;
			for (let account of accounts) {
				console.log("Found account ", account.name);
			}
		}
	}
};