/**
 *
 * @param text {string}
 * @param options {[]}
 * @param callback {Function}
 * @param acceptText {string}
 * @param cancelText {string}
 * @param optionGroups {{}} optional option groups, create a dictionary with option names, containing a list of indices.
 * @constructor
 */
const SelectionPopup = function (text, options, callback, optionGroups = null, acceptText = "accept", cancelText = "cancel") {
    const element = document.createElement("div");
    const textElement = document.createElement("p");
    const acceptButton = document.createElement("button");
    const cancelButton = document.createElement("button");
    const selection = document.createElement("select");

    const close = () => {
        document.body.removeChild(element);
    };

    const createOption = (name, value) => {
        const optionElement = document.createElement("option");
        optionElement.value = (value).toString();
        optionElement.innerText = name;
        return optionElement;
    }

    const init = () => {
        element.id = SelectionPopup.ID;

        const parsedIndices = [];
        if (optionGroups != null) {
            for (const key in optionGroups) {
                const groupElement = document.createElement("optgroup");
                groupElement.label = key;
                selection.append(groupElement);

                for (const index of optionGroups[key]) {
                    groupElement.append(createOption(options[index], index.toString()));
                    parsedIndices.push(index);
                }
            }
        }

        let index = 0;
        for (const option of options) {
            if (parsedIndices.includes(index))
                continue;

            const optionElement = document.createElement("option");
            optionElement.value = (index++).toString();
            optionElement.innerText = option;
            selection.append(optionElement);
        }

        textElement.innerText = text;
        acceptButton.innerText = acceptText;
        acceptButton.className = "button-border";
        cancelButton.innerText = cancelText;
        cancelButton.className = "button-border";

        acceptButton.addEventListener("click", (event) => {
            callback(selection.value);
            close();
        });

        cancelButton.addEventListener("click", (event) => {
            callback(null);
            close();
        });

        element.append(textElement);
        element.append(selection);
        element.append(cancelButton);
        element.append(acceptButton)
        document.body.append(element);
    };

    init();
}


SelectionPopup.ID = "selection-popup"