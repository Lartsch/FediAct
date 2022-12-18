// =-=-=-=-==-=-=-=-==-=-=-=-==-=-=
// =-=-=-=-=-= CONSTANTS =-==-=-=-=
// =-=-=-=-==-=-=-=-==-=-=-=-==-=-=

const followButtonPaths = ["div.account__header button.logo-button","div.public-account-header a.logo-button","div.account-card a.logo-button","div.directory-card a.icon-button", "div.detailed-status a.logo-button", "button.remote-button", "div.account__header button.button--follow"]
const profileNamePaths = ["div.account__header__tabs__name small", "div.public-account-header__tabs__name small", "div.detailed-status span.display-name__account", "div.display-name > span", "a.user-screen-name", "div.profile-info-panel small"]
const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/
const handleExtractUrlRegex = /^(?<domain>https?:\/\/(?:\.?[a-z0-9-]+)+(?:\.[a-z]+){1})?\/?@(?<handle>\w+)(?:@(?<handledomain>(?:[\w-]+\.)+?\w+))?(?:\/(?<tootid>\d+))?\/?$/
const handleExtractUriRegex = /^(?<domain>https?:\/\/(?:\.?[a-z0-9-]+)+(?:\.[a-z]+){1})(?:\/users\/)(?<handle>\w+)(?:(?:\/statuses\/)(?<tootid>\d+))?\/?$/
const enableConsoleLog = true
const logPrepend = "[FediAct]"
const instanceApi = "/api/v1/instance"
const statusApi = "/api/v1/statuses"
const searchApi = "/api/v2/search"
const accountsApi = "/api/v1/accounts"
const mutesApi = "/api/v1/mutes"
const blocksApi = "/api/v1/blocks"
const domainBlocksApi = "/api/v1/domain_blocks"
const pollsApi = "/api/v1/polls"
const apiDelay = 500
const maxTootCache = 200
const modalHtml = `
<div style="position: fixed; z-index: 99999; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgb(0,0,0); background-color: rgba(0,0,0,0.4); margin: 0; padding: 0;" class="fedimodal">
	<div style="background-color: #494949; border: 1px solid #888; width: 50%; max-width: 300px; left: 50%; top: 50%; transform: translate(-50%, -50%); position: absolute; margin: 0; padding: 0;" class="fedimodal-content">
		<ul style="width: 100%; margin: 0; padding: 0;">
		</ul>
	</div>
</div>`

// settings keys with defauls
var settings = {}
const settingsDefaults = {
	fediact_homeinstance: null,
	fediact_alert: false,
	fediact_mode: "blacklist",
	fediact_whitelist: null,
	fediact_blacklist: null,
	fediact_target: "_self",
	fediact_autoaction: true,
	fediact_token: null,
	fediact_showfollows: true,
	fediact_redirects: true,
	fediact_enabledelay: true,
	fediact_hidemuted: false,
	fediact_runifloggedin: false,
	fediact_showtoot: true,
	fediact_mutes: [],
	fediact_blocks: [],
	fediact_domainblocks: []
}
const tmpSettings = {
	fedireply: undefined,
	lasthomerequest: undefined,
	whitelist: undefined,
	blacklist: undefined,
	exturi: undefined,
	tokenheader: undefined,
	processed: [],
	processedFollow: [],
	isProcessing: []
}

// fix for cross-browser storage api compatibility and other global vars
var browser, chrome


// =-=-=-=-==-=-=-=-==-=-=-=-=-
// =-=-=-=-=-= UTILS =-==-=-=-=
// =-=-=-=-==-=-=-=-==-=-=-=-=-

// wrappers to prepend to log messages
function log(text) {
	if (enableConsoleLog) {
		console.log(logPrepend + ' ' + text)
	}
}

// Custom solution for detecting inserted nodes
// Works in combination with nodeinserted.css (fixes Firefox blocking addon-inserted <style> elements for sites with CSP)
// Is more reliable/practicable in certain situations than mutationobserver, who will ignore any node that was inserted with its parent node at once
(function($) {
    $.fn.DOMNodeAppear = function(callback, selector) {
      if (!selector) {
        return false
      }
	  // catch all animationstart events
      $(document).on('animationstart webkitAnimationStart oanimationstart MSAnimationStart', function(e){
		// check if the animatonname equals our animation and if the element is one of our selectors
        if (e.originalEvent.animationName == 'nodeInserted' && $(e.target).is(selector)) {
          if (typeof callback == 'function') {
			// return the complete object in the callback
            callback(e)
          }
        }
      })
    }
    jQuery.fn.onAppear = jQuery.fn.DOMNodeAppear
})(jQuery)

// for checking if logged in on an external instance
function isLoggedIn() {
	return new Promise(function(resolve) {
		if ($(document).find("script#initial-state").length) {
			var initialState = $(document).find("script#initial-state").first()
			var stateJson = JSON.parse($(initialState).text())
			if (stateJson.meta.access_token) {
				resolve(true)
			}
		} else {
			$(document).DOMNodeAppear(function(e) {
				var initialState = $(e.target)
				var stateJson = JSON.parse($(initialState).text())
				if (stateJson.meta.access_token) {
					resolve(true)
				}
			}, "script#initial-state")
		}
		resolve(false)
	})
}

// extract given url parameter value
var getUrlParameter = function getUrlParameter(sParam) {
    var sPageURL = window.location.search.substring(1),
        sURLVariables = sPageURL.split('&'), sParameterName, i
    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=')
        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1])
        }
    }
    return false
}

// promisified xhr for api calls
async function makeRequest(method, url, extraheaders, jsonbody) {
	// try to prevent error 429 too many request by delaying home instance requests
	if (~url.indexOf(settings.fediact_homeinstance) && settings.fediact_enabledelay) {
		// get current time
		var currenttime = Date.now()
		// get difference of current time and time of last request
		var difference = currenttime - tmpSettings.lasthomerequest
		// if difference is smaller than our set api delay value...
		if (difference < apiDelay) {
			// ... then wait the time required to reach the api delay value...
			await new Promise(resolve => {
				setTimeout(function() {
					resolve()
				}, apiDelay-difference)
			})
		}
		// TODO: move this to the top? or get new Date.now() here?
		tmpSettings.lasthomerequest = currenttime
	}
	// return a new promise...
    return new Promise(function (resolve) {
		// create xhr
        let xhr = new XMLHttpRequest()
		// open it with the method and url specified
        xhr.open(method, url)
		// set timeout
        xhr.timeout = 3000
		// set extra headers if any were given
		if (extraheaders) {
			for (var key in extraheaders) {
				xhr.setRequestHeader(key, extraheaders[key])
			}
		}
		// on load, check if status is OK...
        xhr.onload = function () {
            if (this.status >= 200 && this.status < 300) {
				// is ok, resolve promise with response
                resolve(xhr.responseText)
            } else {
				// nope, resolve false
                resolve(false)
            }
        }
		// on any error, resolve false
		xhr.onerror = function() {
			log("Request to " + url + " failed.")
			resolve(false)
		}
		// send the request
		if (jsonbody) {
			xhr.setRequestHeader("Content-Type","application/json")
			xhr.send(JSON.stringify(jsonbody))
		} else {
			xhr.send()
		}
    })
}

