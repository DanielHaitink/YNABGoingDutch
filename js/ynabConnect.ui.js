(function () {
	const hideElement = function (element) {
		element.style.display = "none";
	};

	const ynabSettingsDiv = document.getElementById("ynab-settings");
	const showYnabSettings = function () {
		ynabSettingsDiv.style.display = "block";
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
		ynabConnect.testConnection();
	});
})();