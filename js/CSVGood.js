/**
 * Streams a CSV file in chucks, in order to save RAM usage.
 * @param file {File} The file that should be streamed.
 * @param onStep {Function} The function that will be called when a line is parsed.
 * @param onError {Function} The function that will be called when an error occurs.
 * @param onComplete {Function} The function that will be called when the file stream has been finished.
 * @constructor
 */
const CSVGood = function (file, onStep, onError, onComplete) {
    let _header = null;
    let _numberOfCols = 0;
    let _firstLineParsed = false;
    let _incompleteRow = null;

    const FileRow = function (data, error) {
        this.data = data;
        this.error = error;
    };

    const FileStreamerResultStep = function (rows) {
        this.fields = _header;
        this.rows = rows;
    };

    const FileStreamerResultComplete = function () {
        this.file = file;
        this.fields = _header;
    };

    const isHeader = (line) => {
        // Look for empty spaces, dates and IBAN numbers
        const isNotHeaderRegex = /["']{2}[,;]|[,;]{2}|([\d]{1,4}[\-\/][\d]{1,2}[\-\/][\d]{1,4})|([A-Z]{2}\d{2}[A-Z]{4}\d{10})/g;
        return !isNotHeaderRegex.test(line);
    };

    const isFillerLine = (line) => {
        const fillerCutoff = 2; // Account for newlines

        const notBlank = (value) => {
            return String(value).length > 0;
        };

        const result = splitLineToFields(line).filter(notBlank);
        return result.length <= fillerCutoff;
    };

    const cleanFields = (fields) => {
        let cleanedFields = [];

        for (let field of fields) {
            field = field.replace(/(\r\n|\n|\r)/gm, "");

            // TODO: only remove , if the file is comma seperated! Could be part of a number
            if (field.endsWith(",") || field.endsWith(";"))
                field = field.substring(0, field.length - 1);

            if ((field.startsWith("\"") && field.endsWith("\"")) || (field.startsWith("\'") && field.endsWith("\'")))
                cleanedFields.push(field.substring(1, field.length - 1));
            else
                cleanedFields.push(field);
        }

        return cleanedFields;
    };

    const splitLineToFields = (line) => {
        // TODO: split on EITHER , or ;
        const splitFieldsRegex = /("(?:[^"]|"")*"|[^,|;"\n\r]*)(,|;|\r?\n|\r|(.+$))/g;

        let fields = line.match(splitFieldsRegex);

        return cleanFields(fields);
    };

    const convertRowToJson = (fields) => {
        let dict = {};

        if (_header !== null) {
            for (let index = 0; index < fields.length; ++index) {
                dict[_header[index]] = fields[index];
            }
        } else {
            for (let index = 0; index < fields.length; ++index) {
                dict[index] = fields[index];
            }
        }

        return dict;
    };

    const endsWithNewLine = (line) => {
        return (line.endsWith("\r") || line.endsWith("\n"));
    };

    const checkRowForErrors = (line, fields) => {
        let error = null;

        if (_firstLineParsed) {
            if (fields.length < _numberOfCols)
                error = "TooFewColumns";
            else if (fields.length > _numberOfCols)
                error = "TooManyColumns";
        }

        return error;
    };

    const isRowComplete = (line, fields) => {
        return endsWithNewLine(line);
    };

    const parseFirstRow = (line, fields) => {
        _firstLineParsed = true;
        _numberOfCols = fields.length;

        if (isHeader(line)) {
            _header = fields;
        }
    };

    const splitRows = (line) => {
        return line.match(/.*(\r?\n|\r|$)/g);
    };

    const createResult = (rowData) => {
        return new FileStreamerResultStep(rowData);
    };

    const fillIncompleteRow = (rows) => {
        // Complete previous incomplete row
        if (_incompleteRow !== null) {
            rows[0] = _incompleteRow + rows[0];
            _incompleteRow = null;
        }

        return rows;
    };

    const parseRow = (line) => {
        if (line === null || line === "")
            return null;

        if (!_firstLineParsed && isFillerLine(line))
            return null;

        const fields = splitLineToFields(line);

        if (!isRowComplete(line, fields)) {
            _incompleteRow = line;
            return null;
        }

        const error = checkRowForErrors(line, fields);

        if (!_firstLineParsed) {
            parseFirstRow(line, fields);

            // Don't return the header, if found
            if (_header)
                return null;
        }

        // Finish row
        return new FileRow(convertRowToJson(fields), error);
    };

    const parseRows = (rows) => {
        // Parse all rows
        let fileRows = [];

        for (const row of rows) {
            let fileRow = parseRow(row);

            if (fileRow !== null && fileRow !== undefined)
                fileRows.push(fileRow);
        }

        if (fileRows.length > 0)
            onStep(createResult(fileRows));
    };

    const completeStreaming = () => {
        if (_incompleteRow !== null && _incompleteRow !== undefined && _incompleteRow !== "") {
            const lastRow = _incompleteRow + "\n";
            _incompleteRow = null;
            onStep(createResult([parseRow(lastRow)]));
        }

        onComplete(new FileStreamerResultComplete());
    };

    const streamFile = () => {
        let loadedBytes = 0;
        let fileStepSize = 2048;
        let totalFileSize = file.size;
        let streamingProgress = 0;
        let fileReader = new FileReader();

        fileReader.onload = (evt) => {
            // Take result
            let rows = splitRows(evt.target.result);

            // Check rows for not completed
            rows = fillIncompleteRow(rows);

            // Parse all rows
            parseRows(rows);

            // Prepare for the second step
            loadedBytes += fileStepSize;
            streamingProgress = (loadedBytes / totalFileSize) * 100;

            if (loadedBytes <= totalFileSize) {
                // Parse the next part
                blob = file.slice(loadedBytes, loadedBytes + fileStepSize);
                fileReader.readAsText(blob);
            } else {
                // Completed streaming
                loadedBytes = totalFileSize;
                completeStreaming();
            }
        };

        let blob = file.slice(0, fileStepSize);
        fileReader.readAsText(blob);
    };

    streamFile();
};