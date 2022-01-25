window.jsPDF = window.jspdf.jsPDF;

$("button").click(function () {
    var name = $(this).attr("id");
    if (name == "saveProgress") {
        saveInputs();
        generateJSONSave();
    } else if (name == "first") {
        saveInputs();
        firstRiskArea();
    } else if (name == "back") {
        saveInputs();
        previousRiskArea();
    } else if (name == "generate") {
        saveInputs();
        generateDocumentation();
    }
});

function parseIntString(riskAreaString) {
    return riskAreaString.match(/\d*$/)[0];
}

function getCookie(name) {
    let re = new RegExp((name += "=([^;]+)"));
    let value = re.exec(document.cookie);
    return value != null ? unescape(value[1]) : null;
}

$(document).ready(function () {
    var lastRiskArea = parseIntString(getCookie("lastRiskArea"));
    document.cookie = "currentRiskArea=overview;";
    var overallInformation = JSON.parse(localStorage.getItem("overall"));
    var securityPropertyNames = overallInformation.uniqueSecurityPropertyNames;
    var BIToIntegerScore = {};
    var integerToBIScore = {};
    var RAToIntegerScore = {};
    var integerToRAScore = {};
    let riskAreaNav = getCookie("lastRiskArea").match(/\d*$/);
    var navObject = JSON.parse(sessionStorage.getItem("navigation"));
    for (let i = 1; i <= riskAreaNav; i++) {
        $(".riskAreaNavigation").append(
            `<li><a class="dropdown-item redirectRiskArea" value="RA` +
                i +
                `">` +
                navObject["RA" + i] +
                `</a></li>`
        );
    }
    $("a").click(function () {
        if ($(this).hasClass("redirectRiskArea")) {
            saveInputs();
            document.cookie = "currentRiskArea=" + $(this).attr("value");
            window.location.reload();
        }
    });

    //Defined required overall information - mappings for scores and an Overall Average calculater
    for (item in overallInformation.scoreNamesBI) {
        BIToIntegerScore[overallInformation.scoreNamesBI[item]] =
            parseInt(item) + 1;
        integerToBIScore[parseInt(item) + 1] =
            overallInformation.scoreNamesBI[item];
    }
    for (item in overallInformation.scoreNamesRA) {
        RAToIntegerScore[overallInformation.scoreNamesRA[item]] =
            parseInt(item) + 1;
        integerToRAScore[parseInt(item) + 1] =
            overallInformation.scoreNamesRA[item];
    }

    var overallScores = {};
    for (item in securityPropertyNames) {
        overallScores[securityPropertyNames[item]] = {
            RASumScore: 0,
            RASelected: 0,
            RAWorstScore: 0,
            BISumScore: 0,
            BISelected: 0,
            BIWorstScore: 0,
        };
    }

    //Fetch information needed for averages per Security Property in the JSON Object overallScores
    //by iterating over each risk area and finding what was selected
    for (let i = 1; i <= lastRiskArea; i++) {
        let riskArea = JSON.parse(localStorage.getItem("RA" + i));
        for (const [key, value] of Object.entries(
            riskArea.securityProperties
        )) {
            if (value.businessImpact != "Not Applicable") {
                overallScores[key].BISelected += 1;
                overallScores[key].BISumScore +=
                    BIToIntegerScore[value.businessImpact];
                if (overallScores[key].BIWorstScore > 0) {
                    if (
                        BIToIntegerScore[value.businessImpact] <
                        overallScores[key].BIWorstScore
                    ) {
                        overallScores[key].BIWorstScore =
                            BIToIntegerScore[value.businessImpact];
                    }
                } else {
                    overallScores[key].BIWorstScore =
                        BIToIntegerScore[value.businessImpact];
                }
            }
            if (value.riskAppetite != "Not Applicable") {
                overallScores[key].RASelected += 1;
                overallScores[key].RASumScore +=
                    RAToIntegerScore[value.riskAppetite];
                if (overallScores[key].RAWorstScore > 0) {
                    if (
                        RAToIntegerScore[value.riskAppetite] <
                        overallScores[key].RAWorstScore
                    ) {
                        overallScores[key].RAWorstScore =
                            RAToIntegerScore[value.riskAppetite];
                    }
                } else {
                    overallScores[key].RAWorstScore =
                        RAToIntegerScore[value.riskAppetite];
                }
            }
        }
    }
    for (let i = 0; i < securityPropertyNames.length; i++) {
        var name = securityPropertyNames[i]; //Security Property Name
        var worstRA = "";
        var worstBI = "";
        var averageRAValue = "";
        var averageBIValue = "";
        //We now work out the average for this, and input into two separate tables
        if (overallScores[name].BISelected > 0) {
            averageBIValue =
                integerToBIScore[
                    Math.round(
                        overallScores[name].BISumScore /
                            overallScores[name].BISelected
                    )
                ];
        } else {
            averageBIValue = "Not Applicable";
        }
        if (overallScores[name].RASelected > 0) {
            averageRAValue =
                integerToRAScore[
                    Math.round(
                        overallScores[name].RASumScore /
                            overallScores[name].RASelected
                    )
                ];
        } else {
            averageRAValue = "Not Applicable";
        }
        if (overallScores[name].BIWorstScore == 0) {
            worstBI = "Not Applicable";
        } else {
            worstBI = integerToBIScore[overallScores[name].BIWorstScore];
        }
        if (overallScores[name].RAWorstScore == 0) {
            worstRA = "Not Applicable";
        } else {
            worstRA = integerToRAScore[overallScores[name].RAWorstScore];
        }
        addToAverageTable(
            name,
            averageBIValue,
            averageRAValue,
            worstBI,
            worstRA,
            overallInformation.scoreNamesBI,
            overallInformation[name].BIOverwrite,
            overallInformation[name].BIJustification,
            overallInformation.scoreNamesRA,
            overallInformation[name].RAOverwrite,
            overallInformation[name].RAJustification
        );
    }
    let finalJustification = document.createElement("tr");
    finalJustification.append(
        createTableCell(
            createSelect(
                overallInformation.scoreNamesRA,
                overallInformation.agreedRiskAppetite
            )
        ),
        createTableCell(
            createTextArea(overallInformation.justification, "overall")
        )
    );

    document.getElementById("overallJustification").append(finalJustification);
    $("textarea")
        .each(function () {
            this.setAttribute(
                "style",
                "height:" + this.scrollHeight + "px;overflow-y:hidden;"
            );
        })
        .on("input", function () {
            this.style.height = "auto";
            this.style.height = this.scrollHeight + "px";
        });
});
//For each object in overallScores add to the two separate rows in the table

