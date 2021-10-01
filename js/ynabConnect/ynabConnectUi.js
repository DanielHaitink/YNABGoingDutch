const YNABSettings = function (ynabConnect) {
	const ynabSettingsDiv = document.getElementById("ynab-settings");
	const invalidPatSpan = document.getElementById("pat-invalid");
	const ynabConnectedDiv = document.getElementById("ynab-connected");
	const testConnectionButton = document.getElementById("test-connection");
	const patInput = document.getElementById("pat");

	const makeConnection = async function (pat) {
		ynabConnect.connect(pat);
		return testConnection();
	}

	const hideElement = function (element) {
		element.style.display = "none";
	};

	this.showYnabSettings = function () {
		ynabSettingsDiv.classList.remove("slide-up")
		ynabSettingsDiv.classList.add("slide-down");
		ynabSettingsDiv.style.display = "block";
	};

	const hideYnabSettings = function () {
		ynabSettingsDiv.classList.remove("slide-down")
		ynabSettingsDiv.classList.add("slide-up");
		ynabSettingsDiv.style.display = "none";
	};

	const testConnection = async function (callback) {
		return await ynabConnect.testConnection();
	};

	const init = function () {
		hideYnabSettings();
		hideElement(invalidPatSpan);
		hideElement(ynabConnectedDiv);

		document.getElementById("ynab-settings-close").addEventListener("click", hideYnabSettings);

		testConnectionButton.addEventListener("click", function () {
			ynabConnect.connect(patInput.value);
			const response = testConnection();

			response.then((success) => {
				if (success) {
					window.localStorage.setItem("pat", patInput.value);
					ynabConnectedDiv.style.display = "block";
				}
				else {
					console.warn("Could not connect");
				}
			})
		});

			if (window.localStorage.getItem("pat") !== null) {
				ynabConnect.connect(window.localStorage.getItem("pat"));
				patInput.value = window.localStorage.getItem("pat");
				const promise = testConnection();

				promise.then((success) => {
					if (success) {
						notie.alert({type: "success", text: "Connected to YNAB!"});
						ynabConnectedDiv.style.display = "block";
					}
					else {
						notie.alert({type: "warning", text: "Previously used PAT could not be used!"});
					}
				});

				// const budgets = ynabConnect.getBudgets();
				// console.log(budgets)
				//
				// budgets.then((result) => {
				// 	console.log(result)
				//
				// 	for (const r of result) {
				// 		console.log(r.getName())
				// 		const accouts = r.getAccounts()
				//
				// 		accouts.then((accounts) => {
				// 			console.log(accounts)
				// 			const transaction = Transaction.createTransaction(accounts[0], "Albert Heijn", "2021-08-23", -77, "test")
				// 			// transaction.then((t) => {
				// 			// 	accounts[0].createTransaction(t)
				// 			//
				// 			// })
				// 			console.log(accounts[0].getName());
				// 		})
				// 	}
				// })
			}
	};

	init();
};