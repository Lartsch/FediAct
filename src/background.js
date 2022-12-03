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

// get redirect url (it will be the url on the toot authors home instance)
async function resolveToot(url) {
    return new Promise(async function(resolve) {
        var res = await fetch(url, {method: 'HEAD'})
        if (res.redirected) {
            resolve(res.url)
        } else {
            resolve(false)
        }
    });
}

async function fetchBearerToken() {
    var url = "https://" + settings.fedifollow_homeinstance;
    var res = await fetch(url);
    var text = await res.text();
    if (text) {
        // dom parser is not available in background workers, so we use regex to parse the html....
        // for some reason, regex groups do not seem to work in chrome background workers... the following is ugly but should work fine
        var content = text.match(tokenRegex);
        if (content) {
            var indexOne = content[0].search(/"access_token":"/);
            var indexTwo = content[0].search(/",/);
            if (indexOne > -1 && indexTwo > -1) {
                indexOne = indexOne + 16
                var token = content[0].substring(indexOne, indexTwo);
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

async function fetchData() {
    settings = await (browser || chrome).storage.local.get(settingsDefaults);
    if (settings.fedifollow_homeinstance) {
        await fetchBearerToken()
    } else {
        log("Home instance not set");
    }
    await (browser || chrome).storage.local.set(settings);
}

chrome.runtime.onInstalled.addListener(fetchData);
chrome.alarms.onAlarm.addListener(fetchData);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    resolveToot(request.url).then(sendResponse)
    return true
});