function addToAverageTable(
    securityPropertyName,
    averageBIValue,
    averageRAValue,
    worstBI,
    worstRA,
    BIScoringValues,
    BIOverwrite,
    impactJustification,
    RAScoringValues,
    RAOverwrite,
    appetiteJustification
) {
    let tableRow = document.createElement("tr");
    tableRow.append(
        createTableCell(securityPropertyName),
        createTableCell(worstBI),
        createTableCell(averageBIValue),
        createTableCell(createSelect(BIScoringValues, BIOverwrite)),
        createTableCell(createTextArea(impactJustification, "BI")),
        createTableCell(worstRA),
        createTableCell(averageRAValue),
        createTableCell(createSelect(RAScoringValues, RAOverwrite)),
        createTableCell(createTextArea(appetiteJustification, "RA"))
    );

    document.getElementById("overwriteAverages").append(tableRow);
}

function createTableCell(value) {
    let cell = document.createElement("td");
    cell.append(value);
    return cell;
}

function createTextArea(innerValue, area) {
    var textArea = document.createElement("textarea");
    if (area == "BI") {
        textArea.setAttribute("class", "BIJustification form-control");
    } else if (area == "RA") {
        textArea.setAttribute("class", "RAJustification form-control");
    } else if (area == "overall") {
        textArea.setAttribute(
            "class",
            "overallRiskAppetiteJustification form-control"
        );
    }

    textArea.setAttribute("height", "100px");
    textArea.innerHTML = innerValue;
    return textArea;
}

function createSelect(names, selected) {
    var selectList = document.createElement("select");
    selectList.setAttribute("class", "form-select form-select-sm mb-3");
    for (var i in names) {
        let option = document.createElement("option");
        option.value = names[i];
        option.innerHTML = names[i];
        if (names[i] == selected) {
            option.selected = "selected";
        }
        selectList.appendChild(option);
    }
    let option = document.createElement("option");
    option.value = "Not Applicable";
    option.innerHTML = "Not Applicable";
    selectList.appendChild(option);
    return selectList;
}

function saveInputs() {
    var overall = JSON.parse(localStorage.getItem("overall"));
    $("#overwriteAverages > tr").each(function (index, tr) {
        let propertyOverall = {};
        let propertyName = $(tr).find("td:eq(0)").text();
        propertyOverall.BIOverwrite = $(tr)
            .find("td:eq(3)")
            .find("option:selected")
            .val();
        propertyOverall.BIJustification = $(tr).find(".BIJustification").val();
        propertyOverall.RAOverwrite = $(tr)
            .find("td:eq(7)")
            .find("option:selected")
            .val();
        propertyOverall.RAJustification = $(tr).find(".RAJustification").val();
        overall[propertyName] = propertyOverall;
    });
    $("#overallJustification > tr").each(function (index, tr) {
        overall.agreedRiskAppetite = $(tr)
            .find("td:eq(0)")
            .find("option:selected")
            .val();
        overall.justification = $(tr)
            .find(".overallRiskAppetiteJustification")
            .val();
    });
    localStorage.setItem("overall", JSON.stringify(overall));
}

