/**
 * DropArea handles file drops in the drop-area element.
 * @param element {HTMLElement}
 * @param onDrop {(files: FileList) => void} A function that is called when files are dropped.
 * @constructor
 */
export const DropArea = function(element, onDrop) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(
        eventName => element.addEventListener(
            eventName,
            (e) => {
                e.preventDefault();
                e.stopPropagation();
            },
            false
        ));

    ['dragenter', 'dragover'].forEach(
        eventName => element.addEventListener(
            eventName,
            (e) => element.classList.add("highlight"),
            false
        ));

    ['dragleave', 'drop'].forEach(
        eventName => element.addEventListener(
            eventName,
            (e) => element.classList.remove("highlight"),
            false
        ));

    element.addEventListener(
        "drop",
        (e) => {
            const dataTransfer = e.dataTransfer;
            if (!dataTransfer) {
                throw new Error("Expected event to have a DataTransfer object")
            }
            onDrop(dataTransfer.files);
        },
        false
    );
};
