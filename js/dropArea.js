/**
 * DropArea handles file drops in the drop-area element.
 * @param onDrop {Function} A function that is called when files are dropped.
 * @constructor
 */
export const DropArea = function(onDrop) {
    const _dropArea = document.getElementById(DropArea.ID);

    const preventDefaults = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const addHighlight = (e) => {
        _dropArea.classList.add("highlight")
    };

    const removeHighlight = (e) => {
        _dropArea.classList.remove("highlight")
    };

    const handleDrop = (e) => {
        const dataTransfer = e.dataTransfer;

        onDrop(dataTransfer.files);
    };

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(
        eventName => _dropArea.addEventListener(eventName, preventDefaults, false));

    ['dragenter', 'dragover'].forEach(
        eventName => _dropArea.addEventListener(eventName, addHighlight, false));

    ['dragleave', 'drop'].forEach(
        eventName => _dropArea.addEventListener(eventName, removeHighlight, false));

    _dropArea.addEventListener("drop", handleDrop, false);
};

DropArea.ID = "drop-area";
