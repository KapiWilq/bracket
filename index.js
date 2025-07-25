
// DOM ELEMENTS

const DIALOG_REFERENCE = document.querySelector("dialog");
const DIALOG_TITLE = DIALOG_REFERENCE.querySelector("div.kwbg-dialog-title");
const DIALOG_REQUIREMENTS = DIALOG_REFERENCE.querySelector("ul.kwbg-dialog-requirements");
const DIALOG_MAPPOOL_ROUND_SELECTOR = DIALOG_REFERENCE.querySelector("select.kwbg-dialog-round-select");
const DIALOG_FORM = DIALOG_REFERENCE.querySelector("form");
const DIALOG_HELPER_UPLOAD_BUTTON = DIALOG_FORM.querySelector("button.kwbg-dialog-upload-button-helper");
const DIALOG_MAIN_UPLOAD_BUTTON = DIALOG_FORM.querySelector("button.kwbg-dialog-upload-button-main");
const DIALOG_UPLOAD_STATUS = DIALOG_REFERENCE.querySelector("div.kwbg-dialog-upload-status");

const RULESET_SELECTOR = document.querySelector("select.kwbg-ruleset");
const TOURNEY_TYPE_SELECTOR = document.querySelector("select.kwbg-tourney-type");
const THIRD_PLACE_MATCH_SETTING = document.querySelector("div.kwbg-third-place-match-setting");
const THIRD_PLACE_MATCH_CHECKBOX = document.querySelector("input.kwbg-third-place-match");
const FIRST_ROUND_SELECTOR = document.querySelector("select.kwbg-first-round");

const TEAMS_BUTTON = document.querySelector("button.kwbg-button-teams");
const SEEDINGS_BUTTON = document.querySelector("button.kwbg-button-seedings");
const MATCHES_BUTTON = document.querySelector("button.kwbg-button-matches");
const MAPPOOL_BUTTON = document.querySelector("button.kwbg-button-mappool");

// VARIABLES

let bracket = {
    "Ruleset": {},
    "Matches": [],
    "Rounds": [],
    "Teams": [],
    "Progressions": [],
    "ChromaKeyWidth": 1024,
    "PlayersPerTeam": 4,
    "AutoProgressScreens": true,
    "SplitMapPoolByMods": true,
    "DisplayTeamSeeds": false
};
let teamsFromLatestFile = [];
let qualifiersMappoolFromLatestFile = {};
let seedingsSuccessfullyUploaded = false;
let initialMatchesFromMainFile = [];
let mappoolsFromLatestFile = {};

// EVENT LISTENERS

window.addEventListener("load", () => {
    DIALOG_FORM.reset();

    RULESET_SELECTOR.value = "osu";
    bracket.Ruleset = {
        "ShortName": "osu",
        "Name": "osu!",
        "InstantiationInfo": "osu.Game.Rulesets.Osu.OsuRuleset, osu.Game.Rulesets.Osu",
        "Available": true,
    };

    TEAMS_BUTTON.addEventListener("click", () => showDialog("teams"));
    SEEDINGS_BUTTON.addEventListener("click", () => showDialog("seedings"));
    MATCHES_BUTTON.addEventListener("click", () => showDialog("matches"));
    MAPPOOL_BUTTON.addEventListener("click", () => showDialog("mappool"));

    TOURNEY_TYPE_SELECTOR.value = "single";
    THIRD_PLACE_MATCH_CHECKBOX.checked = false;
    FIRST_ROUND_SELECTOR.disabled = true;
    SEEDINGS_BUTTON.disabled = true;
    MATCHES_BUTTON.disabled = true;
    MAPPOOL_BUTTON.disabled = true;

    DIALOG_HELPER_UPLOAD_BUTTON.addEventListener("click", () => DIALOG_FORM.querySelector("input.kwbg-dialog-upload-input-helper").click());
    DIALOG_MAIN_UPLOAD_BUTTON.addEventListener("click", () => DIALOG_FORM.querySelector("input.kwbg-dialog-upload-input-main").click());

    outputToUser("bracket");
});

RULESET_SELECTOR.addEventListener("change", (event) => {
    switch (event.target.value) {
        case "osu": {
            bracket.Ruleset = {
                "ShortName": "osu",
                "Name": "osu!",
                "InstantiationInfo": "osu.Game.Rulesets.Osu.OsuRuleset, osu.Game.Rulesets.Osu",
                "Available": true,
            }
            break;
        }

        case "taiko": {
            bracket.Ruleset = {
                "ShortName": "taiko",
                "OnlineID": 1,
                "Name": "osu!taiko",
                "InstantiationInfo": "osu.Game.Rulesets.Taiko.TaikoRuleset, osu.Game.Rulesets.Taiko",
                "Available": true,
            }
            break;
        }

        case "fruits": {
            bracket.Ruleset = {
                "ShortName": "fruits",
                "OnlineID": 2,
                "Name": "osu!catch",
                "InstantiationInfo": "osu.Game.Rulesets.Catch.CatchRuleset, osu.Game.Rulesets.Catch",
                "Available": true,
            }
            break;
        }

        case "mania": {
            bracket.Ruleset = {
                "ShortName": "mania",
                "OnlineID": 3,
                "Name": "osu!mania",
                "InstantiationInfo": "osu.Game.Rulesets.Mania.ManiaRuleset, osu.Game.Rulesets.Mania",
                "Available": true,
            }
            break;
        }

        default: {
            outputToUser(`The "${ruleset}" ruleset is not supported`);
            break;
        }
    }

    outputToUser("bracket");
});

TOURNEY_TYPE_SELECTOR.addEventListener("change", (event) => {
    THIRD_PLACE_MATCH_SETTING.style.display = event.target.value === "single" ? "grid" : "none";
    prepareTournamentBracket(teamsFromLatestFile.length, event.target.value === "double", false);
    outputToUser("bracket");
});

THIRD_PLACE_MATCH_CHECKBOX.addEventListener("click", () => {
    prepareTournamentBracket(teamsFromLatestFile.length, TOURNEY_TYPE_SELECTOR.value === "double", false);
    outputToUser("bracket");
})

FIRST_ROUND_SELECTOR.addEventListener("change", (event) => {
    // This is to prevent the bracket being created multiple times at once
    if (event.target.value !== "<upload teams first>") {
        prepareTournamentBracket(event.target.value, TOURNEY_TYPE_SELECTOR.value === "double", false);
    }
    outputToUser("bracket");
})

// FUNCTIONS

function outputToUser(message) {
    document.querySelector("textarea.kwbg-output").value = message === "bracket" ? JSON.stringify(bracket, null, 2) : message;
}

function removeAllChildElements(element) {
    if (element === undefined) { return; }
    while (element.firstChild !== null) { element.removeChild(element.lastChild); }
}

function initCap(word) {
    return String(word).charAt(0).toUpperCase() + String(word).slice(1);
}

