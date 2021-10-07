/**
 *
 * @param text {string}
 * @param callback {Function}
 * @param acceptText {string}
 * @param rejectText {string}
 * @constructor
 */
const QuestionPopup = function (text, callback, acceptText = "Yes", rejectText = "No") {
    const element = document.createElement("div");
    const textElement = document.createElement("p");
    const acceptButton = document.createElement("button");
    const rejectButton = document.createElement("button");

    const close = () => {
        document.body.removeChild(element);
    };

    const init = () => {
        element.id = QuestionPopup.ID;

        textElement.innerText = text;
        acceptButton.innerText = acceptText;
        acceptButton.className = "button-border";
        rejectButton.innerText = rejectText;
        rejectButton.className = "button-border";

        acceptButton.addEventListener("click", (event) => {
            callback(true);
            close();
        });

        rejectButton.addEventListener("click", (event) => {
            callback(false);
            close();
        });

        element.append(textElement);
        element.append(acceptButton)
        element.append(rejectButton);
        document.body.append(element);
    };

    init();
}

QuestionPopup.ID = "question-popup"