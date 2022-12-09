// =-=-=-=-==-=-=-=-==-=-=-=-==-=-=
// =-=-=-=-=-= CONSTANTS =-==-=-=-=
// =-=-=-=-==-=-=-=-==-=-=-=-==-=-=

const followButtonPaths = ["div.account__header button.logo-button","div.public-account-header a.logo-button","div.account-card a.logo-button","div.directory-card a.icon-button", "div.detailed-status a.logo-button"]
const profileNamePaths = ["div.account__header__tabs__name small", "div.public-account-header__tabs__name small", "div.detailed-status span.display-name__account", "div.display-name > span"]
const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/
const handleExtractUrlRegex = /^(?<domain>https?:\/\/(?:\.?[a-z0-9-]+)+(?:\.[a-z]+){1})?\/?@(?<handle>\w+)(?:@(?<handledomain>(?:[\w-]+\.)+?\w+))?(?:\/(?<tootid>\d+))?\/?$/
const handleExtractUriRegex = /^(?<domain>https?:\/\/(?:\.?[a-z0-9-]+)+(?:\.[a-z]+){1})(?:\/users\/)(?<handle>\w+)(?:(?:\/statuses\/)(?<tootid>\d+))?\/?$/
const enableConsoleLog = true
const logPrepend = "[FediAct]"
const maxElementWaitFactor = 200 // x 100ms for total time
const instanceApi = "/api/v1/instance"
const statusApi = "/api/v1/statuses"
const searchApi = "/api/v2/search"
const accountsApi = "/api/v1/accounts"
const apiDelay = 500
const maxTootCache = 200

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
	fediact_enabledelay: true
}

