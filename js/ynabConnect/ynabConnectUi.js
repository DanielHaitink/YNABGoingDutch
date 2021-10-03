const YNABSettings = function (ynabConnect) {
	const ynabSettingsDiv = document.getElementById("ynab-settings");
	const invalidPatSpan = document.getElementById("pat-invalid");
	const ynabConnectedDiv = document.getElementById("ynab-connected");
	const testConnectionButton = document.getElementById("test-connection");
	const patInput = document.getElementById("pat");
	const syncInput = document.getElementById("auto-sync");
	const ynabStorage = new YNABSettingsStorage()

	const makeConnection = async function (pat) {
		ynabConnect.connect(pat);
		return testConnection();
	}

	const hideElement = function (element) {
		element.style.display = "none";
	};

	this.showYnabSettings = function () {
		ynabSettingsDiv.style.display = "block";
	};

	const hideYnabSettings = function () {
		ynabSettingsDiv.style.display = "none";
	};

	const testConnection = async function (callback) {
		return await ynabConnect.testConnection();
	};

	const loadPat = function () {
		const pat = ynabStorage.getPat();

		if (pat !== null) {
			ynabConnect = new YNABConnect(pat);
			patInput.value = pat;
			const promise = testConnection();

			promise.then((success) => {
				if (success) {
					notie.alert({type: "success", text: "Connected to YNAB!"});
					ynabConnectedDiv.style.display = "block";
				} else {
					notie.alert({type: "warning", text: "Previously used PAT could not be used!"});
				}
			});
		}
	};

	const setSettings = function () {
		syncInput.checked = ynabStorage.isAutoSync();
	};

	const checkRetrieved = function () {
		if (ynabStorage.isRetrieved()) {
			setSettings();
			loadPat();
		} else {
			setTimeout(checkRetrieved, 10);
		}
	}

	const init = function () {
		hideYnabSettings();
		hideElement(invalidPatSpan);
		hideElement(ynabConnectedDiv);

		document.getElementById("ynab-settings-close").addEventListener("click", hideYnabSettings);

		syncInput.addEventListener("change", (evt) => {
			ynabStorage.setAutoSync(syncInput.checked);
		})

		testConnectionButton.addEventListener("click", function () {
			ynabConnect.connect(patInput.value);
			const response = testConnection();

			response.then((success) => {
				if (success) {
					ynabStorage.setPat(pat);
					ynabConnectedDiv.style.display = "block";
				}
				else {
					notie.alert({type: "error", text: "Could not connect"});
					console.warn("Could not connect");
				}
			})
		});

			if (window.localStorage.getItem("pat") !== null) {
				ynabConnect.connect(window.localStorage.getItem("pat"));
				patInput.value = window.localStorage.getItem("pat");
				const promise = testConnection();

				checkRetrieved();

				// promise.then((success) => {
				// 	if (success) {
				// 		notie.alert({type: "success", text: "Connected to YNAB!"});
				// 		ynabConnectedDiv.style.display = "block";
				// 	}
				// 	else {
				// 		notie.alert({type: "warning", text: "Previously used PAT could not be used!"});
				// 	}
				// });

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

const YNABSettingsStorage = function () {
	let _autoSync = false;
	let _pat = "";
	let retrieved = false;

	this.isRetrieved = () => retrieved;

	this.export = function () {

	};

	this.import = function () {

	};

	this.setPat = (pat) => {
		_pat = pat;
		window.localStorage.setItem("pat", _pat)
	};

	this.setAutoSync = (bool) => {
		_autoSync = bool;
		window.localStorage.setItem("auto-sync", _autoSync.toString())
	};

	this.getPat = () => _pat;

	this.isAutoSync = () => _autoSync;

	const retrieveFromStorage = function () {
		if (window.localStorage.getItem("pat") !== null)
			_pat = window.localStorage.getItem("pat");
		if (window.localStorage.getItem("auto-sync") !== null)
			_autoSync = JSON.parse(window.localStorage.getItem("auto-sync").toLowerCase());

		retrieved = true;
	};

	const init = function () {
		window.addEventListener("load", () => retrieveFromStorage());
	};

	init();
}