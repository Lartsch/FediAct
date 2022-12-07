var browser, chrome, settings;
var enableConsoleLog = true;
var logPrepend = "[FediAct]";

var tokenRegex = /"access_token":".*?",/gm;

// required settings keys with defauls
var settingsDefaults = {
	fediact_homeinstance: null,
    fediact_showfollows: true
}

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

// fetch API token here (will use logged in session automatically)
async function fetchBearerToken() {
    var url = "https://" + settings.fediact_homeinstance;
    var res = await fetch(url);
    var text = await res.text();
    if (text) {
        // dom parser is not available in background workers, so we use regex to parse the html....
        // for some reason, regex groups do also not seem to work in chrome background workers... the following is ugly but should work fine
        var content = text.match(tokenRegex);
        if (content) {
            var indexOne = content[0].search(/"access_token":"/);
            var indexTwo = content[0].search(/",/);
            if (indexOne > -1 && indexTwo > -1) {
                indexOne = indexOne + 16
                var token = content[0].substring(indexOne, indexTwo);
                console.log(token)
                if (token.length > 16) {
                    settings.fediact_token = token;
                    return;
                }
            }
        }
    }
    // reset token for inject.js to know
    settings.fediact_token = null;
    log("Token could not be found.");
}

async function fetchData() {
    settings = await (browser || chrome).storage.local.get(settingsDefaults);
    if (settings.fediact_homeinstance) {
        await fetchBearerToken()
    } else {
        log("Home instance not set");
    }
    await (browser || chrome).storage.local.set(settings);
}

// fetch api token right after install (mostly for debugging, when the ext. is reloaded)
chrome.runtime.onInstalled.addListener(fetchData);
// and also every 5 minutes
chrome.alarms.create('refresh', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(fetchData);

// different listeners for inter-script communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // the content script gave us an url to perform a 302 redirect with
    if(request.url) {
        resolveToot(request.url).then(sendResponse)
        return true
    }
    // immediately fetch api token after settings are updated
    if (request.updatedsettings) {
        fetchData()
    }
    // when the content script starts to process on a site, listen for tab changes (url)
    if (request.running) {
        chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
            // chrome tabs api does not support listener filters here
            // if the tabId of the update event is the same like the tabId that started the listener in the first place AND when the update event is an URL
            if (tabId === sender.tab.id && changeInfo.url) {
                // ... then let the content script know about the change
                chrome.tabs.sendMessage(tabId, {urlchanged: changeInfo.url})
            }
        });
    }
});