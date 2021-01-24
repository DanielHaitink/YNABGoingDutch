/**
 * DropArea handles file drops in the drop-area element.
 * @param onDrop {Function} A function that is called when files are dropped.
 * @constructor
 */
export const DropArea = function(onDrop) {
    const _dropArea = document.getElementById(DropArea.ID);
    if (!_dropArea) {
        throw new Error("Expected element with ID to exist: " + DropArea.ID);
    }

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(
        eventName => _dropArea.addEventListener(
            eventName,
            (e) => {
                e.preventDefault();
                e.stopPropagation();
            },
            false
        ));

    ['dragenter', 'dragover'].forEach(
        eventName => _dropArea.addEventListener(
            eventName,
            (e) => _dropArea.classList.add("highlight"),
            false
        ));

    ['dragleave', 'drop'].forEach(
        eventName => _dropArea.addEventListener(
            eventName,
            (e) => _dropArea.classList.remove("highlight"),
            false
        ));

    _dropArea.addEventListener(
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

DropArea.ID = "drop-area";