// fix for cross-browser storage api compatibility and other global vars
var browser, chrome, lasthomerequest, fedireply
// currently, the only reliable way to detect all toots etc. has the drawback that the same element could be processed multiple times
// this will store already processed elements to compare prior to processing and will reset as soon as the site context changes
var processed = []

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
      var $this = $(this)
      selector = selector || (typeof $this.selector === 'function' && $this.selector)
      if (!selector) {
        return false
      }
      $(document).on('animationstart webkitAnimationStart oanimationstart MSAnimationStart', function(e){
        if (e.originalEvent.animationName == 'nodeInserted' && $(e.target).is(selector)) {
          if (typeof callback == 'function') {
            callback(e)
          }
        }
      })
    }
    jQuery.fn.onAppear = jQuery.fn.DOMNodeAppear
})(jQuery)

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
async function makeRequest(method, url, extraheaders) {
	// try to prevent error 429 too many request by delaying home instance requests
	if (~url.indexOf(settings.fediact_homeinstance) && settings.fediact_enabledelay) {
		// get current date
		var currenttime = Date.now()
		var difference = currenttime - lasthomerequest
		if (difference < apiDelay) {
			await new Promise(resolve => {
				setTimeout(function() {
					resolve()
				}, apiDelay-difference)
			})
		}
		lasthomerequest = currenttime
	} 
    return new Promise(function (resolve) {
        let xhr = new XMLHttpRequest()
        xhr.open(method, url)
        xhr.timeout = 3000
		if (extraheaders) {
			for (var key in extraheaders) {
				xhr.setRequestHeader(key, extraheaders[key])
			}
		}
        xhr.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                resolve(xhr.responseText)
            } else {
                resolve(false)
            }
        }
		xhr.onerror = function() {
			log("Request to " + url + " failed.")
			resolve(false)
		}
		xhr.send()
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
	if (settings.fediact_redirects) {
		if (settings.fediact_alert) {
			alert("Redirecting...")
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

async function followHomeInstance(id) {
	// if auto actions are enbaled...
	if (settings.fediact_autoaction) {
		// build follow post request
		var requestUrl = 'https://' + settings.fediact_homeinstance + accountsApi + "/" + id + "/follow"
		var responseFollow = await makeRequest("POST",requestUrl,settings.tokenheader)
		// check if it worked (it is ignored if the user was already followed)
		if (responseFollow) {
			responseFollow = JSON.parse(responseFollow)
			if (!responseFollow.following && !responseFollow.requested) {
				log("Follow failed.")
				return false
			} else {
				return true
			}
		}
	} else {
		log("Auto-action disabled.")
	}
}

async function unfollowHomeInstance(id) {
	// if auto actions are enbaled...
	if (settings.fediact_autoaction) {
		// build follow post request
		var requestUrl = 'https://' + settings.fediact_homeinstance + accountsApi + "/" + id + "/unfollow"
		var responseUnfollow = await makeRequest("POST",requestUrl,settings.tokenheader)
		// check if it worked (it is ignored if the user was already followed)
		if (responseUnfollow) {
			responseUnfollow = JSON.parse(responseUnfollow)
			if (responseUnfollow.following || responseUnfollow.requested) {
				log("Unfollow failed.")
				return false
			} else {
				return true
			}
		}
	} else {
		log("Auto-action disabled.")
	}
}

async function boostHomeInstance(id) {
	// if auto actions are enbaled...
	if (settings.fediact_autoaction) {
		// build follow post request
		var requestUrl = 'https://' + settings.fediact_homeinstance + statusApi + "/" + id + "/reblog"
		var responseBoost = await makeRequest("POST",requestUrl,settings.tokenheader)
		// check if it worked (it is ignored if the user was already followed)
		if (responseBoost) {
			responseBoost = JSON.parse(responseBoost)
			if (!responseBoost.reblogged) {
				log("Boost failed.")
				return false
			} else {
				return true
			}
		}
	} else {
		log("Auto-action disabled.")
	}
}

async function unboostHomeInstance(id) {
	// if auto actions are enbaled...
	if (settings.fediact_autoaction) {
		// build follow post request
		var requestUrl = 'https://' + settings.fediact_homeinstance + statusApi + "/"  + id + "/unreblog"
		var responseUnboost = await makeRequest("POST",requestUrl,settings.tokenheader)
		// check if it worked (it is ignored if the user was already followed)
		if (responseUnboost) {
			responseUnboost = JSON.parse(responseUnboost)
			if (responseUnboost.reblogged) {
				log("Unboost failed.")
				return false
			} else {
				return true
			}
		}
	} else {
		log("Auto-action disabled.")
	}
}

async function favouriteHomeInstance(id) {
	// if auto actions are enbaled...
	if (settings.fediact_autoaction) {
		// build follow post request
		var requestUrl = 'https://' + settings.fediact_homeinstance + statusApi + "/"  + id + "/favourite"
		var responseFav = await makeRequest("POST",requestUrl,settings.tokenheader)
		// check if it worked (it is ignored if the user was already followed)
		if (responseFav) {
			responseFav = JSON.parse(responseFav)
			if (!responseFav.favourited) {
				log("Favourite failed.")
				return false
			} else {
				return true
			}
		}
	} else {
		log("Auto-action disabled.")
	}
}

async function unfavouriteHomeInstance(id) {
	// if auto actions are enbaled...
	if (settings.fediact_autoaction) {
		// build follow post request
		var requestUrl = 'https://' + settings.fediact_homeinstance + statusApi + "/" + id + "/unfavourite"
		var responseUnFav = await makeRequest("POST",requestUrl,settings.tokenheader)
		// check if it worked (it is ignored if the user was already followed)
		if (responseUnFav) {
			responseUnFav = JSON.parse(responseUnFav)
			if (responseUnFav.favourited) {
				log("Unfavourite failed.")
				return false
			} else {
				return true
			}
		}
	} else {
		log("Auto-action disabled.")
	}
}

async function bookmarkHomeInstance(id) {
	// if auto actions are enbaled...
	if (settings.fediact_autoaction) {
		// build follow post request
		var requestUrl = 'https://' + settings.fediact_homeinstance + statusApi + "/"  + id + "/bookmark"
		var responseBookmark = await makeRequest("POST",requestUrl,settings.tokenheader)
		// check if it worked (it is ignored if the user was already followed)
		if (responseBookmark) {
			responseBookmark = JSON.parse(responseBookmark)
			if (!responseBookmark.bookmarked) {
				log("Bookmark failed.")
				return false
			} else {
				return true
			}
		}
	} else {
		log("Auto-action disabled.")
	}
}

async function unbookmarkHomeInstance(id) {
	// if auto actions are enbaled...
	if (settings.fediact_autoaction) {
		// build follow post request
		var requestUrl = 'https://' + settings.fediact_homeinstance + statusApi + "/" + id + "/unbookmark"
		var responseUnbookmark = await makeRequest("POST",requestUrl,settings.tokenheader)
		// check if it worked (it is ignored if the user was already followed)
		if (responseUnbookmark) {
			responseUnbookmark = JSON.parse(responseUnbookmark)
			if (responseUnbookmark.bookmarked) {
				log("Unbookmark failed.")
				return false
			} else {
				return true
			}
		}
	} else {
		log("Auto-action disabled.")
	}
}

async function isFollowingHomeInstance(ids) {
	var requestUrl = 'https://' + settings.fediact_homeinstance + accountsApi + "/relationships?"
	for (const id of ids) {
		// trailing & is no issue
		requestUrl += "id[]=" + id.toString() + "&"
	}
	var responseFollowing = await makeRequest("GET",requestUrl,settings.tokenheader)
	const follows = Array(ids.length).fill(false)
	// check if it worked (it is ignored if the user was already followed)
	if (responseFollowing) {
		responseFollowing = JSON.parse(responseFollowing)
		for (var i = 0; i < ids.length; i++) {
			for (account of responseFollowing) {
				if (account.id == ids[i]) {
					if (account.following) {
						follows[i] = true
					}
				}
			}
		}
	}
	return follows
}

async function executeTootAction(id, action) {
	var actionExecuted
	switch (action) {
		case 'boost': actionExecuted = await boostHomeInstance(id); break
		case 'favourite': actionExecuted = await favouriteHomeInstance(id); break
		case 'bookmark': actionExecuted = await bookmarkHomeInstance(id); break
		case 'unboost': actionExecuted = await unboostHomeInstance(id); break
		case 'unfavourite': actionExecuted = await unfavouriteHomeInstance(id); break
		case 'unbookmark': actionExecuted = await unbookmarkHomeInstance(id); break
		default:
		  log("No valid action specified.")
	}
	return actionExecuted
}


// =-=-=-=-==-=-=-=-==-=-=-=-==-=-=
// =-=-=-=-=-= RESOLVING =-=-==-=-=
// =-=-=-=-==-=-=-=-==-=-=-=-==-=-=

// Return the user id on the home instance
async function resolveHandleToHome(handle) {
	var requestUrl = 'https://' + settings.fediact_homeinstance + accountsApi + "/search?q=" + handle + "&resolve=true&limit=1"
	var searchResponse = await makeRequest("GET",requestUrl,settings.tokenheader)
	if (searchResponse) {
		searchResponse = JSON.parse(searchResponse)
		if (searchResponse[0].id) {
			return [searchResponse[0].id, searchResponse[0].acct]
		}
	}
	return false
}

async function resolveTootToHome(searchstring) {
	var requestUrl = 'https://' + settings.fediact_homeinstance + searchApi + "/?q=" + searchstring + "&resolve=true&limit=1"
	var response = await makeRequest("GET", requestUrl, settings.tokenheader)
	if (response) {
		response = JSON.parse(response)
		if (!response.accounts.length && response.statuses.length) {
			var status = response.statuses[0]
			return [status.account.acct, status.id, status.reblogged, status.favourited, status.bookmarked]
		} else {
			return false
		}
	} else {
		return false
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
				log(e)
				log("Reloading page, extension likely got updated.")
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

// custom implementation for allowing to toggle inline css - .css() etc. are not working for some mastodon instances
function toggleInlineCss(el, styles, toggleclass) {
	var active = $(el).toggleClass(toggleclass).hasClass(toggleclass)
	for (var style of styles) {
		if (active) {
			$(el).css(style[0], style[2])
		} else {
			if (style[1] == "!remove") {
				var newinline = replaceAll($(el).attr('style'), style[0]+": "+style[2]+";", "")
				$(el).attr('style', newinline)
			} else {
				$(el).css(style[0], style[1])
			}
		}
	}
}

// extract handle from elements
function extractHandle(selectors) {
	// check all of the selectors
	for (const selector of selectors) {
		// if found
		if ($(selector).length) {
			return $(selector).text().trim()
		}
	}
	return false
}

function isInProcessedToots(id) {
	for (var i = 0; i < processed.length; i++) {
		if (processed[i][0] == id) {
			return i
		}
	}
	return false
}

function addToProcessedToots(toot) {
	processed.push(toot)
	var diff = processed.length - maxTootCache
	if (diff > 0) {
		processed = processed.splice(0,diff)
	}
}

// trigger the reply button click - will only run when we are on a home instance url with fedireply parameter
async function processReply() {
	$(document).DOMNodeAppear(function(e) {
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
		// should rarely reach this point, but some v3 instances include the action in the href only (v3 public view does NOT have a bookmark button, so skip)
		} else if ($(e.currentTarget).attr("href")) {
			if (~$(e.currentTarget).attr("href").indexOf("type=reblog")) {
				if ($(e.currentTarget).hasClass("fediactive")) {
					action = "unboost"
				} else {
					action = "boost"
				}
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
	}
	// main function to process each detected toot element
	async function process(el) {
		// extra step for detailed status elements to select the correct parent
		if ($(el).is("div.detailed-status")) {
			el = $(el).closest("div.focusable")
		}
		// get toot data
		var tootAuthor = getTootAuthor($(el))
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
			var favButton = $(el).find("button:has(i.fa-star), a.icon-button:has(i.fa-star)").first()
			var boostButton = $(el).find("button:has(i.fa-retweet), a.icon-button:has(i.fa-retweet)").first()
			var bookmarkButton = $(el).find("button:has(i.fa-bookmark)").first()
			var replyButton = $(el).find("button:has(i.fa-reply), button:has(i.fa-reply-all), a.icon-button:has(i.fa-reply), a.icon-button:has(i.fa-reply-all)").first()
			// handles process when a button is clicked
			async function clickAction(id, e) {
				// determine the action to perform
				var action = getTootAction(e)
				if (action) {
					// resolve url on home instance to get local toot/author identifiers and toot status
					var actionExecuted = await executeTootAction(id, action)
					if (actionExecuted) {
						// if the action was successfully executed, update the element styles
						if (action == "boost" || action == "unboost") {
							// toggle inline css styles
							toggleInlineCss($(e.currentTarget).find("i"),[["color","!remove","rgb(140, 141, 255)"],["transition-duration", "!remove", "0.9s"],["background-position", "!remove", "0px 100%"]], "fediactive")
							// update element in cache if exists
							if (cacheIndex) {
								processed[cacheIndex][3] = !processed[cacheIndex][3]
							}
						// same for favourite, bookmarked....
						} else if (action == "favourite" || action == "unfavourite") {
							toggleInlineCss($(e.currentTarget),[["color","!remove","rgb(202, 143, 4)"]], "fediactive")
							if (cacheIndex) {
								processed[cacheIndex][4] = !processed[cacheIndex][4]
							}
						} else {
							toggleInlineCss($(e.currentTarget),[["color","!remove","rgb(255, 80, 80)"]], "fediactive")
							if (cacheIndex) {
								processed[cacheIndex][5] = !processed[cacheIndex][5]
							}
						}	
						return true
					} else {
						log("Could not execute action on home instance.")
						return false
					}
				} else {
					log("Could not determine action.")
					return false
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
					// otherwise start processing button styles
					// first enable the bookmark button (is disabled on external instances)
					$(bookmarkButton).removeClass("disabled").removeAttr("disabled")
					// set the toot buttons to active, depending on the state of the resolved toot and if the element already has the active class
					if (tootdata[4]) {
						if (!$(favButton).hasClass("fediactive")) {
							toggleInlineCss($(favButton),[["color","!remove","rgb(202, 143, 4)"]], "fediactive")
						}
					}
					// repeat for other buttons
					if (tootdata[3]) {
						if (!$(boostButton).find("i.fediactive").length) {
							toggleInlineCss($(boostButton).find("i"),[["color","!remove","rgb(140, 141, 255)"],["transition-duration", "!remove", "0.9s"],["background-position", "!remove", "0px 100%"]], "fediactive")
						}
					}
					if (tootdata[5]) {
						if (!$(bookmarkButton).hasClass("fediactive")) {
							toggleInlineCss($(bookmarkButton),[["color","!remove","rgb(255, 80, 80)"]], "fediactive")
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
					redirectTo(tootdata[6]+"?fedireply")
				})
				// for all other buttons...
				$([favButton, boostButton, bookmarkButton]).each(function() {
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
								// execute action on click and get result (fail/success)
								var actionExecuted = await clickAction(tootdata[2], e)
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
							// same as above, but we redirect if the result is successful
							var actionExecuted = await clickAction(tootdata[2], e)
							if (!actionExecuted) {
								log("Action failed.")
							} else {
								// redirect to home instance with the resolved toot url
								redirectTo(tootdata[6])
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
				if (homeResolveStrings.length) {
					homeResolveStrings = homeResolveStrings.filter((element, index) => {
						return (homeResolveStrings.indexOf(element) == index)
					})
					var resolvedToHomeInstance = false
					for (var homeResolveString of homeResolveStrings) {
						if (!resolvedToHomeInstance) {
							// resolve toot on actual home instance
							var resolvedToot = await resolveTootToHome(homeResolveString) // [status.account.acct, status.id, status.reblogged, status.favourited, status.bookmarked]
							if (resolvedToot) {
								resolvedToHomeInstance = true
								// set the redirect to home instance URL in @ format
								var redirectUrl = 'https://' + settings.fediact_homeinstance + "/@" + resolvedToot[0] + "/" + resolvedToot[1]
								fullEntry = [internalIdentifier, ...resolvedToot, redirectUrl, true]
							}
						}
					}
					if (resolvedToHomeInstance) {
						addToProcessedToots(fullEntry)
						// continue with click handling...
						clickBinder(fullEntry)
						initStyles(fullEntry)
					} else {
						log("Failed to resolve: "+homeResolveStrings)
						addToProcessedToots([internalIdentifier, false])
						initStyles([internalIdentifier, false])
					}
				} else {
					log("Could not identify a post URI for home resolving.")
					addToProcessedToots([internalIdentifier, false])
					initStyles([internalIdentifier, false])
				}
			} else {
				var toot = processed[cacheIndex]
				initStyles(toot)
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
		process($(e.target))
	}, "div.status, div.detailed-status")
}

// main function to listen for the follow button pressed and open a new tab with the home instance
async function processFollow() {
	var fullHandle
	var action = "follow"
	// for mastodon v3 - v4 does not show follow buttons / account cards on /explore
	async function process(el) {
		// wrapper for follow/unfollow action
		async function execFollow(id) {
			if (action == "follow") {
				var followed = await followHomeInstance(id)
				if (followed) {
					$(el).text("Unfollow")
					action = "unfollow"
					return true
				}
			} else {
				var unfollowed = await unfollowHomeInstance(id)
				if (unfollowed) {
					$(el).text("Follow")
					action = "follow"
					return true
				}
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
					break
				}
			}
		}
		if (fullHandle) {
			var resolvedHandle = await resolveHandleToHome(fullHandle)
			if (resolvedHandle) {
				if (settings.fediact_showfollows) {
					var isFollowing = await isFollowingHomeInstance([resolvedHandle[0]])
					if (isFollowing[0]) {
						$(el).text("Unfollow")
						action = "unfollow"
					}
				}
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
	// create css selector from selector array
	var allFollowPaths = followButtonPaths.join(",")
	// one domnodeappear to rule them all
	$(document).DOMNodeAppear(async function(e) {
		process($(e.target))
	}, allFollowPaths)
}

// =-=-=-=-==-=-=-=-==-=-=-=-==-=-=-=
// =-=-=-=-=-= SETUP / RUN =-==-=-=-=
// =-=-=-=-==-=-=-=-==-=-=-=-==-=-=-=

// process white/blacklist from ext settings
function processDomainList(newLineList) {
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
	return [...new Set(cleanedArray)];
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
		settings.tokenheader = {"Authorization":"Bearer " + settings.fediact_token,}
	}
	// if the value looks like a domain...
	if (!(domainRegex.test(settings.fediact_homeinstance))) {
		log("Instance setting is not a valid domain name.")
		return false
	}
	if (settings.fediact_mode == "whitelist") {
		// if in whitelist mode and the cleaned whitelist is empty, return false
		settings.fediact_whitelist = processDomainList(settings.fediact_whitelist)
		if (settings.fediact_whitelist.length < 1) {
			log("Whitelist is empty or invalid.")
			return false
		}
	} else {
		// also process the blacklist if in blacklist mode, but an empty blacklist is OK so we do not return false
		settings.fediact_blacklist = processDomainList(settings.fediact_blacklist)
	}
	return true
}

// test if the current site should be processed or not
// this will also be the function for whitelist/blacklist feature
async function checkSite() {
	// is this site on our home instance?
	if (location.hostname == settings.fediact_homeinstance) {
		fedireply = getUrlParameter("fedireply")
		if (!fedireply) {
			log("Current site is your home instance.")
			return false
		}
	}
	// are we in whitelist mode?
	if (settings.fediact_mode == "whitelist") {
		// if so, check if site is NOT in whitelist
		if ($.inArray(location.hostname, settings.fediact_whitelist) < 0) {
			log("Current site is not in whitelist.")
			return false
		}
	} else {
		// otherwise we are in blacklist mode, so check if site is on blacklist
		if ($.inArray(location.hostname, settings.fediact_blacklist) > -1) {
			log("Current site is in blacklist.")
			return false
		}
	}
	// last check - and probably the most accurate to determine if it actually is mastadon
	var requestUrl = location.protocol + '//' + location.hostname + instanceApi
	// call instance api to confirm its mastodon and get normalized handle uri
	var response = await makeRequest("GET", requestUrl, null)
	if (response) {
		var uri = JSON.parse(response).uri
		if (uri) {
			// run external mode
			return true
		}
	}
	log("Does not look like a Mastodon instance.")
	return false
}

async function backgroundProcessor() {
	// wait for any url change messages from background script
	chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
		if (request.urlchanged) {
			// reset already processed elements
			processed = []
		}
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

// run wrapper
async function run() {
	// get setting
	try {
		settings = await (browser || chrome).storage.local.get(settingsDefaults)
	} catch(e) {
		log(e)
		return false
	}
	if (settings) {
		// validate settings
		if (checkSettings()) {
			// check site (if and which scripts should run)
			if (await checkSite()) {
				if (fedireply) {
					processReply()
				} else {
					if (backgroundProcessor()) {
						processFollow()
						processToots()
					} else {
						log("Failed to initialize background script.")
					}
				}
			} else {
				log("Will not process this site.")
			}
		}
	} else {
		log("Could not load settings.")
	}
}

run()