function generateJSONSave() {
    let savedJSON = {};
    savedJSON.cookies = {
        currentRiskArea: getCookie("currentRiskArea"),
        lastRiskArea: getCookie("lastRiskArea"),
    };
    for (let [key, stringValue] of Object.entries(localStorage)) {
        if (
            [
                "projectLogo",
                "projectTitle",
                "projectSensitivity",
                "logo360Defence",
            ].includes(key)
        ) {
            savedJSON[key] = stringValue;
        } else if (key != "userAuth") {
            savedJSON[key] = JSON.parse(stringValue);
        }
    }
    download = document.createElement("a");
    const str = JSON.stringify(savedJSON);
    const bytes = new TextEncoder().encode(str);
    const blob = new Blob([bytes], {
        type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    download.href = url;
    download.download =
        "BIRA-" + localStorage.getItem("projectTitle") + "-Save.json";
    download.click();
}

function previousRiskArea() {
    if (getCookie("currentRiskArea") != "RA1") {
        document.cookie = "currentRiskArea=" + getCookie("lastRiskArea");
        window.location.href = "/BIRA/BIRAInput";
    } else {
        console.log("There is no previous Risk Area");
    }
}

function firstRiskArea() {
    document.cookie = "currentRiskArea=RA1";
    window.location.href = "/BIRA/BIRAInput";
}

function generateDocumentation() {
    var doc = new jsPDF({
        orientation: "landscape",
        unit: "px",
        hotfixes: ["px_scaling"],
    });
    var projectName = localStorage.getItem("projectTitle");
    doc.setFontSize(30);
    doc.text(
        projectName,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() / 2 - 75,
        "center"
    );
    doc.text(
        "BIRA Report",
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() / 2,
        "center"
    );
    var logo360 = new Image();
    var anjbLogo = new Image();
    let logo360Version = localStorage.getItem("logo360Defence");
    if (logo360Version == null) {
        logo360.src = "/images/BIRA/360D-UK-Logo.png";
    } else {
        logo360.src = "/images/BIRA/360D-" + logo360Version + "-Logo.png";
    }
    anjbLogo.src = "/images/BIRA/ANJB-Logo.png";
    doc.addImage(logo360, 28, 35, 64, 64);
    doc.addImage(anjbLogo, 100, 27, 80, 80);
    let projectLogo = localStorage.getItem("projectLogo");
    if (projectLogo != "null") {
        doc.addImage(
            localStorage.getItem("projectLogo"),
            doc.internal.pageSize.getWidth() / 2 - 150,
            doc.internal.pageSize.getHeight() / 2 + 50
        );
    }
    var sensitivityMarking = localStorage.getItem("projectSensitivity");
    if (sensitivityMarking != "") {
        doc.setFontSize(12);
        doc.text(
            "[" + sensitivityMarking + "]",
            doc.internal.pageSize.getWidth() / 2,
            18,
            "center"
        );
    }

    doc.addPage("landscape");
    let agreedRiskAppetite = "";
    let agreedRiskAppetiteJustification = "Justification: ";
    $("#overallJustification > tr").each(function (index, tr) {
        agreedRiskAppetite = $(tr)
            .find("td:eq(0)")
            .find("option:selected")
            .val();
        agreedRiskAppetiteJustification += $(tr)
            .find(".overallRiskAppetiteJustification")
            .val();
    });
    doc.setFontSize(25);
    doc.text("Agreed Risk Appetite: " + agreedRiskAppetite, 56, 80);
    doc.setFontSize(11);
    let pageSize = doc.internal.pageSize;
    let pageWidth = pageSize.getWidth();
    let text = doc.splitTextToSize(
        agreedRiskAppetiteJustification,
        pageWidth - 140,
        {}
    );
    let lengthText = doc.getTextDimensions(text).h;
    let heightText = 140;
    doc.text(text, 56, heightText);
    doc.setFontSize(14);

    var headers = [
        "Security Property/Bad Outcome",
        "Impact Agreed",
        "Impact Justififcation",
        "Appetite Agreed",
        "Appetite Justififcation",
    ];
    var body = [];

    // $("#overwriteAveragesTable thead tr th").each(function () {
    //     headers.push($(this).text());
    // });
    $("#overwriteAverages > tr").each(function (index, tr) {
        let row = [];
        row.push($(tr).find("td:eq(0)").text());
        row.push($(tr).find("td:eq(3)").find("option:selected").val());
        row.push($(tr).find(".BIJustification").val());
        row.push($(tr).find("td:eq(7)").find("option:selected").val());
        row.push($(tr).find(".RAJustification").val());
        body.push(row);
    });
    doc.autoTable({
        didParseCell: function (data) {
            if (data.column.index == 1 && data.cell.section == "body") {
                data.cell.styles.fillColor = fetchScoreColour(
                    "BI",
                    data.cell.raw
                );
            } else if (data.column.index == 3 && data.cell.section == "body") {
                data.cell.styles.fillColor = fetchScoreColour(
                    "RA",
                    data.cell.raw
                );
            }
        },
        didDrawPage: function (data) {
            if (sensitivityMarking != "") {
                doc.setFontSize(12);
                doc.text(
                    "[" + sensitivityMarking + "]",
                    doc.internal.pageSize.getWidth() / 2,
                    18,
                    "center"
                );
            }
        },
        head: [headers],
        body: body,
        startY: lengthText + heightText,
        theme: "grid",
        showHead: "firstPage",
        headStyles: { fillColor: "#0d6efd" },
        rowPageBreak: "avoid",
        columnStyles: {
            0: {
                cellWidth: 200,
            },
            1: {
                cellWidth: 140,
            },
            2: {
                cellWidth: 280,
            },
            3: {
                cellWidth: 140,
            },
            4: {
                cellWidth: 280,
            },
        },
        styles: {
            minCellHeight: 80,
        },
    });

    let lastRiskArea = fetchIntegers(getCookie("lastRiskArea"));
    for (let i = 1; i <= lastRiskArea; i++) {
        var riskArea = JSON.parse(localStorage.getItem("RA" + i));
        doc.addPage();
        let pageSize = doc.internal.pageSize;
        let pageWidth = pageSize.getWidth();
        doc.setFontSize(25);
        let title = doc.splitTextToSize(
            "Risk Area: " + riskArea.name,
            pageWidth - 140,
            {}
        );
        doc.text(title, 56, 80);
        doc.setFontSize(11);
        let text = doc.splitTextToSize(
            riskArea.description,
            pageWidth - 140,
            {}
        );
        let lengthText = doc.getTextDimensions(text).h;
        if (doc.getTextDimensions(title).h > 30) {
            var heightSummary = doc.getTextDimensions(title).h + 120;
        } else {
            var heightSummary = 120;
        }

        doc.text(text, 56, heightSummary);
        doc.setFontSize(14);

        var headers = [
            [
                "Security Property/Bad Outcome",
                "Business Impact",
                "BI Justifications",
                "Risk Appetite",
                "RA Justifications",
            ],
        ];
        var body = [];
        for (const [name, value] of Object.entries(
            riskArea.securityProperties
        )) {
            body.push(fetchTable(value, name));
        }

        doc.autoTable({
            didParseCell: function (data) {
                if (data.column.index == 1 && data.cell.section == "body") {
                    data.cell.styles.fillColor = fetchScoreColour(
                        "BI",
                        data.cell.raw
                    );
                } else if (
                    data.column.index == 3 &&
                    data.cell.section == "body"
                ) {
                    data.cell.styles.fillColor = fetchScoreColour(
                        "RA",
                        data.cell.raw
                    );
                }
            },
            didDrawPage: function (data) {
                if (sensitivityMarking != "") {
                    doc.setFontSize(12);
                    doc.text(
                        "[" + sensitivityMarking + "]",
                        doc.internal.pageSize.getWidth() / 2,
                        18,
                        "center"
                    );
                }
            },
            startY: lengthText + heightSummary,
            columnStyles: {
                0: { cellWidth: 160 },
                1: { cellWidth: 160 },
                2: { cellWidth: 280 },
                3: { cellWidth: 160 },
                4: { cellWidth: 280 },
            },
            headStyles: { fillColor: "#0d6efd" },
            theme: "grid",
            showHead: "firstPage",
            rowPageBreak: "avoid",
            head: headers,
            body: body,
            styles: {
                minCellHeight: 80,
            },
        });
    }
    doc.save("BIRA-" + localStorage.getItem("projectTitle") + "-Report.pdf");
}

function fetchTable(object, name) {
    let row = [];
    row.push(
        name,
        object.businessImpact,
        object.businessImpactJustification,
        object.riskAppetite,
        object.riskAppetiteJustification
    );
    return row;
}

function fetchIntegers(value) {
    return value.match(/\d*$/);
}

function fetchScoreColour(scoreType, value) {
    var colours = JSON.parse(localStorage.getItem("colours"));
    if (scoreType == "BI") {
        return colours["BI" + value];
    } else if (scoreType == "RA") {
        return colours["RA" + value];
    }
}
