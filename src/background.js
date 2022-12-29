var browser, chrome, settings
const enableConsoleLog = false
const logPrepend = "[FediAct]"
const tokenInterval = 1 // minutes
const mutesApi = "/api/v1/mutes"
const blocksApi = "/api/v1/blocks"
const domainBlocksApi = "/api/v1/domain_blocks"
const timeout = 15000
const tokenRegex = /"access_token":".*?",/gm
// required settings keys with defauls
const settingsDefaults = {
	fediact_homeinstance: null,
    fediact_token: null
}

// wrapper to prepend to log messages
function log(text) {
	if (enableConsoleLog) {
		console.log(logPrepend + ' ' + text)
	}
}

// get redirect url (it will be the url on the toot authors home instance)
async function resolveExternalTootHome(url) {
    return new Promise(async function(resolve) {
        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => {
                log("Timed out")
                controller.abort()
            }, timeout)
            var res = await fetch(url, {method: 'HEAD', signal: controller.signal})
            clearTimeout(timeoutId)
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

// get redirect url (it will be the url on the toot authors home instance)
async function generalRequest(data) {
    return new Promise(async function(resolve) {
        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => {
                log("Timed out")
                controller.abort()
            }, timeout)
            if (data[3]) {
                data[2]["Content-Type"] = "application/json"
                var res = await fetch(data[1], {
                    method: data[0],
                    signal: controller.signal,
                    headers: data[2],
                    body: JSON.stringify(data[3])
                })
            } else if (data[2]) {
                var res = await fetch(data[1], {
                    method: data[0],
                    signal: controller.signal,
                    headers: data[2]
                })
            } else {
                var res = await fetch(data[1], {
                    method: data[0],
                    signal: controller.signal
                })
            }
            clearTimeout(timeoutId)
            if (res.status  >= 200 && res.status < 300 ) {
                const contentType = res.headers.get("content-type")
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    var restext = await res.text()
                    resolve(restext)
                } else {
                    resolve(false)
                }
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
    return new Promise(async function(resolve) {
        var url = "https://" + settings.fediact_homeinstance
        try {
            var res = await fetch(url)
            var text = await res.text()
        } catch(e) {
            log(e)
            resolve(false)
            return
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
                        resolve(true)
                        return
                    }
                }
            }
        }
        // reset token for inject.js to know
        settings.fediact_token = null
        log("Token could not be found.")
        resolve(false)
    })
}

// grab all accounts/instances that are muted/blocked by the user
// this is only done here in the bg script so we have data available on load of pages without first performing 3 (!) requests
// otherwise this would lead to problems with element detection / low performance (espcially v3 instances)
// mutes/blocks are updated in content script on page context changes and after performing mutes/block actions
function fetchMutesAndBlocks() {
    return new Promise(async function(resolve) {
        try {
            // set empty initially
            [settings.fediact_mutes, settings.fediact_blocks, settings.fediact_domainblocks] = [[],[],[]]
            var [mutes, blocks, domainblocks] = await Promise.all([
                fetch("https://" + settings.fediact_homeinstance + mutesApi, {headers: {"Authorization": "Bearer "+settings.fediact_token}}).then((response) => response.json()),
                fetch("https://" + settings.fediact_homeinstance + blocksApi, {headers: {"Authorization": "Bearer "+settings.fediact_token}}).then((response) => response.json()),
                fetch("https://" + settings.fediact_homeinstance + domainBlocksApi, {headers: {"Authorization": "Bearer "+settings.fediact_token}}).then((response) => response.json())
            ])
            if (mutes.length) {
                settings.fediact_mutes.push(...mutes.map(acc => acc.acct))
            }
            if (blocks.length) {
                settings.fediact_blocks.push(...blocks.map(acc => acc.acct))
            }
            if (domainblocks.length) {
                settings.fediact_domainblocks = domainblocks
            }
            resolve(true)
        } catch {
            resolve(false)
        }
    })
}

async function fetchData(token, mutesblocks) {
    return new Promise(async function(resolve) {
        var resolved = false
        try {
            settings = await (browser || chrome).storage.local.get(settingsDefaults)
            if (settings.fediact_homeinstance) {
                if (token || mutesblocks) {
                    if (token || !(settings.fediact_token)) {
                        await fetchBearerToken()
                    }
                    if (mutesblocks) {
                        await fetchMutesAndBlocks()
                    }
                    try {
                        await (browser || chrome).storage.local.set(settings)
                        resolved = true
                    } catch {
                        log(e)
                    }
                }
            } else {
                log("Home instance not set")
            }
        } catch(e) {
            log(e)
        }
        resolve(resolved)
    })
}

async function reloadListeningScripts() {
    chrome.tabs.query({}, async function(tabs) {
        for (var i=0; i<tabs.length; ++i) {
            try {
                chrome.tabs.sendMessage(tabs[i].id, {updatedfedisettings: true})
            } catch(e) {
                // all non-listening tabs will throw an error, we can ignore it
                continue
            }
        }
    })
}

// fetch api token right after install (mostly for debugging, when the ext. is reloaded)
chrome.runtime.onInstalled.addListener(function(){fetchData(true, true)})
// and also every 3 minutes
chrome.alarms.create('refresh', { periodInMinutes: tokenInterval })
chrome.alarms.onAlarm.addListener(function(){fetchData(true, true)})

// different listeners for inter-script communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // the content script gave us an url to perform a 302 redirect with
    if(request.externaltoot) {
        resolveExternalTootHome(request.externaltoot).then(sendResponse)
        return true
    }
    // the content script gave us an url to perform a 302 redirect with
    if(request.requestdata) {
        generalRequest(request.requestdata).then(sendResponse)
        return true
    }
    // immediately fetch api token after settings are updated
    if (request.updatedsettings) {
        fetchData(true, true).then(reloadListeningScripts)
        return true
    }
    if (request.updatemutedblocked) {
        fetchData(false, true).then(sendResponse)
        return true
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