function sanitize(str) {
    return str.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;")
        .replace(/`/g, "&grave;")
        .replace(/javascript:/gi);
}

function showDialog(category) {
    DIALOG_MAPPOOL_ROUND_SELECTOR.parentElement.style.display = "none";
    removeAllChildElements(DIALOG_MAPPOOL_ROUND_SELECTOR);
    DIALOG_HELPER_UPLOAD_BUTTON.style.display = "none";
    DIALOG_MAIN_UPLOAD_BUTTON.disabled = false;
    DIALOG_UPLOAD_STATUS.innerText = null;
    DIALOG_FORM.reset();

    let helperFileChangeListener = (event) => handleHelperFile(event, category);
    let mainFileChangeListener = (event) => handleMainFile(event, category);

    DIALOG_FORM.querySelector("input.kwbg-dialog-upload-input-main").addEventListener("change", mainFileChangeListener);

    switch (category) {
        case "teams": {
            DIALOG_MAIN_UPLOAD_BUTTON.classList.remove("kwbg-button-imported", "kwbg-button-failed");
            DIALOG_MAIN_UPLOAD_BUTTON.innerText = "Upload Teams...";

            DIALOG_TITLE.innerText = "Upload Teams";
            DIALOG_REQUIREMENTS.innerHTML = "<li>Every line in the file must have the following order (no header for this one):<br><code>team name</code>;<code>team flag</code>;<code>team acronym</code>;<code>last year placing</code>;<code>list of players</code></li>" +
                "<li>Solo teams can be represented with a simplified syntax:<br><code>player name</code>;<code>last year placing</code>;<code>player id</code>. The first 3 characters of the player's name will be used for the team acronym and the full name for the team flag</li>" +
                "<li><code>Last year placing</code> can be set to 0 if not applicable, osu!(lazer) will show it as <code>N/A</code></li>" +
                "<li>Examples:</li>" +
                "<ul><li>Solo team: <code>KapiWilq</code>;<code>KA</code>;<code>KAP</code>;<code>0</code>;<code>8734129</code> OR <code>KapiWilq</code>;<code>0</code>;<code>8734129</code></li>" +
                "<li>Regular team: <code>The Trash Network</code>;<code>TN</code>;<code>DNK</code>;<code>2</code>;<code>36458031</code>;<code>14857735</code>;<code>404169</code>;<code>6565046</code></li>" +
                '<li><a href="https://raw.githubusercontent.com/KapiWilq/bracket/main/examples/teams.tsv" target="_blank" rel="noopener noreferrer">Example file</a></li></ul>';

            break;
        }

        case "seedings": {
            DIALOG_FORM.querySelector("input.kwbg-dialog-upload-input-helper").addEventListener("change", helperFileChangeListener);
            DIALOG_HELPER_UPLOAD_BUTTON.style.display = "inline";
            DIALOG_MAIN_UPLOAD_BUTTON.disabled = true;

            DIALOG_HELPER_UPLOAD_BUTTON.classList.remove("kwbg-button-imported", "kwbg-button-failed");
            DIALOG_HELPER_UPLOAD_BUTTON.innerText = "Upload Mappool...";
            DIALOG_MAIN_UPLOAD_BUTTON.classList.remove("kwbg-button-imported", "kwbg-button-failed");
            DIALOG_MAIN_UPLOAD_BUTTON.innerText = "Upload Seedings...";

            DIALOG_TITLE.innerText = "Upload Seedings";
            DIALOG_REQUIREMENTS.innerHTML = "<li>You need two files: the mappool and seedings with scores</li>" +
                "<ul><li>The mappool is simple: first line is for mods for each map, e.g. NM1, DT3, HD2, AC3</li>" +
                "<li>Second line is for IDs of each map</li></ul>" +
                '<li>The seedings file is a modified version of <a href="https://github.com/DRCallaghan/osu-lazer-qualifier-results-bracket-generator/blob/06844c18bbf9aa505558b152572df5483a35c10e/db/scores.SAMPLE.csv" target="_blank" rel="noopener noreferrer">D I O\'s sample file</a> (header is optional here)</li>' +
                "<li>Differences:</li>" +
                "<ul><li>No <code>flag ISO</code> column</li>" +
                "<li>No <code>team size</code> column</li>" +
                "<li>No columns after the <code>team size</code> one</li></ul>" +
                "<li>This generator supports every winning condition!</li>" +
                "<ul><li>Accuracy must be either a number from 0 to 1 (untested) OR a percentage (as in with the percent sign at the end), e.g. <code>0.9933</code> and <code>99.33%</code> would display the same thing</li>" +
                "<li>Combo (untested) must be a whole number AND have an <code>x</code> at the end (case-insensitive)</li></ul>" +
                '<li>Examples: <a href="https://raw.githubusercontent.com/KapiWilq/bracket/main/examples/qualifiers-mappool.tsv" target="_blank" rel="noopener noreferrer">mappool</a> | <a href="https://raw.githubusercontent.com/KapiWilq/bracket/main/examples/qualifiers-results.tsv" target="_blank" rel="noopener noreferrer">seeding (score; zoom out for this one)</a></li>';

            break;
        }

        case "matches": {
            DIALOG_MAIN_UPLOAD_BUTTON.classList.remove("kwbg-button-imported", "kwbg-button-failed");
            DIALOG_MAIN_UPLOAD_BUTTON.innerText = "Upload Initial Matches...";

            DIALOG_TITLE.innerText = "Upload Initial Matches";
            DIALOG_REQUIREMENTS.innerHTML = "<li>Every line is only two columns: <code>left team name</code> and <code>right team name</code></li>" +
                "<li>You can also put <code>acronym</code>, or <code>team seed</code> at the very first line of the file to tell the generator to use something else</li>" +
                '<li>Examples: <a href="https://raw.githubusercontent.com/KapiWilq/bracket/main/examples/initial-matches-name.tsv" target="_blank" rel="noopener noreferrer">team name</a> | <a href="https://raw.githubusercontent.com/KapiWilq/bracket/main/examples/initial-matches-acronym.tsv" target="_blank" rel="noopener noreferrer">acronym</a> | <a href="https://raw.githubusercontent.com/KapiWilq/bracket/main/examples/initial-matches-seed.tsv" target="_blank" rel="noopener noreferrer">team seeds</a></li>';

            break;
        }

        case "mappool": {
            DIALOG_MAIN_UPLOAD_BUTTON.classList.remove("kwbg-button-imported", "kwbg-button-failed");
            DIALOG_MAIN_UPLOAD_BUTTON.innerText = "Upload Mappool...";

            DIALOG_TITLE.innerText = "Upload Mappool for a Round"
            DIALOG_REQUIREMENTS.innerHTML = "<li>First line is optional: it's just <code>ban count</code> and <code>best of</code></li>" +
                "<li>Next line is for mods for each map, e.g. NM1, DT3, HD2, AC3</li>" +
                "<li>The last line is for IDs of each map</li>" +
                '<li><a href="https://raw.githubusercontent.com/KapiWilq/bracket/main/examples/grand-finals-mappool.tsv" target="_blank" rel="noopener noreferrer">Example file</a></li>';

            DIALOG_MAPPOOL_ROUND_SELECTOR.parentElement.style.display = "flex";
            let firstRound = Number(FIRST_ROUND_SELECTOR.value);
            for (let currentRoundValue = firstRound; currentRoundValue >= 1; currentRoundValue /= 2) {
                let option = document.createElement("option");
                option.value = currentRoundValue;
                if (currentRoundValue === 8) {
                    option.innerText = "Quarterfinals"
                } else if (currentRoundValue === 4) {
                    option.innerText = "Semifinals"
                } else if (currentRoundValue === 2) {
                    option.innerText = "Finals"
                } else if (currentRoundValue === 1) {
                    option.innerText = "Grand Finals"
                } else {
                    option.innerText = `Round of ${currentRoundValue}`;
                }

                DIALOG_MAPPOOL_ROUND_SELECTOR.appendChild(option);
            }
            break;
        }

        default: {
            outputToUser(`The "${category}" dialog type does not exist`);
            break;
        }
    }

    DIALOG_REFERENCE.querySelector("button#kwbg-dialog-close").addEventListener("click", () => {
        DIALOG_REFERENCE.close();
        DIALOG_FORM.querySelector("input.kwbg-dialog-upload-input-helper").removeEventListener("change", helperFileChangeListener);
        DIALOG_FORM.querySelector("input.kwbg-dialog-upload-input-main").removeEventListener("change", mainFileChangeListener);
    });

    DIALOG_REFERENCE.showModal();
}

function handleMainFile(event, category) {
    if (event.target.files.length === 0) {
        return;
    }

    let file = event.target.files[0];
    let reader = new FileReader();
    reader.readAsText(file);
    reader.onloadend = () => {
        try {
            if (reader.result.includes(",")) {
                tryParseMainFile(reader.result, category, ",");
            } else if (reader.result.includes(";")) {
                tryParseMainFile(reader.result, category, ";");
            } else if (reader.result.includes("\t")) {
                tryParseMainFile(reader.result, category, "\t");
            } else {
                throw new Error("Cannot parse the file; every line has an unsupported delimiter");
            }
            DIALOG_UPLOAD_STATUS.innerHTML = `${initCap(category)} file imported successfully!`;
            DIALOG_MAIN_UPLOAD_BUTTON.classList.remove("kwbg-button-failed");
            DIALOG_MAIN_UPLOAD_BUTTON.classList.add("kwbg-button-imported");
            document.querySelector(`button.kwbg-button-${category}`).classList.remove("kwbg-button-failed");
            document.querySelector(`button.kwbg-button-${category}`).classList.add("kwbg-button-imported");
        } catch (error) {
            DIALOG_UPLOAD_STATUS.innerHTML = `ERROR: ${error.message}`;
            DIALOG_MAIN_UPLOAD_BUTTON.classList.remove("kwbg-button-imported");
            DIALOG_MAIN_UPLOAD_BUTTON.classList.add("kwbg-button-failed");
            document.querySelector(`button.kwbg-button-${category}`).classList.remove("kwbg-button-imported");
            document.querySelector(`button.kwbg-button-${category}`).classList.add("kwbg-button-failed");

            outputToUser("bracket");
        }
    };
}

function handleHelperFile(event, category) {
    if (event.target.files.length === 0) {
        return;
    }

    let file = event.target.files[0];
    let reader = new FileReader();
    reader.readAsText(file);
    reader.onloadend = () => {
        try {
            if (reader.result.includes(",")) {
                tryParseHelperFile(reader.result, category, ",");
            } else if (reader.result.includes(";")) {
                tryParseHelperFile(reader.result, category, ";");
            } else if (reader.result.includes("\t")) {
                tryParseHelperFile(reader.result, category, "\t");
            } else {
                throw new Error("Cannot parse the file; every line has an unsupported delimiter");
            }

            // TODO: Make this text dynamic
            DIALOG_UPLOAD_STATUS.innerHTML = "Helper file imported successfully!";
            DIALOG_HELPER_UPLOAD_BUTTON.classList.remove("kwbg-button-failed");
            DIALOG_HELPER_UPLOAD_BUTTON.classList.add("kwbg-button-imported");
            DIALOG_MAIN_UPLOAD_BUTTON.disabled = false;
        } catch (error) {
            DIALOG_UPLOAD_STATUS.innerHTML = `ERROR: ${error.message}`;
            DIALOG_HELPER_UPLOAD_BUTTON.classList.remove("kwbg-button-imported");
            DIALOG_HELPER_UPLOAD_BUTTON.classList.add("kwbg-button-failed");
            DIALOG_MAIN_UPLOAD_BUTTON.disabled = true;
            document.querySelector(`button.kwbg-button-${category}`).classList.remove("kwbg-button-imported");
            document.querySelector(`button.kwbg-button-${category}`).classList.add("kwbg-button-failed");
        }
    };
}

function tryParseMainFile(file, category, delimiter) {
    if (delimiter !== "\t" && delimiter !== "," && delimiter !== ";") {
        throw new Error("Cannot parse the file; every line has an unsupported delimiter");
    }

    switch (category) {
        case "teams": {
            Array.from(document.querySelector("div.kwbg-upload-buttons").children).forEach((button) => {
                button.classList.remove("kwbg-button-imported", "kwbg-button-failed");
            });
            SEEDINGS_BUTTON.disabled = true;
            MATCHES_BUTTON.disabled = true;
            MAPPOOL_BUTTON.disabled = true;

            removeAllChildElements(FIRST_ROUND_SELECTOR);
            let optionPlaceholder = document.createElement("option");
            optionPlaceholder.innerText = "<upload teams first>";
            FIRST_ROUND_SELECTOR.appendChild(optionPlaceholder);
            FIRST_ROUND_SELECTOR.disabled = true;

            let teamsFile = file.replace("\r\n", "\n").replace("\r", "\n").split("\n").filter((team) => team.trim() !== "");
            if (teamsFile.length === 0) {
                throw new Error('The file might be empty (if not, <a href="https://github.com/KapiWilq/bracket#how-to-yell-at-dev" target="_blank" rel="noopener noreferrer">yell at dev</a>)');
            }
            if (teamsFile.length < 4) {
                throw new Error("Please upload at least 4 teams");
            }
            if (teamsFile.length > 256) {
                throw new Error("You can only have up to 256 teams");
            }

            teamsFromLatestFile = [];
            initialMatchesFromMainFile = [];
            bracket.Matches = [];
            bracket.Rounds = [];
            bracket.Teams = teamsFromLatestFile;
            bracket.Progressions = [];

            let potentialHeader = teamsFile[0].split(delimiter).filter((column) => column.trim() !== "");
            // TODO: This is a very bandaid solution
            if (potentialHeader.includes("NM1") || potentialHeader.includes("HD1") || potentialHeader.includes("HR1") || potentialHeader.includes("DT1") || potentialHeader.includes("EZ1")) {
                throw new Error('This might be a wrong file (if not, <a href="https://github.com/KapiWilq/bracket#how-to-yell-at-dev" target="_blank" rel="noopener noreferrer">yell at dev</a>)');
            }

            if (potentialHeader.length === 2 && isNaN(Number(potentialHeader[1]))) {
                potentialHeader = teamsFile.shift();
            } else if (potentialHeader.length >= 4 && isNaN(Number(potentialHeader[3]))) {
                potentialHeader = teamsFile.shift();
            }

            let acronyms = new Set();
            for (let teamIdx = 0; teamIdx < teamsFile.length; teamIdx += 1) {
                let teamSpec = teamsFile[teamIdx].split(delimiter).filter((column) => column.trim() !== "");
                let teamName = sanitize(teamSpec[0].trim());

                if (teamSpec.length === 4 || teamSpec.length < 3) {
                    throw new Error(`Team "${teamName}" has an incorrect amount of information`);
                }

                if (teamSpec.length === 3) {
                    if (isNaN(Number(teamSpec[1])) || isNaN(Number(teamSpec[2]))) {
                        throw new Error(`Team "${teamName}" has an invalid information order (if not, <a href="https://github.com/KapiWilq/bracket#how-to-yell-at-dev" target="_blank" rel="noopener noreferrer">yell at dev</a>)`);
                    }

                    if (Number(teamSpec[1]) > 256 || Number(teamSpec[1]) < 0) {
                        throw new Error(`Team "${teamName}"'s last year placing cannot be a negative number or bigger than 256`);
                    }

                    let acronym = String(teamSpec[0]).trim().toUpperCase().substring(0, 3);
                    if (acronyms.has(acronym)) {
                        throw new Error(`Team ${teamName} will create an acronym collision with team "${sanitize(teamsFromLatestFile.find((team) => team.Acronym === acronym).FullName)}"`);
                    }

                    teamsFromLatestFile.push({
                        "FullName": String(teamSpec[0]).trim(),
                        // This uses full name to minimize file name clashing
                        // Also let's remove characters from flag names that make operating systems sad
                        "FlagName": String(teamSpec[0]).trim().toUpperCase().replace(/[*@"/<>:|?]/gu, ""),
                        "Acronym": acronym,
                        "SeedingResults": [],
                        "LastYearPlacing": Number(teamSpec[1]),
                        "Players": [{ "id": Number(teamSpec[2]) }]
                    });
                } else {
                    let players = [];
                    for (let i = 4; i < teamSpec.length; i += 1) {
                        if (isNaN(Number(teamSpec[i]))) {
                            throw new Error(`Player #${i - 3} in team "${teamName}" has an invalid ID (${sanitize(teamSpec[i])})`);
                        }

                        players.push({ "id": Number(teamSpec[i]) });
                    }

                    if (Number(teamSpec[3]) > 256 || Number(teamSpec[3]) < 0) {
                        throw new Error(`Team "${teamName}"'s last year placing cannot be a negative number or bigger than 256`);
                    }

                    let acronym = String(teamSpec[2]).trim().toUpperCase().substring(0, 3);
                    if (acronyms.has(acronym)) {
                        throw new Error(`Team ${teamName} will create an acronym collision with team "${sanitize(teamsFromLatestFile.find((team) => team.Acronym === acronym).FullName)}"`);
                    }

                    teamsFromLatestFile.push({
                        "FullName": String(teamSpec[0]).trim(),
                        "FlagName": String(teamSpec[1]).trim(),
                        "Acronym": acronym,
                        "SeedingResults": [],
                        "LastYearPlacing": Number(teamSpec[3]),
                        "Players": players
                    });
                }
            }

            teamsFromLatestFile.sort((a, b) => a.FullName.localeCompare(b.FullName));
            bracket.Teams = teamsFromLatestFile;

            SEEDINGS_BUTTON.disabled = false;
            MATCHES_BUTTON.disabled = false;
            MAPPOOL_BUTTON.disabled = false;

            prepareTournamentBracket(teamsFromLatestFile.length, TOURNEY_TYPE_SELECTOR.value === "double");
            break;
        }

        case "seedings": {
            SEEDINGS_BUTTON.classList.remove("kwbg-button-imported", "kwbg-button-failed");

            let seedingsFile = file.replace("\r\n", "\n").replace("\r", "\n").split("\n").filter((seeding) => seeding.trim() !== "");
            if (seedingsFile.length === 0) {
                throw new Error('The file might be empty (if not, <a href="https://github.com/KapiWilq/bracket#how-to-yell-at-dev" target="_blank" rel="noopener noreferrer">yell at dev</a>)');
            }

            let potentialHeader = seedingsFile[0].split(delimiter).filter((column) => column.trim() !== "");
            if (isNaN(Number(potentialHeader[1]))) {
                potentialHeader = seedingsFile.shift();
            }

            let mods = Object.keys(qualifiersMappoolFromLatestFile);
            let uniqueMods = Array.from(new Set(mods.map((mod) => mod.substring(0, 2))));

            for (let teamIdx = 0; teamIdx < seedingsFile.length; teamIdx += 1) {
                let teamSpec = seedingsFile[teamIdx].split(delimiter).filter((column) => column.trim() !== "");
                let teamName = sanitize(teamSpec[0].trim());

                if (teamSpec.length < 1 + mods.length + 1 + uniqueMods.length + mods.length) {
                    throw new Error(`Team "${teamName}" is missing information (if not, <a href="https://github.com/KapiWilq/bracket#how-to-yell-at-dev" target="_blank" rel="noopener noreferrer">yell at dev</a>)`);
                } else if (teamSpec.length > 1 + mods.length + 1 + uniqueMods.length + mods.length) {
                    throw new Error(`Team "${teamName}" might have too much information (if not, <a href="https://github.com/KapiWilq/bracket#how-to-yell-at-dev" target="_blank" rel="noopener noreferrer">yell at dev</a>)`);
                }

                let teamInBracket = bracket.Teams.find((team) => team.FullName === teamSpec[0].trim());
                if (typeof (teamInBracket) === "undefined") {
                    throw new Error(`Team "${teamName}" does not exist in the bracket.json`);
                }
                teamInBracket.SeedingResults = [];

                // Team seed
                if (isNaN(Number(teamSpec[1 + mods.length]))) {
                    throw new Error(`Team seed of team ${teamName} is invalid (${sanitize(teamSpec[1 + mods.length])})`);
                }
                if (Number(teamSpec[1 + mods.length]) > 256 || Number(teamSpec[1 + mods.length]) <= 0) {
                    throw new Error(`Team seed of team "${teamName}" is not a positive number that is 256 or smaller (${teamSpec[1 + mods.length]})`);
                }
                teamInBracket.Seed = String(teamSpec[1 + mods.length]).trim();

                // Mod-specific seed (also initialize the beatmaps array for map-specific seeds)
                for (let i = 0; i < uniqueMods.length; i += 1) {
                    if (isNaN(Number(teamSpec[1 + mods.length + 1 + i]))) {
                        throw new Error(`${uniqueMods[i]} seed for team ${teamName} is invalid (${sanitize(teamSpec[1 + mods.length + 1 + i])})`)
                    }
                    if (Number(teamSpec[1 + mods.length + 1 + i]) > 256 || Number(teamSpec[1 + mods.length + 1 + i]) <= 0) {
                        throw new Error(`${uniqueMods[i]} seed for team "${teamName}" is not a positive number that is 256 or smaller (${teamSpec[1 + mods.length + 1 + i]})`);
                    }

                    teamInBracket.SeedingResults.push({
                        "Beatmaps": [],
                        "Mod": String(uniqueMods[i]),
                        "Seed": Number(teamSpec[1 + mods.length + 1 + i])
                    });
                }

                // Map-specific seeds
                for (let i = 0; i < mods.length; i += 1) {
                    if (isNaN(Number(teamSpec[1 + mods.length + 1 + uniqueMods.length + 1]))) {
                        throw new Error(`${mods[i]} seed for team ${teamName} is invalid (${sanitize(teamSpec[1 + mods.length + 1 + uniqueMods.length + 1])})`);
                    }
                    if (Number(teamSpec[1 + mods.length + 1 + uniqueMods.length + i]) > 256 || Number(teamSpec[1 + mods.length + 1 + uniqueMods.length + i]) <= 0) {
                        throw new Error(`${mods[i]} seed for team "${teamName}" is not a positive number that is 256 or smaller (${teamSpec[1 + mods.length + 1 + uniqueMods.length + i]})`);
                    }

                    let finalScore = 0;
                    // Accuracy: decimal number [0...1]
                    if (!isNaN(Number(teamSpec[1 + i])) && Number(teamSpec[1 + i]) <= 1) {
                        finalScore = Number(Number(teamSpec[1 + i]).toFixed(4)) * 10000;
                        if (finalScore > 10000) {
                            throw new Error(`${mods[i]} accuracy for team "${teamName}" is weird (${finalScore / 100}%; if not, <a href="https://github.com/KapiWilq/bracket#how-to-yell-at-dev" target="_blank" rel="noopener noreferrer">yell at dev</a>)`);
                        }
                        // Accuracy: percentage
                    } else if (isNaN(Number(teamSpec[1 + i])) && String(teamSpec[1 + i]).includes('%')) {
                        finalScore = Number(Number(String(teamSpec[1 + i]).replace('%', '')).toFixed(2)) * 100;
                        if (finalScore > 10000) {
                            throw new Error(`${mods[i]} accuracy for team "${teamName}" is weird (${finalScore / 100}%; if not, <a href="https://github.com/KapiWilq/bracket#how-to-yell-at-dev" target="_blank" rel="noopener noreferrer">yell at dev</a>)`);
                        }
                        // Combo
                    } else if (isNaN(Number(teamSpec[1 + i])) && String(teamSpec[1 + i]).toLowerCase().includes('x')) {
                        finalScore = Number(String(teamSpec[1 + i]).toLowerCase().replace('x', ''));
                        if (Number(Math.ceil(finalScore)) !== Number(Math.floor(finalScore))) {
                            throw new Error(`${mods[i]} combo for team "${teamName}" must be a whole number (${sanitize(finalScore)}x)`);
                        }
                        // Score
                    } else if (!isNaN(Number(teamSpec[1 + i]))) {
                        finalScore = Number(teamSpec[1 + i]);
                    } else {
                        throw new Error(`${mods[i]} score for team "${teamName} is weird (${sanitize(finalScore)}; if not, <a href="https://github.com/KapiWilq/bracket#how-to-yell-at-dev" target="_blank" rel="noopener noreferrer">yell at dev</a>)`)
                    }

                    if (finalScore === NaN) {
                        throw new Error(`Couldn't parse ${mods[i]} seed for team "${teamName}", <a href="https://github.com/KapiWilq/bracket#how-to-yell-at-dev" target="_blank" rel="noopener noreferrer">yell at dev</a>`);
                    }

                    let modSpecificSeed = teamInBracket.SeedingResults.find((result) => result.Mod === String(mods[i].substring(0, 2)))

                    modSpecificSeed.Beatmaps.push({
                        "ID": Number(qualifiersMappoolFromLatestFile[mods[i]]),
                        "Score": Number(finalScore),
                        "Seed": Number(teamSpec[1 + mods.length + 1 + uniqueMods.length + i])
                    });
                }
            }

            SEEDINGS_BUTTON.classList.add("kwbg-button-imported");
            seedingsSuccessfullyUploaded = true;
            break;
        }

        case "matches": {
            MATCHES_BUTTON.classList.remove("kwbg-button-imported", "kwbg-button-failed");

            let matchesFile = file.replace('\r\n', '\n').replace("\r", "\n").split("\n").filter((match) => match.trim() !== "");
            if (matchesFile.length === 0) {
                throw new Error('The file might be empty (if not, <a href="https://github.com/KapiWilq/bracket#how-to-yell-at-dev" target="_blank" rel="noopener noreferrer">yell at dev</a>)');
            }

            let fileMode = matchesFile[0].split(delimiter);
            if (fileMode.length === 1) {
                fileMode = String(sanitize(matchesFile.shift()));
            } else {
                fileMode = "name";
            }
            initialMatchesFromMainFile = [];
            prepareTournamentBracket(teamsFromLatestFile.length, TOURNEY_TYPE_SELECTOR.value === "double", false);

            let matchList = [];
            let values = new Set();
            for (let i = 0; i < matchesFile.length; i += 1) {
                let matchSpec = matchesFile[i].split(delimiter).filter((column) => column.trim() !== "");
                if (matchSpec.length > 2) {
                    throw new Error(`Line ${i + 1} has too much information`);
                }
                if (matchSpec.length < 2) {
                    throw new Error(`Line ${i + 1} has too little information`);
                }

                let leftTeam, rightTeam;

                if (fileMode === "name") {
                    leftTeam = bracket.Teams.find((team) => team.FullName === String(matchSpec[0]).trim());
                    // This replace HAS to be here
                    rightTeam = bracket.Teams.find((team) => team.FullName === String(matchSpec[1]).trim().replace('\r', ''));
                } else if (fileMode === "acronym") {
                    leftTeam = bracket.Teams.find((team) => team.Acronym === String(matchSpec[0]).trim());
                    rightTeam = bracket.Teams.find((team) => team.Acronym === String(matchSpec[1]).trim().replace('\r', ''));
                // } else if (fileMode === "flag") {
                //     leftTeam = bracket.Teams.find((team) => team.FlagName === String(matchSpec[0]).trim());
                //     rightTeam = bracket.Teams.find((team) => team.FlagName === String(matchSpec[1]).trim().replace('\r', ''));
                } else if (fileMode === "team seed") {
                    if (seedingsSuccessfullyUploaded === false) {
                        throw new Error('You need to upload seedings first to use the "team seed" mode');
                    }
                    if (isNaN(Number(matchSpec[0]))) {
                        throw new Error(`${sanitize(matchSpec[0])} is an invalid seed`);
                    }
                    if (isNaN(Number(matchSpec[1]))) {
                        throw new Error(`${sanitize(matchSpec[1])} is an invalid seed`);
                    }

                    if (Number(matchSpec[0]) > 256 || Number(matchSpec[0]) < 0) {
                        throw new Error(`${sanitize(matchSpec[0])} is not a positive number that is 256 or smaller`);
                    }
                    if (Number(matchSpec[1]) > 256 || Number(matchSpec[1]) < 0) {
                        throw new Error(`${sanitize(matchSpec[0])} is not a positive number that is 256 or smaller`);
                    }
                    leftTeam = bracket.Teams.find((team) => team.Seed === String(Number(matchSpec[0])));
                    rightTeam = bracket.Teams.find((team) => team.Seed === String(Number(matchSpec[1])));
                } else {
                    throw new Error(`Unsupported file mode "${fileMode}"`);
                }

                if (typeof (leftTeam) === "undefined") {
                    throw new Error(`Couldn't find the left team by its ${fileMode} (${sanitize(matchSpec[0])}, line ${i + 1})`);
                } else {
                    if (values.has(String(matchSpec[0]).trim())) {
                        throw new Error(`The "${sanitize(matchSpec[0])}" ${fileMode} is duplicated`);
                    }
                    values.add(String(matchSpec[0]).trim());
                }
                if (typeof (rightTeam) === "undefined") {
                    throw new Error(`Couldn't find the right team by its ${fileMode} (${sanitize(matchSpec[1].replace('\r', ''))}, line ${i + 1})`);
                } else {
                    if (values.has(String(matchSpec[1]).trim())) {
                        throw new Error(`The "${sanitize(matchSpec[1])}" ${fileMode} is duplicated`);
                    }
                    values.add(String(matchSpec[1]).trim());
                }

                matchList.push({
                    left: leftTeam,
                    right: rightTeam
                });
            }

            initialMatchesFromMainFile = matchList;
            prepareTournamentBracket(teamsFromLatestFile.length, TOURNEY_TYPE_SELECTOR.value === "double", false);
            break;
        }

        case "mappool": {
            MAPPOOL_BUTTON.classList.remove("kwbg-button-imported", "kwbg-button-failed");

            let mappoolFile = file.replace('\r\n', '\n').replace("\r", "\n").split("\n").filter((match) => match.trim() !== "");
            if (mappoolFile.length === 0) {
                throw new Error('The file might be empty (if not, <a href="https://github.com/KapiWilq/bracket#how-to-yell-at-dev" target="_blank" rel="noopener noreferrer">yell at dev</a>)');
            }

            let banCount = 1, bestOf = 9;

            let potentialHeader = mappoolFile[0].split(delimiter);
            if (mappoolFile.length === 3 && potentialHeader.length === 2 && !isNaN(Number(potentialHeader[0])) && !isNaN(Number(potentialHeader[1]))) {
                banCount = Number(potentialHeader[0]);
                bestOf = Number(potentialHeader[1]);
                potentialHeader = mappoolFile.shift();
            } else if (mappoolFile.length < 2 || mappoolFile.length > 3) {
                throw new Error("The file must have either 2 or 3 lines");
            }

            if (banCount < 0) {
                throw new Error(`Mappool cannot have negative bans (${banCount})`);
            }
            if (banCount > 5) {
                throw new Error(`Mappool can only have up to 5 bans (${banCount})`);
            }

            if (bestOf < 3) {
                throw new Error(`The "best of" value must be at least 3 (${bestOf})`);
            }
            if (bestOf > 23) {
                throw new Error(`The "best of" value must be at most 23 (${bestOf})`);
            }
            if (bestOf % 2 === 0) {
                throw new Error(`The "best of" value must be an odd number (${bestOf})`);
            }

            let mods = mappoolFile[0].split(delimiter);
            let uniqueMods = Array.from(new Set(mods));
            let maps = mappoolFile[1].split(delimiter);

            if (!mods.includes("NM1") && !mods.includes("HD1") && !mods.includes("HR1") && !mods.includes("DT1") && !mods.includes("EZ1")) {
                throw new Error('This might be a wrong file (if not, <a href="https://github.com/KapiWilq/bracket#how-to-yell-at-dev" target="_blank" rel="noopener noreferrer">yell at dev</a>)');
            }
            if (!isNaN(Number(mods[1]))) {
                throw new Error('The mappool must be "horizontal" (see the example above)');
            }

            if (mods.length !== uniqueMods.length) {
                throw new Error("At least one mod is duplicated");
            }
            if (mods.length !== maps.length) {
                throw new Error("The amount of mods doesn't match the amount of map IDs");
            }

            mappoolsFromLatestFile[DIALOG_MAPPOOL_ROUND_SELECTOR.value] = {
                banCount: banCount,
                bestOf: bestOf,
                beatmaps: mods.reduce((beatmaps, mod, index) => {
                    beatmaps[mod] = Number(maps[index]);
                    return beatmaps;
                }, {})
            };

            prepareTournamentBracket(teamsFromLatestFile.length, TOURNEY_TYPE_SELECTOR.value === "double", false);
            break;
        }

        default: {
            throw new Error(`Unsupported file category (${sanitize(category)})`);
        }
    }

    outputToUser("bracket");
}

