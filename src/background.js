var browser, chrome, settings;
var enableConsoleLog = true;
var logPrepend = "[FediFollow]";

var tokenRegex = /"access_token":".*?",/gm;

// required settings keys with defauls
var settingsDefaults = {
	fedifollow_homeinstance: null,
    fedifollow_showfollows: true
}

// create alarm every 3 minutes
chrome.alarms.create('refresh', { periodInMinutes: 1 });

function onError(error){
	console.error(`${logPrepend} Error: ${error}`);
}

// wrapper to prepend to log messages
function log(text) {
	if (enableConsoleLog) {
		console.log(logPrepend + ' ' + text)
	}
}

async function fetchBearerToken() {
    var url = "https://" + settings.fedifollow_homeinstance;
    var res = await fetch(url);
    var text = await res.text();
    if (text) {
        // dom parser is not available in background workers, so we use regex to parse the html....
        // for some reason, regex groups do not seem to work in chrome background workers... the following is ugly but should work fine
        var content = text.match(tokenRegex)[0];
        if (content) {
            var indexOne = content.search(/"access_token":"/);
            var indexTwo = content.search(/",/);
            if (indexOne > -1 && indexTwo > -1) {
                indexOne = indexOne + 16
                var token = content.substring(indexOne, indexTwo);
                console.log(token)
                if (token.length > 16) {
                    settings.fedifollow_token = token;
                    return;
                }
            }
        }
    }
    // reset token for inject.js to know
    settings.fedifollow_token = null;
    log("Token could not be found.");
}

async function fetchFollows() {
    var url = "https://" + settings.fedifollow_homeinstance + "/settings/exports/follows.csv";
    var res = await fetch(url);
    var text = await res.text();
    if (text) {
        var content = text.substring(text.indexOf("\n") + 1);
        var lines = content.split("\n");
        var follows = [];
        for (var line of lines) {
            follows.push(line.split(",")[0]);
        }
        settings.fedifollow_follows = follows;
        return;
    }
    log("Could not get follow list.");
}

async function run() {
    settings = await (browser || chrome).storage.local.get(settingsDefaults);
    if (settings.fedifollow_homeinstance) {
        await fetchBearerToken();
        if (settings.fedifollow_showfollows) {
            await fetchFollows();
        } else {
            log("External follow indication not enabled.")
        }
    } else {
        log("Home instance not set");
    }
    await (browser || chrome).storage.local.set(settings);
}

chrome.runtime.onInstalled.addListener(run);
chrome.alarms.onAlarm.addListener(run);