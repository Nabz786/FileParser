const FileHound = require("filehound");
const fs = require("fs");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

/* Array of files to read from*/
let filesToRead = [];

/* Elements to obtain data for */
const elements = [
    "input",
    "textarea",
    "kendo-dropdownlist",
    "kendo-datepicker",
    "kendo-numerictextbox"
];
let finalOutput = [];

/**
 * This method obtains all elements of a specified type in the elements array,
 * Then obtains the desired metadata for the specified element, by looking
 * at the attributes of the element.
 * @param textFile: file to read from
 * @param fileName: name of current file
 */
function getElementData(textFile, fileName) {
    //Create a DOM document with the passed in string of html code
    // let doc = new DOMParser().parseFromString(textFile, "text/html");
    let doc = new JSDOM(textFile, {
        contentType: "text/html"
    });

    //Start by obtaining all elements of a specified type, the type
    //is obtained from elements[] above
    for (let elementType = 0; elementType < elements.length; elementType++) {
        let elemArr = doc.window.document.getElementsByTagName(elements[elementType]);

        //For each element we captured, obtain the desired metadata
        for (let i = 0; i < elemArr.length; i++) {
            let bindingPropertyName = getBindingPropName(elemArr[i]);
            let actualFieldName = "";

            //(If) an element is of type 'textarea' check whether it has a label containing
            //the field name, if not check the parent node for the field name
            //(Else If) an element is of type 'kendo-numerictextbox', recursively move up the list of
            //parent nodes until we find the field name
            //(Else) The field name will be the innertext of the current elements parent element
            if (elements[elementType] === "textarea") {
                elemArr[i].labels.length > 0 ?
                    (actualFieldName = elemArr[i].labels[0].textContent.trim()) :
                    (actualFieldName = elemArr[i].parentNode.textContent.trim());
            } else if (elements[elementType] === "kendo-numerictextbox") {
                actualFieldName = checkParentNode(elemArr[i]);
            } else {
                actualFieldName = elemArr[i].parentNode.textContent.trim();
            }

            let htmlFileName = fileName.slice(fileName.lastIndexOf("\\") + 1,
                fileName.indexOf(".component"));
            // let htmlFileName = fileName;
            let min = "N/A";
            let max = "N/A";
            let autoCorrect = "N/A";

            let inputType = "";
            //(If) our element of of type <input> check if it is a
            //Kendotextbox or regular checkbox element
            //(Else) Set the input type to the type
            //of elements currently in the elemArr
            if (elements[elementType] === "input") {
                elemArr[i].type == "checkbox" ?
                    (inputType = "checkbox") :
                    (inputType = isKendoTextBox(elemArr[i]));
            } else {
                inputType = elements[elementType];
            }

            //If the element is a 'numeric text box' we must obtain
            //other info: min, max: autocorrect
            if (elements[elementType] === "kendo-numerictextbox") {
                let kendoValues = getKendoNumericValues(elemArr[i]);
                min = kendoValues.min;
                max = kendoValues.max;
                autoCorrect = kendoValues.autoCorrect;
            }

            console.log("Actual Field Name" + actualFieldName);
            console.log("BindingPropertyName: " + bindingPropertyName);
            console.log("inputType: " + inputType);
            console.log("fileName: " + htmlFileName);
            console.log("min: " + min);
            console.log("max: " + max);
            console.log("autocorrect: " + autoCorrect);

            //Create a JSON object with the collected info
            finalOutput.push({
                ActualFieldName: actualFieldName,
                BindingPropertyName: bindingPropertyName,
                inputType: inputType,
                fileName: htmlFileName,
                min: min,
                max: max,
                autoCorrect: autoCorrect
            });
        }
    }
}

/**
 * Recursively checks an elements parent node until
 * we find the field name for a field.
 * The field name is equivalent to an element having an innertext value
 * @param elem - element to check parent node(s) for a field name
 * @returns string - field name of element
 */
function checkParentNode(elem) {
    if (elem.parentNode.textContent.trim().length > 0)
        return elem.parentNode.textContent.trim();

    return checkParentNode(elem.parentNode);
}


/**
 * Gets the name of an input element by looking at
 * the [(ngModel)] or [value] bindings.
 * @param elem: element to obtain name for
 * @returns string: property binding name for element passed in
 */
function getBindingPropName(elem) {
    let tempName = "";

    if (elem.hasAttribute("[(ngModel)]")) {
        tempName = elem.getAttribute("[(ngModel)]");
    } else if (elem.hasAttribute("[(value)]")) {
        tempName = elem.getAttribute("[(value)]");
    } else if (elem.hasAttribute("[value]")) {
        tempName = elem.getAttribute("[value]");
    } else {
        tempName = elem.getAttribute("id");
    }

    //Shorten the name of the element by removing the data before '.'
    return tempName.indexOf(".") === -1 ?
        tempName :
        tempName.slice(tempName.indexOf(".") + 1, tempName.length);
}

/**
 * Returns a JSON object with data obtained
 * from elements of type 'kendoNumericTextbox'
 * @param elem: element to obtain data for
 * @returns JSON object containing meta data for element passed in
 */
function getKendoNumericValues(elem) {
    let kendoValues = {
        min: "Null",
        max: "Null",
        autoCorrect: "Null"
    };

    if (elem.hasAttribute("[min]")) {
        kendoValues.min = elem.getAttribute("[min]");
    }
    if (elem.hasAttribute("[max]")) {
        kendoValues.max = elem.getAttribute("[max]");
    }
    if (elem.hasAttribute("autocorrect")) {
        kendoValues.autoCorrect = elem.getAttribute("[autocorrect]");
    }
    return kendoValues;
}

/**
 * Checks whether an element is of type 'kendotextbox'
 * @param elem : element to check
 * @returns boolean: true or false depending on if an element is of type 'kendotextbox'
 */
function isKendoTextBox(elem) {
    if (elem.hasAttribute("kendotextbox")) {
        return "kendoTextBox";
    }
}

/**
 * Reads local file by creating a GET request
 * After file is loading as text it is passed to
 * getElementData()
 * @param file : file to load
 */
function readTextFile(file) {
    let fileContents = fs.readFileSync(file);
    getElementData(fileContents, file);
}

/**
 * Writes collected meta-data to JSON file
 * @param jsonData: Data to write to file 
 */
function exportToJson(jsonData) {
    fs.writeFileSync("test1.json", JSON.stringify(jsonData));
}

/**
 * Using filehound library, gets all component files
 */
function loadFilesToRead() {
    const files = FileHound.create()
        .paths("../../app")
        .ext("html")
        .findSync();
    filesToRead = files;
}

/**
 * For each file in the array of files, obtain the specified info.
 * Then export the collected information.
 */
function main() {
    loadFilesToRead();

    filesToRead.shift();

    for (x in filesToRead) {
        readTextFile(filesToRead[x]);
    }

    exportToJson(finalOutput);
}

main();