function tryParseHelperFile(file, category, delimiter) {
    if (delimiter !== "\t" && delimiter !== "," && delimiter !== ";") {
        throw new Error("Cannot parse the file; every line has an unsupported delimiter");
    }

    switch (category) {
        case "seedings": {
            SEEDINGS_BUTTON.classList.remove("kwbg-button-failed", "kwbg-button-imported");
            seedingsSuccessfullyUploaded = false;

            let mappoolFile = file.replace("\r\n", "\n").replace("\r", "\n").split("\n").filter((line) => line.trim() !== "");
            if (mappoolFile.length !== 2) {
                throw new Error("Incorrect amount of lines (must be two)");
            }

            let mods = mappoolFile[0].split(delimiter);
            let uniqueMods = Array.from(new Set(mods));
            let maps = mappoolFile[1].split(delimiter);

            if (!mods.includes("NM1") && !mods.includes("HD1") && !mods.includes("HR1") && !mods.includes("DT1") && !mods.includes("EZ1")) {
                throw new Error('This might be a wrong file (if not, <a href="https://github.com/KapiWilq/bracket#how-to-yell-at-dev" target="_blank" rel="noopener noreferrer">yell at dev</a>)');
            }
            if (!isNaN(Number(mods[1]))) {
                throw new Error('The mappool must be "horizontal" (see the example above)');
            }

            if (mods.length !== uniqueMods.length) {
                throw new Error("At least one mod is duplicated");
            }
            if (mods.length !== maps.length) {
                throw new Error("The amount of mods doesn't match the amount of map IDs");
            }

            qualifiersMappoolFromLatestFile = mods.reduce((mappool, mod, index) => {
                mappool[sanitize(mod)] = Number(maps[index]);
                return mappool;
            }, {});
            break;
        }

        default: {
            throw new Error(`Unsupported file category (${sanitize(category)})`);
        }
    }
}

