const YNABSettings = function (ynabConnect, ynabStorage) {
	const ynabSettingsDiv = document.getElementById("ynab-settings");
	const invalidPatSpan = document.getElementById("pat-invalid");
	const ynabConnectedDiv = document.getElementById("ynab-connected");
	const testConnectionButton = document.getElementById("test-connection");
	const patInput = document.getElementById("pat");
	const syncInput = document.getElementById("auto-sync");

	const hideElement = function (element) {
		element.style.display = "none";
	};

	this.showYnabSettings = function () {
		ynabSettingsDiv.style.display = "block";
	};

	const hideYnabSettings = function () {
		ynabSettingsDiv.style.display = "none";
	};

	const testConnection = async function () {
		return await ynabConnect.testConnection();
	};

	const loadPat = function () {
		const pat = ynabStorage.getPat();

		if (pat !== null) {
			ynabConnect.connect(pat);
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
	};

	const init = function () {
		hideYnabSettings();
		hideElement(invalidPatSpan);
		hideElement(ynabConnectedDiv);

		document.getElementById("ynab-settings-close").addEventListener("click", hideYnabSettings);

		syncInput.addEventListener("change", (evt) => {
			ynabStorage.setAutoSync(syncInput.checked);
		})

		testConnectionButton.addEventListener("click", function () {
			let pat = patInput.value;
			ynabConnect.connect(pat);
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
			});
		});

		checkRetrieved();
	};

	init();
};