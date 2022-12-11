var browser, chrome, settings
const enableConsoleLog = true
const logPrepend = "[FediAct]"
const tokenInterval = 1 // minutes
const mutesApi = "/api/v1/mutes"
const blocksApi = "/api/v1/blocks"
const domainBlocksApi = "/api/v1/domain_blocks"

const tokenRegex = /"access_token":".*?",/gm

// required settings keys with defauls
const settingsDefaults = {
	fediact_homeinstance: null,
    fediact_showfollows: true,
    fediact_hidemuted: false,
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
        try {
            var res = await fetch(url, {method: 'HEAD'})
            if (res.redirected) {
             resolve(res.url)
            } else {
                resolve(false)
            }
        } catch(e) {
            log(e)
            resolve(false)
        }
    })
}

// fetch API token here (will use logged in session automatically)
async function fetchBearerToken() {
    var url = "https://" + settings.fediact_homeinstance
    try {
        var res = await fetch(url)
        var text = await res.text()
    } catch(e) {
        log(e)
        return false
    }
    if (text) {
        // dom parser is not available in background workers, so we use regex to parse the html....
        // for some reason, regex groups do also not seem to work in chrome background workers... the following is ugly but should work fine
        var content = text.match(tokenRegex)
        if (content) {
            var indexOne = content[0].search(/"access_token":"/)
            var indexTwo = content[0].search(/",/)
            if (indexOne > -1 && indexTwo > -1) {
                indexOne = indexOne + 16
                var token = content[0].substring(indexOne, indexTwo)
                if (token.length > 16) {
                    settings.fediact_token = token
                    return true
                }
            }
        }
    }
    // reset token for inject.js to know
    settings.fediact_token = null
    log("Token could not be found.")
}

// grab all accounts that are muted by the user
async function fetchMutesAndBlocks() {
    if (settings.fediact_hidemuted) {
        // set empty initially
        [settings.fediact_mutesblocks, settings.fediact_domainblocks] = [[],[]]
        var [mutes, blocks, domainblocks] = await Promise.all([
            fetch("https://" + settings.fediact_homeinstance + mutesApi, {headers: {"Authorization": "Bearer "+settings.fediact_token}}).then((response) => response.json()),
            fetch("https://" + settings.fediact_homeinstance + blocksApi, {headers: {"Authorization": "Bearer "+settings.fediact_token}}).then((response) => response.json()),
            fetch("https://" + settings.fediact_homeinstance + domainBlocksApi, {headers: {"Authorization": "Bearer "+settings.fediact_token}}).then((response) => response.json())
        ])
        if (mutes.length) {
            settings.fediact_mutesblocks.push(...mutes.map(acc => acc.acct))
        }
        if (blocks.length) {
            settings.fediact_mutesblocks.push(...blocks.map(acc => acc.acct))
        }
        // filter duplicates
        settings.fediact_mutesblocks = settings.fediact_mutesblocks.filter((element, index) => {
            return (settings.fediact_mutesblocks.indexOf(element) == index)
        })
        if (domainblocks.length) {
            settings.fediact_domainblocks = domainblocks
        }
    }
}

async function fetchData() {
    try {
        settings = await (browser || chrome).storage.local.get(settingsDefaults)
    } catch(e) {
        log(e)
        return false
    }
    if (settings.fediact_homeinstance) {
        await fetchBearerToken()
        await fetchMutesAndBlocks()
    } else {
        log("Home instance not set")
    }
    try {
        await (browser || chrome).storage.local.set(settings)
    } catch {
        log(e)
    }
}

async function reloadListeningScripts() {
    chrome.tabs.query({}, async function(tabs) {
        for (var i=0; i<tabs.length; ++i) {
            try {
                await chrome.tabs.sendMessage(tabs[i].id, {updatedfedisettings: true})
            } catch(e) {
                // all non-listening tabs will throw an error, we can ignore it
                continue
            }
       }
    })
}

// fetch api token right after install (mostly for debugging, when the ext. is reloaded)
chrome.runtime.onInstalled.addListener(fetchData)
// and also every 3 minutes
chrome.alarms.create('refresh', { periodInMinutes: tokenInterval })
chrome.alarms.onAlarm.addListener(fetchData)

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
        reloadListeningScripts()
    }
    // when the content script starts to process on a site, listen for tab changes (url)
    if (request.running) {
        chrome.tabs.onUpdated.addListener(async function(tabId, changeInfo, tab) {
            // chrome tabs api does not support listener filters here
            // if the tabId of the update event is the same like the tabId that started the listener in the first place AND when the update event is an URL
            if (tabId === sender.tab.id && changeInfo.url) {
                // ... then let the content script know about the change
                try {
                    await chrome.tabs.sendMessage(tabId, {urlchanged: changeInfo.url})
                } catch(e) {
                    log(e)
                }
            }
        })
    }
})