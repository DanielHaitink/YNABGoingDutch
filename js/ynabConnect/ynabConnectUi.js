(function () {
	const hideElement = function (element) {
		element.style.display = "none";
	};

	const ynabSettingsDiv = document.getElementById("ynab-settings");
	const showYnabSettings = function () {
		ynabSettingsDiv.style.display = "block";
		const ynabConnect = new YNABConnect(window.localStorage.getItem("pat"));
		ynabConnect.testConnection();
	};
	const hideYnabSettings = function () {
		hideElement(ynabSettingsDiv);
	};

	document.getElementById("toggle-ynab-settings").addEventListener("click", showYnabSettings);
	document.getElementById("ynab-settings-close").addEventListener("click", hideYnabSettings);
	hideYnabSettings();



	const invalidInputSpan = document.getElementById("pat-input-invalid");
	const validInputSpan = document.getElementById("pat-input-valid");
	const invalidPatSpan = document.getElementById("pat-invalid");
	hideElement(validInputSpan);
	hideElement(invalidPatSpan);

	const ynabConnectedDiv = document.getElementById("ynab-connected");
	hideElement(ynabConnectedDiv);

	const patInput = document.getElementById("pat");
	const validatePatInput = function () {
		invalidInputSpan.style.display = (!patInput.value) ? "inline" : "none";
		validInputSpan.style.display = (!patInput.value) ? "none" : "inline";
	}
	patInput.addEventListener("keyup", validatePatInput);
	patInput.addEventListener("blur", validatePatInput);
	patInput.addEventListener("onpaste", validatePatInput);

	const loadYnabDataLink = document.getElementById("load-ynab-data");
	loadYnabDataLink.addEventListener("click", function () {
		const ynabConnect = new YNABConnect(patInput.value);
		window.localStorage.setItem("pat", patInput.value)
		ynabConnect.testConnection();
	});

	// TODO: wait until page is loaded

	window.addEventListener("load", () => {
		if (window.localStorage.getItem("pat") !== null) {
			const ynabConnect = new YNABConnect(window.localStorage.getItem("pat"));
			ynabConnect.testConnection();

			const budgets = ynabConnect.getBudgets();
			console.log(budgets)

			budgets.then((result) => {
				console.log(result)

				for (const r of result) {
					console.log(r.getName())
					const accouts = r.getAccounts()

					accouts.then((accounts) => {
						console.log(accounts)
						const transaction = Transaction.createTransaction(accounts[0], "Albert Heijn", "2021-08-23", -77, "test")
						transaction.then((t) => {
							accounts[0].createTransaction(t)

						})
						console.log(accounts[0].getName());
					})
				}
			})
		}
	});
})();