// Escape characters used for regex
function escapeRegExp(string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

// Replace all occurrences of a substring
function replaceAll(str, find, replace) {
	return str.replace(new RegExp(escapeRegExp(find), 'g'), replace)
}

// handles redirects to home instance
function redirectTo(url) {
	// check if redirects are enabled at all
	if (settings.fediact_redirects) {
		// check if alert before redirect is enabled and show the prompt if so
		if (settings.fediact_alert) {
			if (!confirm("Redirecting to " + url)) {
				return
			}
		}
		// open the url in same/new tab
		var win = window.open(url, settings.fediact_target)
		log("Redirected to " + url)
		// focus the new tab if open was successfull
		if (win) {
			win.focus()
		} else {
			// otherwise notify user...
			log('Could not open new window. Please allow popups for this website.')
		}
	} else {
		log("Redirects disabled.")
	}
}


// =-=-=-=-==-=-=-=-==-=-=-=-==-=-=
// =-=-=-=-= INTERACTIONS =-=-=-=-=
// =-=-=-=-==-=-=-=-==-=-=-=-==-=-=

async function executeAction(id, action, polldata) {
	var requestUrl, condition, jsonbody, after
	var method = "POST"
	switch (action) {
		case 'domainblock':
			requestUrl = 'https://' + settings.fediact_homeinstance + domainBlocksApi + "?domain=" + id
			condition = function(response) {if(response){return true}}
			after = function() {updateMutedBlocked()}
			break
		case 'domainunblock':
			requestUrl = 'https://' + settings.fediact_homeinstance + domainBlocksApi + "?domain=" + id
			condition = function(response) {if(response){return true}}
			method = "DELETE"
			after = function() {updateMutedBlocked()}
			break
		case 'mute':
			requestUrl = 'https://' + settings.fediact_homeinstance + accountsApi + "/" + id + "/mute"
			condition = function(response) {return response.muting}
			after = function() {updateMutedBlocked()}
			break
		case 'unmute':
			requestUrl = 'https://' + settings.fediact_homeinstance + accountsApi + "/" + id + "/unmute"
			condition = function(response) {return !response.muting}
			after = function() {updateMutedBlocked()}
			break
		case 'block':
			requestUrl = 'https://' + settings.fediact_homeinstance + accountsApi + "/" + id + "/block"
			condition = function(response) {return response.blocking}
			after = function() {updateMutedBlocked()}
			break
		case 'unblock':
			requestUrl = 'https://' + settings.fediact_homeinstance + accountsApi + "/" + id + "/unblock"
			condition = function(response) {return !response.blocking}
			after = function() {updateMutedBlocked()}
			break
		case 'vote':
			requestUrl = 'https://' + settings.fediact_homeinstance + pollsApi + "/" + id + "/votes"
			condition = function(response) {return response.voted}
			jsonbody = polldata
			break
		case 'follow':
			requestUrl = 'https://' + settings.fediact_homeinstance + accountsApi + "/" + id + "/follow"
			condition = function(response) {return response.following || response.requested}
			break
		case 'boost':
			requestUrl = 'https://' + settings.fediact_homeinstance + statusApi + "/" + id + "/reblog"
			condition = function(response) {return response.reblogged}
			break
		case 'favourite':
			requestUrl = 'https://' + settings.fediact_homeinstance + statusApi + "/"  + id + "/favourite"
			condition = function(response) {return response.favourited}
			break
		case 'bookmark':
			requestUrl = 'https://' + settings.fediact_homeinstance + statusApi + "/"  + id + "/bookmark"
			condition = function(response) {return response.bookmarked}
			break
		case 'unfollow':
			requestUrl = 'https://' + settings.fediact_homeinstance + accountsApi + "/" + id + "/unfollow"
			condition = function(response) {return !response.following && !response.requested}
			break
		case 'unboost':
			requestUrl = 'https://' + settings.fediact_homeinstance + statusApi + "/" + id + "/unreblog"
			condition = function(response) {return !response.reblogged}
			break
		case 'unfavourite':
			requestUrl = 'https://' + settings.fediact_homeinstance + statusApi + "/"  + id + "/unfavourite"
			condition = function(response) {return !response.favourited}
			break
		case 'unbookmark':
			requestUrl = 'https://' + settings.fediact_homeinstance + statusApi + "/"  + id + "/unbookmark"
			condition = function(response) {return !response.bookmarked}
			break
		default:
			log("No valid action specified."); break
	}
	if (requestUrl) {
		var response = await makeRequest(method, requestUrl, tmpSettings.tokenheader, jsonbody)
		if (response) {
			// convert to json object
			response = JSON.parse(response)
			if (condition(response)) {
				if (after !== undefined) {
					after()
				}
				return true
			}
		}
	}
	log(action + " action failed.")
}

// allows to check if user is following one or multiple user IDs on the home instance
async function isFollowingHomeInstance(ids) {
	var requestUrl = 'https://' + settings.fediact_homeinstance + accountsApi + "/relationships?"
	// build the request url with one or multiple IDs
	for (const id of ids) {
		// trailing & is no issue
		requestUrl += "id[]=" + id.toString() + "&"
	}
	// make the request
	var responseFollowing = await makeRequest("GET", requestUrl, tmpSettings.tokenheader, null)
	// fill response array according to id amount with false
	const follows = Array(ids.length).fill(false)
	// parse the response
	if (responseFollowing) {
		responseFollowing = JSON.parse(responseFollowing)
		// iterate over ids and accounts in response
		for (var i = 0; i < ids.length; i++) {
			for (account of responseFollowing) {
				// check if the current account matches the id at the current index
				if (account.id == ids[i]) {
					if (account.following || account.requested) {
						// update the response array at the given index with true if the account is already followed
						follows[i] = true
					}
				}
			}
		}
	}
	return follows
}

// clear handle for comparison with mutes/blocks
function clearHandle(handle) {
	// remove leading @
	if (handle.startsWith("@")) {
		handle = handle.slice(1)
	}
	// add local uri if handle has no domain already
	if (handle.split("@").length-1 == 0) {
		handle = handle + "@" + tmpSettings.exturi
	}
	return handle
}

function isBlocked(handle) {
	handle = clearHandle(handle)
	if (settings.fediact_blocks.includes(handle)) {
		return true
	}
}

// check if handle is muted
function isMuted(handle) {
	handle = clearHandle(handle)
	if (settings.fediact_mutes.includes(handle)) {
		return true
	}
}

// check if handle is domain blocked
function isDomainBlocked(handle) {
	handle = clearHandle(handle)
	if (settings.fediact_domainblocks.includes(handle.split("@")[1])) {
		return true
	}
}

//execute the above 3 functions on a handle
function checkAllMutedBlocked(handle) {
	if (isMuted(handle) || isBlocked(handle) || isDomainBlocked(handle)) {
		return true
	}
}

// =-=-=-=-==-=-=-=-==-=-=-=-==-=-=
// =-=-=-=-=-= RESOLVING =-=-==-=-=
// =-=-=-=-==-=-=-=-==-=-=-=-==-=-=

// Return the user id on the users home instance
async function resolveHandleToHome(handle) {
	var requestUrl = 'https://' + settings.fediact_homeinstance + accountsApi + "/search?q=" + handle + "&resolve=true&limit=1&exclude_unreviewed=false"
	var searchResponse = await makeRequest("GET", requestUrl, tmpSettings.tokenheader, null)
	if (searchResponse) {
		searchResponse = JSON.parse(searchResponse)
		if (searchResponse[0].id) {
			// return the first account result
			return [searchResponse[0].id, searchResponse[0].acct]
		}
	}
	return false
}

// resolve a toot to the users home instance
async function resolveTootToHome(searchstring) {
	var requestUrl = 'https://' + settings.fediact_homeinstance + searchApi + "/?q=" + searchstring + "&resolve=true&limit=1&exclude_unreviewed=false"
	var response = await makeRequest("GET", requestUrl, tmpSettings.tokenheader, null)
	if (response) {
		response = JSON.parse(response)
		// do we have a status as result?
		if (!response.accounts.length && response.statuses.length) {
			var status = response.statuses[0]
			if (status.poll) {
				return [[status.account.acct, status.id, status.reblogged, status.favourited, status.bookmarked, status.account.id], [status.poll.id, status.poll.voted]]
			} else {
				// return the required status data
				return [[status.account.acct, status.id, status.reblogged, status.favourited, status.bookmarked, status.account.id], [false, false]]
			}
		} else {
			return [false, false]
		}
	} else {
		return [false, false]
	}
}

// Get a toot's (external) home instance url by using the 302 redirect feature of mastodon
// we send a message with the toot url to the background script, which will perform the HEAD request
// since XMLHttpRequest/fetch do not allow access to the location header
// TODO: FALLBACK IF 302 IS NOT SUPPORTED
function resolveTootToExternalHome(tooturl) {
	// TODO: check if a delay is necessary here too
	if (tooturl) {
		return new Promise(async function(resolve) {
			try {
				await chrome.runtime.sendMessage({url: tooturl}, function(response) {
					if(response) {
						resolve(response)
					} else {
						resolve(false)
					}
				})
			} catch (e) {
				// if we encounter an error here, it is likely since the extension context got invalidated, so reload the page
				log(e)
				log("Reloading page, extension likely got updated or reloaded.")
				location.reload()
			}
		})
	} else {
		return false
	}
}


// =-=-=-=-==-=-=-=-==-=-=-=-==-=-=-=
// =-=-=-=-= SITE PROCESSING =-==-=-=
// =-=-=-=-==-=-=-=-==-=-=-=-==-=-=-=

// custom implementation for allowing to toggle inline css
function toggleInlineCss(el, styles, toggleclass) {
	// toggle the active class (specified) on the element (specified), then check the current state
	var active = $(el).toggleClass(toggleclass).hasClass(toggleclass)
	// we can have multiple styles as input, so loop through them
	for (var style of styles) {
		// if the element now has the active class...
		if (active) {
			// set the third value as style (first value / 0 is style itself)
			$(el).css(style[0], style[2])
		} else {
			// otherwise, if the second value is "!remove"...
			if (style[1] == "!remove") {
				// remove the inline css by regex replacing
				var newinline = replaceAll($(el).attr('style'), style[0]+": "+style[2]+";", "")
				$(el).attr('style', newinline)
			} else {
				// otherwise set the second value as style
				$(el).css(style[0], style[1])
			}
		}
	}
}

// check if an toot identifier is already in the "processed" array
function isInProcessedToots(id) {
	// iterate array
	for (var i = 0; i < tmpSettings.processed.length; i++) {
		// if the the first value of the nested array at the current index matches the id we look for...
		if (tmpSettings.processed[i][0] == id) {
			// return the index
			return i
		}
	}
	// if none was found...
	return false
}

// add a toot to the "processed" array
function addToProcessedToots(toot) {
	// push the array first
	tmpSettings.processed.push(toot)
	// check the difference of the max elements to cache and the current length of the processed array
	var diff = tmpSettings.processed.length - maxTootCache
	// if diff is greater than 0...
	if (diff > 0) {
		// remove the first diff items from it
		tmpSettings.processed = tmpSettings.processed.splice(0,diff)
	}
	return tmpSettings.processed.length - 1
}

async function updateMutedBlocked() {
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
	updateSettings()
}

function showModal(settings) {
	// [ [action,tootdata],[action,tootdata] ]
	var baseEl = $(modalHtml)
	var appendTo = $(baseEl).find("ul")
	for (const entry of settings) {
		var nameUppercase = entry[0].charAt(0).toUpperCase() + entry[0].slice(1);
		var append = "<li style='cursor: pointer; width: 100%; padding: 5px 10px; box-sizing: border-box;'><a style='font-size: 16px; cursor: pointer; text-decoration: none; color: white;' fediaction='" + entry[0] + "' fediid='" + entry[1] + "'>" + nameUppercase + "</a></li>"
		$(appendTo).append($(append))
	}
	$("body").append($(baseEl))
	$("body").on("click", function(e) {
		if ($(e.target).is(".fedimodal li, .fedimodal li a")) {
			if ($(e.target).is(".fedimodal li")) {
				e.target = $(e.target).find("a")
			}
			var action = $(e.target).attr("fediaction")
			var id = $(e.target).attr("fediid")
			var done = executeAction(id, action, null)
			if (done) {
				$(baseEl).remove()
				$("body").off()
			} else {
				alert("Failed to " + action)
			}
		} else {
			$(baseEl).remove()
			$("body").off()
		}
	})
}

// trigger the reply button click - will only run when we are on a home instance url with fedireply parameter
async function processReply() {
	// wait for the detailed status action bar to appear
	$(document).DOMNodeAppear(function(e) {
		// find the reply button and click it
		$(e.target).find("button:has(i.fa-reply), button:has(i.fa-reply-all)").click()
	}, "div.detailed-status__action-bar")
}

// process any toots found on supported sites
async function processToots() {
	// determine action when a button is clicked (except reply, which will always redirect)
	function getTootAction(e) {
		// set to false initially
		var action = false
		// check if the clicked element has a retweet icon
		if ($(e.currentTarget).children("i.fa-retweet").length) {
			// if so, check if the retweet icon has the fediactive class (for all other buttons it will be the button element itself)
			if ($(e.currentTarget).children("i.fa-retweet").hasClass("fediactive")) {
				// yep, has the class - so this action should be unboost
				action = "unboost"
			} else {
				// nope, so it will be a boost
				action = "boost"
			}
		// repeat for favourite and bookmark
		} else if ($(e.currentTarget).children("i.fa-star").length) {
			if ($(e.currentTarget).hasClass("fediactive")) {
				action = "unfavourite"
			} else {
				action = "favourite"
			}
		} else if ($(e.currentTarget).children("i.fa-bookmark").length) {
			if ($(e.currentTarget).hasClass("fediactive")) {
				action = "unbookmark"
			} else {
				action = "bookmark"
			}
		// should rarely reach this point, but some v3 instances include the action in the href only, so we have this as a fallback
		// (v3 public view does NOT have a bookmark button)
		} else if ($(e.currentTarget).attr("href")) {
			// does the href include "type=reblog"?
			if (~$(e.currentTarget).attr("href").indexOf("type=reblog")) {
				// if so, do as above...
				if ($(e.currentTarget).hasClass("fediactive")) {
					action = "unboost"
				} else {
					action = "boost"
				}
			// repeat for favourite
			} else if (~$(e.currentTarget).attr("href").indexOf("type=favourite")) {
				if ($(e.currentTarget).hasClass("fediactive")) {
					action = "unfavourite"
				} else {
					action = "favourite"
				}
			}
		}
		return action
	}
	// some toots contain an href which can be an already resolved external link or an internal reference
	function tootHrefCheck(temp) {
		// is it a full url?
		if (temp.startsWith("http")) {
			// yes, create a new URL() to access its parts
			var tempUrl = new URL(temp)
			// is the hostname of the URL the same as the current instance hostname?
			if (location.hostname == tempUrl.hostname) {
				// yes, so its a local toot id
				temp = temp.split("/")
				// handle trailing / case
				var tempLast = temp.pop() || temp.pop()
				return [false, tempLast]
			} else {
				// return full URL, since this is already a resolved link to the toot's home instance
				return [true, temp]
			}
		} else {
			// no, so it must be a local toot id as well
			temp = temp.split("/")
			var tempLast = temp.pop() || temp.pop()
			return [false, tempLast]
		}
	}
	// get only the toot author handle
	function getTootAuthor(el) {
		// find the element containing the display name and return text if found
		if ($(el).find("span.display-name__account").length) {
			return $(el).find("span.display-name__account").first().text().trim()
		}
	}
	// check elements that can contain the local toot id and return it if found
	function getTootInternalId(el) {
		// detailed status wrapper - get id from current document url
		if ($(el).is(".detailed-status__wrapper")) {
			// we will use the last part of the URL path - this should be more universal than always selecting the fifth "/" slice
			var temp = window.location.href.split("?")[0].split("/")
			return (temp.pop() || temp.pop())
		// otherwise check if current element has data-id attribute
		} else if ($(el).attr("data-id")) {
			// split by "-" to respect some ids startin with "f-"
			return $(el).attr("data-id").split("-").slice(-1)[0]
		// otherwise do the same for any closest article or div with the data-id attribute
		} else if ($(el).closest("article[data-id], div[data-id]").length) {
			return $(el).closest("article[data-id], div[data-id]").first().attr("data-id").split("-").slice(-1)[0]
		} else if ($(el).find("a.icon-button:has(i.fa-star), a.detailed-status__link:has(i.fa-star)").length) {
			var hrefEl = $(el).find("a.icon-button:has(i.fa-star), a.detailed-status__link:has(i.fa-star)").first()
			if ($(hrefEl).attr("href")) {
				var hrefAttr = $(hrefEl).attr("href")
				if (~hrefAttr.indexOf("interact/")) {
					var splitted = hrefAttr.split("?")[0].split("/")
					var lastpart = splitted.pop() || splitted.pop()
					return lastpart
				}
			}
		}
	}
	// check elements that can contain an href (either resolved external link or internal reference)
	function getTootExtIntHref(el) {
		// for each element possibly containing an href, check if its and external fully resolved href or an internal reference and return the first found
		if ($(el).find("a.status__relative-time").length) {
			return tootHrefCheck($(el).find("a.status__relative-time").first().attr("href").split("?")[0])
		} else if ($(el).find("a.detailed-status__datetime").length) {
			return tootHrefCheck($(el).find("a.detailed-status__datetime").first().attr("href").split("?")[0])
		} else if ($(el).find("a.modal-button").length) {
			return tootHrefCheck($(el).find("a.modal-button").first().attr("href").split("?")[0])
		}
		return [false,undefined]
	}
	// check toot author, mentions and toot prepend mentions for applying mutes
	function processMutes(el, tootAuthor) {
		if (settings.fediact_hidemuted) {
			var hrefs = []
			if ($(el).siblings(".status__prepend").length) {
				var prepended = $(el).siblings(".status__prepend").first()
				if ($(prepended).find("a").attr("href")) {
					hrefs.push($(prepended).find("a").attr("href").split("?")[0])
				}
			}
			// build array of mentions in @user@domain.com format
			// NOTE: this will fail if ax external user handle uses another subdomain than hostname, but FediAct was not designed for that - this is best effort
			$(el).find("span.h-card").each(function() {
				hrefs.push($(this).find("a").attr("href").split("?")[0])
			})
			var processedHrefs = []
			for (var href of hrefs) {
				var splitted = href.split("/")
				var lastpart = splitted.pop() || splitted.pop()
				lastpart = lastpart.slice(1)
				if (href.startsWith("http")) {
					var url = new URL(href)
					if (url.hostname != tmpSettings.exturi && url.hostname != location.hostname) {
						// external handle
						processedHrefs.push(lastpart + "@" + url.hostname)
					} else {
						processedHrefs.push(lastpart + "@" + tmpSettings.exturi)
					}
				} else {
					processedHrefs.push(lastpart + "@" + tmpSettings.exturi)
				}
			}
			if (processedHrefs.some(r=> checkAllMutedBlocked(r)) || checkAllMutedBlocked(tootAuthor)) {
				$(el).hide()
				if (prepended) {
					$(prepended).hide()
				}
				return true
			}
		}
	}
	// main function to process each detected toot element
	async function process(el) {
		// extra step for detailed status elements to select the correct parent
		if ($(el).is("div.detailed-status") && $(el).closest("div.focusable").length) {
			el = $(el).closest("div.focusable")
		}
		// get toot data
		var tootAuthor = getTootAuthor($(el))
		// check if mutes apply and return if so
		if (processMutes(el, tootAuthor)) {
			return
		}
		var tootInternalId = getTootInternalId($(el))
		var [tootHrefIsExt, tootHrefOrId] = getTootExtIntHref($(el))
		// we will always need an internal reference to the toot, be it an actual internal toot id or the href of a toot already resolved to its home
		// tootInternalId will be preferred if both are set
		var internalIdentifier = tootInternalId || tootHrefOrId
		// do we have one of those?
		if (internalIdentifier) {
			var homeResolveStrings = []
			// check if id is already cached
			var cacheIndex = isInProcessedToots(internalIdentifier)
			// get all button elements of this toot
			var favButton = $(el).find("button:has(i.fa-star)").first()
			if (!$(favButton).length) {
				favButton = $(el).find("a.icon-button:has(i.fa-star), a.detailed-status__link:has(i.fa-star)")
			}
			var boostButton = $(el).find("button:has(i.fa-retweet)").first()
			if (!$(boostButton).length) {
				boostButton = $(el).find("a.icon-button:has(i.fa-retweet), a.detailed-status__link:has(i.fa-retweet)")
			}
			var bookmarkButton = $(el).find("button:has(i.fa-bookmark)").first()
			var replyButton = $(el).find("button:has(i.fa-reply), button:has(i.fa-reply-all), a.icon-button:has(i.fa-reply), a.icon-button:has(i.fa-reply-all)").first()
			var voteButton = $(el).find("div.poll button").first()
			var moreButton = $(el).find("button:has(i.fa-ellipsis-h)").first()
			// handles process when a vote button is clicked
			async function pollAction(id, redirect, e) {
				if (settings.fediact_autoaction) {
					var pollData = {
						choices: []
					}
					var pollDiv = $(e.currentTarget).closest("div.poll")
					var listEls = $(pollDiv).find("li")
					for (var i = 0; i < listEls.length; i++) {
						if ($(listEls[i]).find("span.active").length) {
							pollData.choices.push(String(i))
						}
					}
					var result = await executeAction(id, "vote", pollData)
					if (result) {
						$(e.currentTarget).hide()
						$(pollDiv).find("ul").replaceWith("<p style='font-style: italic'><a style='font-weight:bold; color:orange' href='" + redirect + "' target='" + settings.fediact_target + "'>View the results</a> on your home instance.<p>")
						if (cacheIndex) {
							tmpSettings.processed[cacheIndex][10] = true
							tmpSettings.processed[cacheIndex][11] = true
						}
					}
					return result
				}
			}
			// handles process when a toot button is clicked
			async function tootAction(id, e) {
				if (settings.fediact_autoaction) {
					// determine the action to perform
					var action = getTootAction(e)
					if (action) {
						// resolve url on home instance to get local toot/author identifiers and toot status
						var actionExecuted = await executeAction(id, action, null)
						if (actionExecuted) {
							if (cacheIndex) {
								// set interacted to true
								tmpSettings.processed[cacheIndex][11] = true
							}
							// if the action was successfully executed, update the element styles
							if (action == "boost" || action == "unboost") {
								// toggle inline css styles
								toggleInlineCss($(e.currentTarget),[["color","!remove","rgb(140, 141, 255)"]], "fediactive")
								toggleInlineCss($(e.currentTarget).find("i"),[["transition-duration", "!remove", "0.9s"],["background-position", "!remove", "0px 100%"]], "fediactive")
								// update element in cache if exists
								if (cacheIndex) {
									tmpSettings.processed[cacheIndex][3] = !tmpSettings.processed[cacheIndex][3]
								}
							// same for favourite, bookmarked....
							} else if (action == "favourite" || action == "unfavourite") {
								toggleInlineCss($(e.currentTarget),[["color","!remove","rgb(202, 143, 4)"]], "fediactive")
								toggleInlineCss($(e.currentTarget).find("i"),[["animation","spring-rotate-out 1s linear","spring-rotate-in 1s linear"]], "fediactive")
								if (cacheIndex) {
									tmpSettings.processed[cacheIndex][4] = !tmpSettings.processed[cacheIndex][4]
								}
							} else {
								toggleInlineCss($(e.currentTarget),[["color","!remove","rgb(255, 80, 80)"]], "fediactive")
								if (cacheIndex) {
									tmpSettings.processed[cacheIndex][5] = !tmpSettings.processed[cacheIndex][5]
								}
							}
							return true
						} else {
							log("Could not execute action on home instance.")
						}
					} else {
						log("Could not determine action.")
					}
				} else {
					log("Auto-action disabled.")
					return true
				}
			}
			// handles initialization of element styles
			function initStyles(tootdata) {
				// always remove any existing "Unresolved" indicator from the element first
				$(el).find(".feditriggered").remove()
				// is the toot unresolved?
				if (!tootdata[1]) {
					// yes, then add the Unresolved indicator
					$("<span class='feditriggered' style='color: orange; padding-right: 10px; padding-left: 10px'>Unresolved</span>").insertAfter($(favButton))
				} else {
					// otherwise start processing button styles (if enabled OR if the toot was already interacted with, to restore the state while still on the same page)
					// first enable the bookmark button (is disabled on external instances)
					$(bookmarkButton).removeClass("disabled").removeAttr("disabled")
					$(moreButton).removeClass("disabled").removeAttr("disabled")
					$(voteButton).removeAttr("disabled")
					if (settings.fediact_showtoot || tootdata[11]) {
						// set the toot buttons to active, depending on the state of the resolved toot and if the element already has the active class
						if (tootdata[4]) {
							if (!$(favButton).hasClass("fediactive")) {
								toggleInlineCss($(favButton),[["color","!remove","rgb(202, 143, 4)"]], "fediactive")
								toggleInlineCss($(favButton).find("i"),[["animation","spring-rotate-out 1s linear","spring-rotate-in 1s linear"]], "fediactive")
							}
						}
						// repeat for other buttons
						if (tootdata[3]) {
							if (!$(boostButton).find("i.fediactive").length) {
								toggleInlineCss($(boostButton),[["color","!remove","rgb(140, 141, 255)"]], "fediactive")
								toggleInlineCss($(boostButton).find("i"),[["transition-duration", "!remove", "0.9s"],["background-position", "!remove", "0px 100%"]], "fediactive")
							}
						}
						if (tootdata[5]) {
							if (!$(bookmarkButton).hasClass("fediactive")) {
								toggleInlineCss($(bookmarkButton),[["color","!remove","rgb(255, 80, 80)"]], "fediactive")
							}
						}
						if (tootdata[10]) {
							$(voteButton).hide()
							$(voteButton).closest("div.poll").find("ul").replaceWith("<p style='font-style: italic'><a style='font-weight:bold; color:orange' href='" + tootdata[7] + "' target='" + settings.fediact_target + "'>View the results</a> on your home instance.<p>")
						}
					}
				}
			}
			// handles binding of clicks events for all buttons of a toot
			function clickBinder(tootdata) {
				// reply button is simple, it will always redirect to the homeinstance with the fedireply parameter set
				$(replyButton).on("click", function(e){
					// prevent default and immediate propagation
					e.preventDefault()
					e.stopImmediatePropagation()
					// redirect to the resolved URL + fedireply parameter (so the extension can handle it after redirect)
					redirectTo(tootdata[7]+"?fedireply")
				})
				$(moreButton).on("click", function(e){
					// prevent default and immediate propagation
					e.preventDefault()
					e.stopImmediatePropagation()
					// redirect to the resolved URL + fedireply parameter (so the extension can handle it after redirect)
					var domainsplit = tootdata[1].split("@")
					var domain = domainsplit.pop() || domainsplit.pop()
					var modalLinks = []
					if (isBlocked(tootdata[1])) {
						modalLinks.push(["unblock",tootdata[6]])
					} else {
						modalLinks.push(["block",tootdata[6]])
					}
					if (isMuted(tootdata[1])) {
						modalLinks.push(["unmute",tootdata[6]])
					} else {
						modalLinks.push(["mute",tootdata[6]])
					}
					if (isDomainBlocked(tootdata[1])) {
						modalLinks.push(["domainunblock",domain])
					} else {
						modalLinks.push(["domainblock",domain])
					}
					showModal(modalLinks)
				})
				// for all other buttons...
				$([favButton, boostButton, bookmarkButton, voteButton]).each(function() {
					if ($(voteButton).length) {
						if ($(voteButton).get(0).isEqualNode($(this).get(0))) {
							var isVote = true
						}
					}
					// these behave differently with single / double click
					// we use a custom solution for handling dblclick since the default event does not work here
					// init function global vars required for single/double click handling
					var clicks = 0
					var timer
					$(this).on("click", async function(e) {
						// prevent default and immediate propagation
						e.preventDefault()
						e.stopImmediatePropagation()
						// increase click counter
						clicks++
						// this will always run, but see below for double click handling
						if (clicks == 1) {
							timer = setTimeout(async function() {
								if (isVote && !tootdata[10]) {
									var actionExecuted = pollAction(tootdata[9], tootdata[7], e)
								} else {
									// execute action on click and get result (fail/success)
									var actionExecuted = await tootAction(tootdata[2], e)
								}
								if (!actionExecuted) {
									log("Action failed.")
								}
								// reset clicks
								clicks = 0
							}, 350)
						} else {
							// if we get here, the element was clicked twice before the above timeout was over, so this is a double click
							// reset the above timeout so it wont execute
							clearTimeout(timer)
							if (isVote) {
								var actionExecuted = pollAction(tootdata[9], tootdata[7], e)
							} else {
								// execute action on click and get result (fail/success)
								var actionExecuted = await tootAction(tootdata[2], e)
							}
							if (!actionExecuted) {
								log("Action failed.")
							} else {
								// redirect to home instance with the resolved toot url
								redirectTo(tootdata[7])
							}
							// reset clicks
							clicks = 0
						}
					}).on("dblclick", function(e) {
						// default dblclick event must be prevented
						e.preventDefault()
						e.stopImmediatePropagation()
					})
				})
			}
			// if element is not in cache, resolve it
			if (!cacheIndex) {
				// always add the already resolved external toot href first, if it was set
				if (tootHrefIsExt) {
					homeResolveStrings.push(tootHrefOrId)
				}
				// we can only process internalTootIds if we also have a user handle
				if (tootAuthor) {
					// get handle/handledomain without @
					var matches = tootAuthor.match(handleExtractUrlRegex)
					var [isExternalHandle, extHomeResolved] = [false, false]
					// if we have a handledomain...
					if (matches.groups.handledomain) {
						// check if the current hostname includes that handle domain...
						if (!(~location.hostname.indexOf(matches.groups.handledomain))) {
							isExternalHandle = true
						}
					}
					// add ids
					var internalTootIds = [tootInternalId]
					if (!tootHrefIsExt) {
						internalTootIds.push(tootHrefOrId)
					}
					// filter duplicates and undefined values (shorter than checking with if clauses when adding...)
					internalTootIds = internalTootIds.filter((element, index) => {
						return (element !== undefined && internalTootIds.indexOf(element) == index)
					})
					// loop through internal ids (will be only 1 normally, but we want to maximize our chances for resolving later on)
					for (var internalTootId of internalTootIds) {
						// if its not an external handle...
						if (!isExternalHandle) {
							// add resolve strings for both formats on the current external instance
							homeResolveStrings.push(location.protocol + "//" + location.hostname + "/users/" + matches.groups.handle + "/statuses/" + internalTootId)
							homeResolveStrings.push(location.protocol + "//" + location.hostname + "/@" + matches.groups.handle + "/" + internalTootId)
						// otherwise, start external resolve process if not done already for one of the internalTootIds
						} else if (!extHomeResolved) {
							var extResolveString = location.protocol + '//' + location.hostname + "/" + tootAuthor + "/" + internalTootId
							var resolveTootHome = await resolveTootToExternalHome(extResolveString)
							if (resolveTootHome) {
								// update var so next tootid will not be resolved externally, if any more
								extHomeResolved = true
								// always push the originally returned url
								homeResolveStrings.push(resolveTootHome)
								// if it matches the URI format, also add the @ format
								if (handleExtractUriRegex.test(resolveTootHome)) {
									var tmpmatches = resolveTootHome.match(handleExtractUriRegex)
									if (tmpmatches.groups.handle && tmpmatches.groups.tootid && tmpmatches.groups.domain) {
										homeResolveStrings.push(tmpmatches.groups.domain + "/@" + tmpmatches.groups.handle + "/" + tmpmatches.groups.tootid)
									}
								// otherwise, if it matches the @ format, also add the URI format
								} else if (handleExtractUrlRegex.test(resolveTootHome)) {
									var tmpmatches = resolveTootHome.match(handleExtractUrlRegex)
									if (tmpmatches.groups.handle && tmpmatches.groups.tootid && tmpmatches.groups.domain) {
										homeResolveStrings.push(tmpmatches.groups.domain + "/users/" + tmpmatches.groups.handle + "/statuses/" + tmpmatches.groups.tootid)
									}
								}
							}
							// always add fallback to current external instance URL (for external handles, there is no /users/... format)
							homeResolveStrings.push(location.protocol + "//" + location.hostname + "/" + tootAuthor + "/" + internalTootId)
						}
					}
				}
				// if we have any resolve strings to resolve on our home instance...
				if (homeResolveStrings.length) {
					// filter duplicates
					homeResolveStrings = homeResolveStrings.filter((element, index) => {
						return (homeResolveStrings.indexOf(element) == index)
					})
					// initialize with false
					var resolvedToHomeInstance = false
					// for each resolve string...
					for (var homeResolveString of homeResolveStrings) {
						// run only if not already resolved
						if (!resolvedToHomeInstance) {
							// resolve toot on actual home instance
							var [resolvedToot, poll] = await resolveTootToHome(homeResolveString) // [status.account.acct, status.id, status.reblogged, status.favourited, status.bookmarked, status.account.id], [pollid/false, voted]
							if (resolvedToot) {
								// if successful, set condition to true (so it will not be resolved twice)
								resolvedToHomeInstance = true
								// set the redirect to home instance URL in @ format
								var redirectUrl = 'https://' + settings.fediact_homeinstance + "/@" + resolvedToot[0] + "/" + resolvedToot[1]
								// prepare the cache entry / toot data entry
								var fullEntry = [internalIdentifier, ...resolvedToot, redirectUrl, true, ...poll, false]
								// 0: internal identifier; 1: toot home acct / false 2: toot home id 3: toot reblogged 4: toot favourited 5: toot bookmarked 6: home account id 7: redirect url 8: ??? crap! 9: poll id / false 10: poll voted 11: interacted
							}
						}
					}
					// was any resolve successful?
					if (resolvedToHomeInstance) {
						// yes, so add to processed toots with the full toot data entry
						cacheIndex = addToProcessedToots(fullEntry)
						// ... and init styles
						initStyles(fullEntry)
						// continue with click handling...
						clickBinder(fullEntry)
					} else {
						// no, but we will still add the toot to cache as unresolved
						log("Failed to resolve: "+homeResolveStrings)
						cacheIndex = addToProcessedToots([internalIdentifier, false])
						initStyles([internalIdentifier, false])
					}
				} else {
					// no resolve possible without any resolve strings, but we will still add the toot to cache as unresolved
					log("Could not identify a post URI for home resolving.")
					cacheIndex = addToProcessedToots([internalIdentifier, false])
					initStyles([internalIdentifier, false])
				}
			} else {
				// the toot is already in cache, so grab it
				var toot = tmpSettings.processed[cacheIndex]
				// init stylings
				initStyles(toot)
				// if it is NOT unresolved, bind click handlers again
				if (toot[1]) {
					clickBinder(toot)
				}
			}
		} else {
			log("Could not get toot data.")
		}
	}
	// One DOMNodeAppear to rule them all
	$(document).DOMNodeAppear(async function(e) {
		if (!tmpSettings.isProcessing.includes($(e.target).get(0))) {
			tmpSettings.isProcessing.push($(e.target).get(0))
			process($(e.target))
		}
	}, "div.status, div.detailed-status")
	// try to find all existing elements (fixes some elements not being detected by DOMNodeAppear in rare cases, esp. v3)
	$(document).find("div.status, div.detailed-status").each(function(){
		if (!tmpSettings.isProcessing.includes($(this).get(0))) {
			tmpSettings.isProcessing.push($(this).get(0))
			process($(this))
		}
	})
}

// main function to listen for the follow button pressed and open a new tab with the home instance
async function processFollow() {
	// for mastodon v3 - v4 does not show follow buttons / account cards on /explore
	async function process(el) {
		var fullHandle
		var action = "follow"
		// wrapper for follow/unfollow action
		async function execFollow(id) {
			if (settings.fediact_autoaction) {
				// execute action and save result
				var response = await executeAction(id, action, null)
				// if action was successful, update button text and action value according to performed action
				if (action == "follow" && response) {
					$(el).text("Unfollow")
					action = "unfollow"
					return true
				// repeat for unfollow action
				} else if (action == "unfollow" && response) {
					$(el).text("Follow")
					action = "follow"
					return true
				}
			} else {
				log("Auto-action disabled.")
				return true
			}
		}
		// for mastodon v3 explore page
		if ($(el).closest("div.account-card").length) {
			fullHandle = $(el).closest("div.account-card").find("div.display-name > span").text().trim()
		} else {
			// for all other pages, where only one of the selection elements is present
			for (const selector of profileNamePaths) {
				if ($(selector).length) {
					fullHandle = $(selector).text().trim()
					if (fullHandle.split("@").length-1 == 1) {
						fullHandle = fullHandle + "@" + tmpSettings.exturi
					}
					break
				}
			}
		}
		// do we have a full handle?
		if (fullHandle) {
			if (!tmpSettings.processedFollow.includes(fullHandle)) {
				// yes, so resolve it to a user id on our homeinstance
				var resolvedHandle = await resolveHandleToHome(fullHandle)
				if (resolvedHandle) {
					tmpSettings.processedFollow.push(fullHandle)
					// successfully resolved
					// if showfollows is enabled...
					if (settings.fediact_showfollows) {
						// ... then check if user is already following
						var isFollowing = await isFollowingHomeInstance([resolvedHandle[0]])
						// update button text and action if already following
						if (isFollowing[0]) {
							$(el).text("Unfollow")
							action = "unfollow"
						}
					}
					// single and double click handling (see toot processing for explanation, is the same basically)
					var clicks = 0
					var timer
					$(el).on("click", async function(e) {
						// prevent default and immediate propagation
						e.preventDefault()
						e.stopImmediatePropagation()
						clicks++
						if (clicks == 1) {
							timer = setTimeout(async function() {
								execFollow(resolvedHandle[0])
								clicks = 0
							}, 350)
						} else {
							clearTimeout(timer)
							var done = await execFollow(resolvedHandle[0])
							if (done) {
								var saveText = $(el).text()
								var redirectUrl = 'https://' + settings.fediact_homeinstance + '/@' + resolvedHandle[1]
								$(el).text("Redirecting...")
								setTimeout(function() {
									redirectTo(redirectUrl)
									$(el).text(saveText)
								}, 1000)
							} else {
								log("Action failed.")
							}
							clicks = 0
						}
					}).on("dblclick", function(e) {
						e.preventDefault()
						e.stopImmediatePropagation()
					})
				} else {
					log("Could not resolve user home ID.")
				}
			}
		}
	}
	// create css selector from selector array
	var allFollowPaths = followButtonPaths.join(",")
	// one domnodeappear to rule them all
	$(document).DOMNodeAppear(async function(e) {
		if (!tmpSettings.isProcessing.includes($(e.target).get(0))) {
			tmpSettings.isProcessing.push($(e.target).get(0))
			process($(e.target))
		}
	}, allFollowPaths)
	// try to find all existing elements (fixes some elements not being detected by DOMNodeAppear in rare cases, esp. v3)
	$(document).find(allFollowPaths).each(function(){
		if (!tmpSettings.isProcessing.includes($(this).get(0))) {
			tmpSettings.isProcessing.push($(this).get(0))
			process($(this))
		}
	})
}


// =-=-=-=-==-=-=-=-==-=-=-=-==-=-=-=
// =-=-=-=-=-= SETUP / RUN =-==-=-=-=
// =-=-=-=-==-=-=-=-==-=-=-=-==-=-=-=

// process white/blacklist from ext settings
function processDomainList(newLineList) {
	console.log(newLineList)
	// split by new line
	var arrayFromList = newLineList.split(/\r?\n/)
	// array to put checked domains into
	var cleanedArray = []
	for (var domain of arrayFromList) {
		// remove whitespace
		domain = domain.trim()
		if (domain.length) {
			if (domainRegex.test(domain)) {
				cleanedArray.push(domain)
			} else {
				log("Removed invalid domain " + domain + " from blacklist/whitelist.")
			}
		}
	}
	// return newly created set (remvoes duplicates)
	return [...new Set(cleanedArray)]
}

function checkSettings() {
	// if the home instance is undefined/null/empty
	if (settings.fediact_homeinstance == null || !settings.fediact_homeinstance) {
		log("Mastodon home instance is not set.")
		return false
	}
	// no token for api available (see background.js)
	if (!settings.fediact_token) {
		log("No API token available. Are you logged in to your home instance? If yes, wait for 1-2 minutes and reload page.")
		return false
	} else {
		tmpSettings.tokenheader = {"Authorization":"Bearer " + settings.fediact_token,}
	}
	// if the value looks like a domain...
	if (!(domainRegex.test(settings.fediact_homeinstance))) {
		log("Instance setting is not a valid domain name.")
		return false
	}
	if (settings.fediact_mode == "whitelist") {
		// if in whitelist mode and the cleaned whitelist is empty, return false
		tmpSettings.whitelist = processDomainList(settings.fediact_whitelist)
		if (tmpSettings.whitelist.length < 1) {
			log("Whitelist is empty or invalid.")
			return false
		}
	} else {
		// also process the blacklist if in blacklist mode, but an empty blacklist is OK so we do not return false
		tmpSettings.blacklist = processDomainList(settings.fediact_blacklist)
	}
	return true
}

// test if the current site should be processed or not
// this will also be the function for whitelist/blacklist feature
async function checkSite() {
	// is this site on our home instance?
	if (location.hostname == settings.fediact_homeinstance) {
		tmpSettings.fedireply = getUrlParameter("fedireply")
		if (!tmpSettings.fedireply) {
			log("Current site is your home instance.")
			return false
		}
	}
	// are we in whitelist mode?
	if (settings.fediact_mode == "whitelist") {
		// if so, check if site is NOT in whitelist
		if ($.inArray(location.hostname, tmpSettings.whitelist) < 0) {
			log("Current site is not in whitelist.")
			return false
		}
	} else {
		// otherwise we are in blacklist mode, so check if site is on blacklist
		if ($.inArray(location.hostname, tmpSettings.blacklist) > -1) {
			log("Current site is in blacklist.")
			return false
		}
	}
	// last check - and probably the most accurate to determine if it actually is mastadon
	var requestUrl = location.protocol + '//' + location.hostname + instanceApi
	// call instance api to confirm its mastodon and get normalized handle uri
	var response = await makeRequest("GET", requestUrl, null, null)
	if (response) {
		var uri = JSON.parse(response).uri
		if (uri) {
			if (uri.startsWith("http")) {
				uri = new URL(uri)
				tmpSettings.exturi = uri.hostname
			} else {
				tmpSettings.exturi = uri
			}
			// at this point, we know that it's mastodon and the background processor should start running
			if (!backgroundProcessor()) {
				log("Could not start background process")
				return false
			}
			// if option is enabled, check if logged in on that instance and stop
			if (!settings.fediact_runifloggedin && !tmpSettings.fedireply) {
				if (await isLoggedIn()) {
					log("Already logged in to this external instance.")
					return false
				}
			}
		} else {
			return false
		}
	} else {
		return false
	}
	return true
}

async function backgroundProcessor() {
	// wait for any url change messages from background script
	chrome.runtime.onMessage.addListener(async function(request, sender, sendResponse) {
		if (request.urlchanged) {
			// reset already processed elements
			tmpSettings.processed = []
			tmpSettings.processedFollow = []
			tmpSettings.isProcessing = []
			// rerun getSettings to keep mutes/blocks up to date while not reloading the page
			if (!await getSettings()) {
				// but reload if settings are invalid
				location.reload()
			}
		}
		// if the settings were updated, we do a page reload
		if (request.updatedfedisettings) {
			location.reload()
		}
	})
	// send message to initialize onUpdated listener in background script (this way it gets the tabid and we do not need to bind the listener for ALL sites)
	try {
		await chrome.runtime.sendMessage({running: true})
		return true
	} catch(e) {
		log(e)
	}
	return false
}

function getSettings() {
	// get setting
	return new Promise(async function(resolve) {
		try {
			settings = await (browser || chrome).storage.local.get(settingsDefaults)
		} catch(e) {
			log(e)
			resolve(false)
		}
		if (settings) {
			console.log(settings)
			// validate settings
			if (checkSettings()) {
				resolve(true)
			} else {
				resolve(false)
			}
		} else {
			resolve(false)
		}
	})
}

async function updateSettings() {
	await (browser || chrome).storage.local.set(settings)
	if (!await getSettings()) {
		// but reload if settings are invalid
		location.reload()
	}
}

// run wrapper
async function run() {
	// validate settings
	if (await getSettings()) {
		// check site (if and which scripts should run)
		if (await checkSite()) {
			if (tmpSettings.fedireply) {
				processReply()
			} else {
				processFollow()
				processToots()
			}
		} else {
			log("Will not process this site.")
		}
	} else {
		log("Could not load settings.")
	}
}

run()