function prepareTournamentBracket(teamsCount, isDoubleElimination, regenerateDropdown = true) {
    if (teamsCount === 0) {
        return;
    }

    let firstRound = regenerateDropdown === true ? 2 ** Math.floor(Math.log2(teamsCount)) : Number(FIRST_ROUND_SELECTOR.value);
    const BRACKET_GAP = 300, Y_DISTANCE_BASE = 100, X_POSITION_OFFSET = 200
    bracket.Matches = [];
    bracket.Rounds = [];
    bracket.Progressions = [];
    let matchID = 1;
    let cache = {
        roundNumber: 1,
        xPosition: 0,
        yDistanceMultiplier: 1,
        yStartingOffsetForRound: 0,
        // Used only for losers' bracket
        yStartingAnchor: 0,
        idOffset: firstRound / 4
    }

    // Prepare the dropdown
    if (regenerateDropdown === true) {
        FIRST_ROUND_SELECTOR.disabled = false;
        removeAllChildElements(FIRST_ROUND_SELECTOR);

        for (let currentRoundValue = firstRound; currentRoundValue >= 1; currentRoundValue /= 2) {
            let option = document.createElement("option");
            option.value = currentRoundValue;
            if (currentRoundValue === 8) {
                option.innerText = "Quarterfinals"
            } else if (currentRoundValue === 4) {
                option.innerText = "Semifinals"
            } else if (currentRoundValue === 2) {
                option.innerText = "Finals"
            } else if (currentRoundValue === 1) {
                option.innerText = "Grand Finals"
            } else {
                option.innerText = `Round of ${currentRoundValue}`;
            }

            if (currentRoundValue > 2) {
                FIRST_ROUND_SELECTOR.appendChild(option);
            }
        }
    }

    // Create rounds
    for (let currentRoundValue = firstRound; currentRoundValue >= 1; currentRoundValue /= 2) {
        let roundName = ""
        if (currentRoundValue === 8) {
            roundName = "Quarterfinals"
        } else if (currentRoundValue === 4) {
            roundName = "Semifinals"
        } else if (currentRoundValue === 2) {
            roundName = "Finals"
        } else if (currentRoundValue === 1) {
            roundName = "Grand Finals"
        } else {
            roundName = `Round of ${currentRoundValue}`;
        }

        if (currentRoundValue !== 1 || (currentRoundValue === 1 && isDoubleElimination === true)) {
            bracket.Rounds.push({
                "Name": roundName,
                "Beatmaps": [],
                "Matches": []
            });

            if (currentRoundValue === 1 && isDoubleElimination === true) {
                bracket.Rounds.push({
                    "Name": roundName,
                    "Description": "Bracket Reset (if needed)",
                    "Beatmaps": [],
                    "Matches": []
                });
            } else if (currentRoundValue === 2 && isDoubleElimination === false && Boolean(THIRD_PLACE_MATCH_CHECKBOX.checked) === true) {
                bracket.Rounds.push({
                    "Name": roundName,
                    "Description": "Match for 3rd Place",
                    "Beatmaps": [],
                    "Matches": []
                });
            }
        }
    }

    // Add mappools to rounds
    for (let currentRoundValue = firstRound; currentRoundValue >= 1; currentRoundValue /= 2) {
        if (!(currentRoundValue in mappoolsFromLatestFile)) {
            continue;
        }

        let roundName = ""
        if (currentRoundValue === 8) {
            roundName = "Quarterfinals"
        } else if (currentRoundValue === 4) {
            roundName = "Semifinals"
        } else if (currentRoundValue === 2) {
            roundName = "Finals"
        } else if (currentRoundValue === 1) {
            roundName = "Grand Finals"
        } else {
            roundName = `Round of ${currentRoundValue}`;
        }

        let currentMappool = mappoolsFromLatestFile[currentRoundValue];
        bracket.Rounds.filter((round) => round.Name === roundName).forEach((round) => {
            round.BestOf = Number(currentMappool.bestOf);
            round.BanCount = Number(currentMappool.banCount);
            Object.keys(currentMappool.beatmaps).forEach((map) => {
                round.Beatmaps.push({
                    "ID": Number(currentMappool.beatmaps[map]),
                    "Mods": map.substring(0, 2)
                });
            });
        });
    }

    // Winners' bracket
    for (let currentRoundValue = firstRound; currentRoundValue >= 1; currentRoundValue /= 2) {
        cache.yStartingOffsetForRound = 25 * (2 ** cache.roundNumber) - 50 + cache.yStartingAnchor;
        for (let matchesInRound = 1; matchesInRound <= currentRoundValue / 2; matchesInRound += 1) {
            let roundName = "";
            if (currentRoundValue === 8) {
                roundName = "Quarterfinals"
            } else if (currentRoundValue === 4) {
                roundName = "Semifinals"
            } else if (currentRoundValue === 2) {
                roundName = "Finals"
            } else {
                roundName = `Round of ${currentRoundValue}`;
            }

            bracket.Matches.push({
                "ID": Number(matchID),
                "Position": {
                    "X": Number(cache.xPosition),
                    "Y": Number((matchesInRound - 1) * Y_DISTANCE_BASE * cache.yDistanceMultiplier + cache.yStartingOffsetForRound)
                }
            });

            if (matchID !== firstRound - 1) {
                bracket.Progressions.push({
                    "SourceID": Number(matchID),
                    "TargetID": Number(Math.floor((matchID - 1) / 2) + (firstRound / 2 + 1))
                });
            }

            bracket.Rounds.find((round) => round.Name === roundName).Matches.push(matchID);

            if (isDoubleElimination === true) {
                if (currentRoundValue === firstRound) {
                    bracket.Progressions.push({
                        "SourceID": Number(matchID),
                        "TargetID": Number(Math.floor((matchID - 1) / 2) + firstRound),
                        "Losers": Boolean(true)
                    });
                } else {
                    bracket.Progressions.push({
                        "SourceID": Number(matchID),
                        "TargetID": Number(matchID + firstRound - (firstRound / (2 ** cache.roundNumber)) - 1),
                        "Losers": Boolean(true)
                    });
                }
            }

            matchID += 1;
        }

        cache.yDistanceMultiplier *= 2;
        cache.xPosition += X_POSITION_OFFSET;
        cache.roundNumber += 1;
    }

    // Add initial matches (if there are any)
    if (initialMatchesFromMainFile.length > 0) {
        let smallerNumber = firstRound / 2 > initialMatchesFromMainFile.length ? initialMatchesFromMainFile.length : firstRound / 2;

        for (let i = 0; i < smallerNumber; i += 1) {
            if (i >= initialMatchesFromMainFile.length) {
                break;
            }

            let matchTeams = initialMatchesFromMainFile[i];
            bracket.Matches.find((match) => match.ID === i + 1).Team1Acronym = String(matchTeams.left.Acronym);
            bracket.Matches.find((match) => match.ID === i + 1).Team2Acronym = String(matchTeams.right.Acronym);
        }
    }

    // Losers' bracket OR optional match for 3rd place
    if (isDoubleElimination === true) {
        cache.xPosition = 0;
        cache.yDistanceMultiplier = 1;
        cache.yStartingAnchor = (firstRound / 2 - 1) * Y_DISTANCE_BASE * cache.yDistanceMultiplier + BRACKET_GAP;
        cache.roundNumber = 1;

        for (let currentRoundValue = firstRound; currentRoundValue >= 1; currentRoundValue /= 2) {
            cache.yStartingOffsetForRound = 25 * (2 ** cache.roundNumber) - 50 + cache.yStartingAnchor;
            for (let matchesInRound = 1; matchesInRound <= currentRoundValue / 4; matchesInRound += 1) {
                let roundName = "";
                if (currentRoundValue / 2 === 8) {
                    roundName = "Quarterfinals"
                } else if (currentRoundValue / 2 === 4) {
                    roundName = "Semifinals"
                } else if (currentRoundValue / 2 === 2) {
                    roundName = "Finals"
                } else {
                    roundName = `Round of ${currentRoundValue / 2}`;
                }

                bracket.Matches.push({
                    "ID": Number(matchID),
                    "Losers": Boolean(true),
                    "Position": {
                        "X": Number(cache.xPosition),
                        "Y": Number((matchesInRound - 1) * Y_DISTANCE_BASE * cache.yDistanceMultiplier + cache.yStartingOffsetForRound)
                    }
                });

                if (currentRoundValue / 4 >= 1) {
                    bracket.Progressions.push({
                        "SourceID": Number(matchID),
                        "TargetID": Number(matchID + currentRoundValue / 4)
                    });
                }

                bracket.Rounds.find((round) => round.Name === roundName).Matches.push(matchID);

                matchID += 1;
            }

            cache.xPosition += X_POSITION_OFFSET;
            cache.yStartingOffsetForRound -= 50;
            cache.yStartingAnchor -= 50;

            for (let matchesInRound = 1; matchesInRound <= currentRoundValue / 4; matchesInRound += 1) {
                let roundName = "";
                if (currentRoundValue / 4 === 8) {
                    roundName = "Quarterfinals"
                } else if (currentRoundValue / 4 === 4) {
                    roundName = "Semifinals"
                } else if (currentRoundValue / 4 === 2) {
                    roundName = "Finals"
                } else if (currentRoundValue / 4 === 1) {
                    roundName = "Grand Finals"
                } else {
                    roundName = `Round of ${currentRoundValue / 4}`;
                }

                bracket.Matches.push({
                    "ID": Number(matchID),
                    "Losers": Boolean(true),
                    "Position": {
                        "X": Number(cache.xPosition),
                        "Y": Number((matchesInRound - 1) * Y_DISTANCE_BASE * cache.yDistanceMultiplier + cache.yStartingOffsetForRound)
                    }
                });

                if (currentRoundValue / 4 > 1) {
                    bracket.Progressions.push({
                        "SourceID": Number(matchID),
                        "TargetID": Math.floor(matchID / 2) * 2 + cache.idOffset
                    });
                }

                bracket.Rounds.find((round) => round.Name === roundName && (round.Description === "" || round.Description === undefined)).Matches.push(matchID);

                if (matchID % 2 === 1) {
                    cache.idOffset -= 1;
                }
                matchID += 1;
            }

            cache.xPosition += X_POSITION_OFFSET;
            cache.yDistanceMultiplier *= 2;
            cache.roundNumber++;
        }

        // Add the Grand Finals matches (main match + optional bracket reset match)
        let latestWinnersBracketMatch = bracket.Matches.reduce((currentLatestMatch, match) => {
            if (match.Losers !== true && (currentLatestMatch === null || match.ID > currentLatestMatch.ID)) {
                return match;
            }
            return currentLatestMatch;
        }, null);
        let latestLosersBracketMatch = bracket.Matches.reduce((latestMatch, match) => {
            if (match.Losers !== false && (latestMatch === null || match.ID > latestMatch.ID)) {
                return match;
            }
            return latestMatch;
        }, null);

        bracket.Matches.push({
            "ID": Number(matchID),
            "Position": {
                "X": Number(latestLosersBracketMatch.Position.X + X_POSITION_OFFSET),
                // "Y": Number((latestWinnersBracketMatch.Position.Y + latestLosersBracketMatch.Position.Y) / 2)
                "Y": Number(latestWinnersBracketMatch.Position.Y + 50)
            }
        });
        bracket.Progressions.push({
            "SourceID": Number(latestWinnersBracketMatch.ID),
            "TargetID": Number(matchID)
        });
        bracket.Progressions.push({
            "SourceID": Number(latestLosersBracketMatch.ID),
            "TargetID": Number(matchID)
        });
        bracket.Rounds.find((round) => round.Name === "Grand Finals" && typeof (round.Description) === "undefined").Matches.push(matchID++);

        bracket.Matches.push({
            "ID": Number(matchID),
            "Position": {
                "X": Number(latestLosersBracketMatch.Position.X + X_POSITION_OFFSET * 2),
                // "Y": Number((latestWinnersBracketMatch.Position.Y + latestLosersBracketMatch.Position.Y) / 2)
                "Y": Number(latestWinnersBracketMatch.Position.Y + 50)
            }
        });
        bracket.Progressions.push({
            "SourceID": Number(matchID - 1),
            "TargetID": Number(matchID)
        });
        bracket.Progressions.push({
            "SourceID": Number(matchID - 1),
            "TargetID": Number(matchID),
            "Losers": Boolean(true)
        });
        bracket.Rounds.find((round) => round.Name === "Grand Finals" && typeof (round.Description) === "string").Matches.push(matchID);
    } else {
        if (Boolean(THIRD_PLACE_MATCH_CHECKBOX.checked) === true) {
            let latestMatch = bracket.Matches.reduce((currentLatestMatch, match) => {
                if (match.Losers !== true && (currentLatestMatch === null || match.ID > currentLatestMatch.ID)) {
                    return match;
                }
                return currentLatestMatch;
            }, null);

            bracket.Matches.push({
                "ID": matchID,
                "Losers": Boolean(true),
                "Position": {
                    "X": Number(latestMatch.Position.X),
                    "Y": Number(latestMatch.Position.Y + 200)
                }
            });
            bracket.Progressions.push({
                "SourceID": Number(matchID - 3),
                "TargetID": Number(matchID),
                "Losers": Boolean(true)
            });
            bracket.Progressions.push({
                "SourceID": Number(matchID - 2),
                "TargetID": Number(matchID),
                "Losers": Boolean(true)
            });

            bracket.Rounds.find((round) => round.Name === "Finals" && typeof (round.Description) === "string").Matches.push(matchID);
        }
    }
}