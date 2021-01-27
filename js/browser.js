import { DropArea } from "./dropArea.js";
import notie from "./notie/notie.es6.js";
import { BankMapper, YNABConverter } from "./convert.js";

let bankMap = null;

/**
 * @param files {FileList}
 */
function handleFiles(files) {
  const parseFiles = () => {
    for (const file of files) {
      YNABConverter.convert(file, (error, result) => {
        if (error) {
          notie.alert({
            type: "error",
            text: "An error occurred in file " + file.name + ": " + error,
            position: "bottom",
          });
        } else if (result) {
          notie.alert({
            type: "success",
            text:
              file.name +
              " is completed successfully. Converted as " +
              result.bankName,
            position: "bottom",
          });
          Object.keys(result.accounts).forEach((accountKey) => {
            const account = result.accounts[accountKey];
            const blob = new Blob([account.toString()], {
              type: "text/csv;charset=utf-8;",
            });

            if (navigator.msSaveBlob) {
              // IE 10+
              navigator.msSaveBlob(blob, account.getSuggestedFilename());
            } else {
              const link = document.createElement("a");

              if (link.download !== undefined) {
                let url = URL.createObjectURL(blob);

                link.setAttribute("href", url);
                link.setAttribute("download", account.getSuggestedFilename());
                link.style.visibility = "hidden";

                document.body.appendChild(link);

                link.click();
              }
            }
          });
        }
      });
    }
  };

  if (bankMap === null) {
    bankMap = new BankMap("banks.json", () => parseFiles());
  } else {
    parseFiles();
  }
}

/**
 * A mapping, which maps the bank CSVs to the YNAB format.
 * @param file {string} The path to the file containing the JSON mapping.
 * @param onComplete {Function} The function that is called when the mapping is loaded.
 * @constructor
 */
const BankMap = function (file, onComplete) {
  const loadJsonFile = () => {
    const rawFile = new XMLHttpRequest();

    rawFile.overrideMimeType("application/json");
    rawFile.open("GET", file, true);

    rawFile.onreadystatechange = function () {
      if (rawFile.readyState === 4 && rawFile.status === 200) {
        BankMapper.setMappings(JSON.parse(rawFile.responseText));
        onComplete();
      }
    };

    rawFile.send(null);
  };

  loadJsonFile();
};

/**
 * @param {HTMLInputElement} input
 * @param {HTMLElement} dropArea
 */
export function init(input, dropArea) {
  input.onchange = () => {
    if (!input.files) {
      throw new Error("Expected input element to hold files");
    }
    handleFiles(input.files);
    input.value = "";
  };
  new DropArea(dropArea, handleFiles);
}
