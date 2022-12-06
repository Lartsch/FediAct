// =-=-=-=-==-=-=-=-==-=-=-=-==-=-=
// =-=-=-=-=-= CONSTANTS =-==-=-=-=
// =-=-=-=-==-=-=-=-==-=-=-=-==-=-=

const followButtonPaths = ["div.account__header button.logo-button","div.public-account-header a.logo-button","div.account-card a.logo-button","div.directory-card a.icon-button", "div.detailed-status a.logo-button"];
const profileNamePaths = ["div.account__header__tabs__name small", "div.public-account-header__tabs__name small", "div.detailed-status span.display-name__account", "div.display-name > span"];
const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/;
const followPageRegex = /^(https?:\/\/(www\.)?.*\..*?\/)((@\w+(@([\w-]+\.)+?\w+)?)|explore|following|followers)\/?(\d+)?\/?$/;
const tootsPageRegex = /^(https?:\/\/(www\.)?.*\..*?\/)((@\w+(@([\w-]+\.)+?\w+)?)|explore|public|public\/local)\/?(\d+)?\/?$/;
const tootRegex = /^(?:https?:\/\/(www\.)?.*\..*?\/)(@\w+(?:@([\w-]+\.)+?\w+)?)\/\d+\/?$/;
const handleExtractRegex = /^[^@]*@(?<handle>\w+)(@(?<handledomain>([\w-]+\.)+?\w+))?(\/(?<tootid>\d+))?\/?$/;
const enableConsoleLog = true;
const logPrepend = "[FediAct]";
const maxElementWaitFactor = 200; // x 100ms for total time
const instanceApi = "/api/v1/instance";
const statusApi = "/api/v1/statuses";
const searchApi = "/api/v2/search";
const accountsApi = "/api/v1/accounts";
const apiDelay = 500

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
var browser, chrome, lasthomerequest, fedireply;
var lastUrl = window.location.href;


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
// Is more reliable in certain situation than mutationobserver
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
            callback(e);
          }
        }
      });
    };
    jQuery.fn.onAppear = jQuery.fn.DOMNodeAppear;
  })(jQuery);

// extract given url parameter value
var getUrlParameter = function getUrlParameter(sParam) {
    var sPageURL = window.location.search.substring(1),
        sURLVariables = sPageURL.split('&'), sParameterName, i;
    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
        }
    }
    return false;
};

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
    return new Promise(function (resolve, reject) {
        let xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.timeout = 3000;
		if (extraheaders) {
			for (var key in extraheaders) {
				xhr.setRequestHeader(key, extraheaders[key])
			}
		}
        xhr.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                resolve(xhr.responseText);
            } else {
                resolve(false);
            }
        };
        xhr.onerror = function () {
            reject({
                status: this.status,
                statusText: xhr.statusText
            });
        };
		xhr.send();
    });
}

// Escape characters used for regex
function escapeRegExp(string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

// Replace all occurrences of a substring
function replaceAll(str, find, replace) {
	return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

// handles redirects to home instance
function redirectTo(url) {
	if (settings.fediact_redirects) {
		if (settings.fediact_alert) {
			alert("Redirecting...")
		}
		// open the url in same/new tab
		var win = window.open(url, settings.fediact_target);
		log("Redirected to " + url)
		// focus the new tab if open was successfull
		if (win) {
			win.focus();
		} else {
			// otherwise notify user...
			log('Could not open new window. Please allow popups for this website.');
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
		var requestUrl = 'https://' + settings.fediact_homeinstance + accountsApi + "/" + id + "/follow";
		var responseFollow = await makeRequest("POST",requestUrl,settings.tokenheader);
		// check if it worked (it is ignored if the user was already followed)
		if (responseFollow) {
			responseFollow = JSON.parse(responseFollow);
			if (!responseFollow.following && !responseFollow.requested) {
				log("Follow failed.")
				return false;
			} else {
				return true;
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
		var requestUrl = 'https://' + settings.fediact_homeinstance + accountsApi + "/" + id + "/unfollow";
		var responseUnfollow = await makeRequest("POST",requestUrl,settings.tokenheader);
		// check if it worked (it is ignored if the user was already followed)
		if (responseUnfollow) {
			responseUnfollow = JSON.parse(responseUnfollow);
			if (responseUnfollow.following || responseUnfollow.requested) {
				log("Unfollow failed.")
				return false;
			} else {
				return true;
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
		var requestUrl = 'https://' + settings.fediact_homeinstance + statusApi + "/" + id + "/reblog";
		var responseBoost = await makeRequest("POST",requestUrl,settings.tokenheader);
		// check if it worked (it is ignored if the user was already followed)
		if (responseBoost) {
			responseBoost = JSON.parse(responseBoost);
			if (!responseBoost.reblogged) {
				log("Boost failed.");
				return false;
			} else {
				return true;
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
		var requestUrl = 'https://' + settings.fediact_homeinstance + statusApi + "/"  + id + "/unreblog";
		var responseUnboost = await makeRequest("POST",requestUrl,settings.tokenheader);
		// check if it worked (it is ignored if the user was already followed)
		if (responseUnboost) {
			responseUnboost = JSON.parse(responseUnboost);
			if (responseUnboost.reblogged) {
				log("Unboost failed.");
				return false;
			} else {
				return true;
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
		var requestUrl = 'https://' + settings.fediact_homeinstance + statusApi + "/"  + id + "/favourite";
		var responseFav = await makeRequest("POST",requestUrl,settings.tokenheader);
		// check if it worked (it is ignored if the user was already followed)
		if (responseFav) {
			responseFav = JSON.parse(responseFav);
			if (!responseFav.favourited) {
				log("Favourite failed.");
				return false;
			} else {
				return true;
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
		var requestUrl = 'https://' + settings.fediact_homeinstance + statusApi + "/" + id + "/unfavourite";
		var responseUnFav = await makeRequest("POST",requestUrl,settings.tokenheader);
		// check if it worked (it is ignored if the user was already followed)
		if (responseUnFav) {
			responseUnFav = JSON.parse(responseUnFav);
			if (responseUnFav.favourited) {
				log("Unfavourite failed.");
				return false;
			} else {
				return true;
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
		var requestUrl = 'https://' + settings.fediact_homeinstance + statusApi + "/"  + id + "/bookmark";
		var responseBookmark = await makeRequest("POST",requestUrl,settings.tokenheader);
		// check if it worked (it is ignored if the user was already followed)
		if (responseBookmark) {
			responseBookmark = JSON.parse(responseBookmark);
			if (!responseBookmark.bookmarked) {
				log("Bookmark failed.");
				return false;
			} else {
				return true;
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
		var requestUrl = 'https://' + settings.fediact_homeinstance + statusApi + "/" + id + "/unbookmark";
		var responseUnbookmark = await makeRequest("POST",requestUrl,settings.tokenheader);
		// check if it worked (it is ignored if the user was already followed)
		if (responseUnbookmark) {
			responseUnbookmark = JSON.parse(responseUnbookmark);
			if (responseUnbookmark.bookmarked) {
				log("Unbookmark failed.");
				return false;
			} else {
				return true;
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
	var responseFollowing = await makeRequest("GET",requestUrl,settings.tokenheader);
	const follows = Array(ids.length).fill(false);
	// check if it worked (it is ignored if the user was already followed)
	if (responseFollowing) {
		responseFollowing = JSON.parse(responseFollowing);
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
		case 'boost': actionExecuted = await boostHomeInstance(id); break;
		case 'favourite': actionExecuted = await favouriteHomeInstance(id); break;
		case 'bookmark': actionExecuted = await bookmarkHomeInstance(id); break;
		case 'unboost': actionExecuted = await unboostHomeInstance(id); break;
		case 'unfavourite': actionExecuted = await unfavouriteHomeInstance(id); break;
		case 'unbookmark': actionExecuted = await unbookmarkHomeInstance(id); break;
		default:
		  log("No valid action specified.");
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
	var requestUrl = 'https://' + settings.fediact_homeinstance + searchApi + "/?q=" + searchstring + "&resolve=true&limit=1";
	var response = await makeRequest("GET", requestUrl, settings.tokenheader);
	if (response) {
		response = JSON.parse(response);
		if (!response.accounts.length && response.statuses.length) {
			var status = response.statuses[0];
			return [status.account.acct, status.id, status.reblogged, status.favourited, status.bookmarked]
		} else {
			log("No toot result found.")
			return false
		}
	} else {
		log("API call failed...")
		return false
	}
}

// Get a toot's (external) home instance url
function resolveTootToExternalHome(tooturl) {
	// TODO: check if a delay is necessary here tooo
	if (tooturl) {
		return new Promise(resolve => {
			chrome.runtime.sendMessage({url: tooturl}, function(response) {
				if(response) {
					resolve(response);
				} else {
					resolve(false);
				}
			});
		});
	} else {
		return false
	}
}

// =-=-=-=-==-=-=-=-==-=-=-=-==-=-=-=
// =-=-=-=-= SITE PROCESSING =-==-=-=
// =-=-=-=-==-=-=-=-==-=-=-=-==-=-=-=

// custom implementation for allowing to toggle inline css - .css etc. are not working for all layouts
function toggleInlineCss(el, styles, toggleclass) {
	var active = $(el).toggleClass(toggleclass).hasClass(toggleclass);
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

// returns a mutation observer for custom selectors
function getMutationObserver(targetparentselector, options, targetchildselectors, callback) {
	// Create an observer instance
	if (targetchildselectors) {
		targetchildselectors = targetchildselectors.join(",");
	}
	var observer = new MutationObserver(function( mutations ) {
		mutations.forEach(function( mutation ) {
			var newNodes = mutation.addedNodes; // DOM NodeList
			if( newNodes !== null ) { // If there are new nodes added
				var $nodes = $( newNodes ); // jQuery set
				$nodes.each(function(){
					if(targetchildselectors) {
						if ($(this).is(targetchildselectors)) {
							callback(this, mutation);
						}
					} else {
						callback(this, mutation);
					}
				});
			}
		});    
	});
	return observer.observe($(targetparentselector)[0], options);
}

// extract handle from elements
function extractHandle(selectors) {
	// check all of the selectors
	for (const selector of selectors) {
		// if found
		if ($(selector).length) {
			return $(selector).text().trim();
		}
	}
	return false;
}

// process any toots found on supported sites
async function processReply() {
	$(document).DOMNodeAppear(function(e) {
		$(e.target).find("button:has(i.fa-reply), button:has(i.fa-reply-all)").click()
	}, "div.detailed-status__action-bar")
}

// process any toots found on supported sites
async function processToots() {
	async function clickAction(id, e) {
		var action = getTootAction(e);
		if (action) {
			// resolve url on home instance to get local toot/author identifiers and toot status
			var actionExecuted = await executeTootAction(id, action)
			if (actionExecuted) {
				if (action == "boost" || action == "unboost") {
					toggleInlineCss($(e.currentTarget).find("i"),[["color","!remove","rgb(140, 141, 255)"],["transition-duration", "!remove", "0.9s"],["background-position", "!remove", "0px 100%"]], "fediactive")
				} else if (action == "favourite" || action == "unfavourite") {
					toggleInlineCss($(e.currentTarget),[["color","!remove","rgb(202, 143, 4)"]], "fediactive")
				} else {
					toggleInlineCss($(e.currentTarget),[["color","!remove","rgb(255, 80, 80)"]], "fediactive")
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
	function getTootAction(e) {
		var action = false
		if ($(e.currentTarget).children("i.fa-retweet").length) {
			if ($(e.currentTarget).children("i.fa-retweet").hasClass("fediactive")) {
				action = "unboost";
			} else {
				action = "boost";
			}
		} else if ($(e.currentTarget).children("i.fa-star").length) {
			if ($(e.currentTarget).hasClass("fediactive")) {
				action = "unfavourite";
			} else {
				action = "favourite";
			}
		} else if ($(e.currentTarget).children("i.fa-bookmark").length) {
			if ($(e.currentTarget).hasClass("fediactive")) {
				action = "unbookmark";
			} else {
				action = "bookmark";
			}
		} else if ($(e.currentTarget).attr("href")) {
			if (~$(e.currentTarget).attr("href").indexOf("type=reblog")) {
				if ($(e.currentTarget).hasClass("fediactive")) {
					action = "unboost";
				} else {
					action = "boost";
				}
			} else if (~$(e.currentTarget).attr("href").indexOf("type=favourite")) {
				if ($(e.currentTarget).hasClass("fediactive")) {
					action = "unfavourite";
				} else {
					action = "favourite";
				}
			}
		}
		return action
	}
	function getTootIdAndAuthor(el) {
		var [closestTootId, closestTootAuthorm, alreadyResolved] = [false, false, false]
		if ($(el).find("span.display-name__account").length) {
			closestTootAuthor = $(el).find("span.display-name__account").first().text().trim()
		}
		if ($(el).is(".detailed-status__wrapper")) {
			closestTootId = lastUrl.split("?")[0].split("/")[4]
		} else if ($(el).find("a.status__relative-time").attr("href")) {
			var temp = $(el).find("a.status__relative-time").attr("href").split("?")[0]
			if (temp.startsWith("http")) {
				var tempUrl = new URL(temp)
				if (location.hostname == temp.hostname) {
					closestTootId = temp.split("/")[4]
				} else {
					// return full URL, since this is already a resolved link to the toot's home instance
					closestTootId = temp
					alreadyResolved = true
				}
			} else {
				closestTootId = temp.split("/")[2]
			}
		} else if ($(el).find("a.detailed-status__datetime").attr("href")) {
			var temp = $(el).find("a.detailed-status__datetime").attr("href").split("?")[0]
			if (temp.startsWith("http")) {
				closestTootId = temp.split("/")[4]
			} else {
				closestTootId = temp.split("/")[2]
			}
		} else if ($(el).attr("data-id")) {
			closestTootId = $(el).attr("data-id").split("-").slice(-1)[0];
		} else if ($(el).closest("article[data-id], div[data-id]").length) {
			closestTootId = $(el).closest("article[data-id], div[data-id]")[0].attr("data-id").split("-").slice(-1)[0];
		} else if ($(el).find("a.modal-button").length) {
			var temp = $(el).find("a.modal-button").attr("href").split("?")[0]
			if (temp.startsWith("http")) {
				closestTootId = temp.split("/")[4]
			} else {
				closestTootId = temp.split("/")[2]
			}
		}
		return [closestTootId, closestTootAuthor, alreadyResolved]
	}
	async function process(el) {
		var homeResolveString
		var tootData = getTootIdAndAuthor($(el))
		if (tootData) {
			console.log(tootData)
			// if this is set, we got a toot url that is already resolved to its home instance
			if (tootData[2]) {
				homeResolveString = tootData[0]
			// otherwise, we need to build the homeResolveString manually
			} else {
				// get handle/handledomain without @
				var matches = tootData[1].match(handleExtractRegex);
				// if we have a handledomain...
				if (matches.groups.handledomain) {
					// check if the current hostname includes that handle domain...
					if (~location.hostname.indexOf(matches.groups.handledomain)) {
						// yes? then its a toot local to the current ext. instance, build the according resolveString
						homeResolveString = location.protocol + "//" + location.hostname + "/users/" + matches.groups.handle + "/statuses/" + tootData[0]
					} else {
						// otherwise this is an external handle and we will use external home URI resolving (need to use @user@domain.com format here)
						var resolveString = location.protocol + '//' + location.hostname + "/" + tootData[1] + "/" + tootData[0]
						var resolveTootHome = await resolveTootToExternalHome(resolveString)
						if (resolveTootHome) {
							if (~resolveTootHome.indexOf("/users/")) {
								// in this case, it's already in the /users/ format
								homeResolveString = resolveTootHome
							} else if (handleExtractRegex.test(resolveTootHome)) {
								// in this case, it's not, so we extract the handle + tootid from the URL
								var tootMatches = resolveTootHome.match(handleExtractRegex)
								if (tootMatches) {
									// ... and then build a string in /users/ format...
									homeResolveString = resolveTootHome.split("@")[0] + "users/" + tootMatches.groups.handle + "/statuses/" + tootMatches.groups.tootid
								}
							}
						} else {
							// in this case, toot home instance resolving failed, likely since the site does not use 302 redirects (should rarely reach this point since these instances seem to use fully resolved urls in a.status__relative-time)
							// so we try with a resolve string in @user@domain.com format as fallback (less probability for resolving)
							log("Resolve fallback #1")
							homeResolveString = location.protocol + "//" + location.hostname + "/" + tootData[1] + "/" + tootData[0]
						}
					}
				} else {
					// this means it is a toot local to the current ext. instance as well
					homeResolveString = location.protocol + "//" + location.hostname + "/users/" + matches.groups.handle + "/statuses/" + tootData[0]
				}
			}
			if (homeResolveString) {
				// get all button elements of this toot
				var favButton = $(el).find("button:has(i.fa-star), a.icon-button:has(i.fa-star)")
				var boostButton = $(el).find("button:has(i.fa-retweet), a.icon-button:has(i.fa-retweet)")
				var bookmarkButton = $(el).find("button:has(i.fa-bookmark)")
				var replyButton = $(el).find("button:has(i.fa-reply), button:has(i.fa-reply-all), a.icon-button:has(i.fa-reply), a.icon-button:has(i.fa-reply-all)")
				// resolve toot on actual home instance
				var resolvedToot = await resolveTootToHome(homeResolveString) // [status.account.acct, status.id, status.reblogged, status.favourited, status.bookmarked]
				if (resolvedToot) {
					// enable the bookmark button
					$(bookmarkButton).removeClass("disabled").removeAttr("disabled")
					// set the toot buttons to active, depending on its state
					if (resolvedToot[3]) {
						if (!$(favButton).hasClass("fediactive")) {
							toggleInlineCss($(favButton),[["color","!remove","rgb(202, 143, 4)"]], "fediactive")
						}
					}
					if (resolvedToot[2]) {
						if (!$(boostButton).find("i.fediactive").length) {
							toggleInlineCss($(boostButton).find("i"),[["color","!remove","rgb(140, 141, 255)"],["transition-duration", "!remove", "0.9s"],["background-position", "!remove", "0px 100%"]], "fediactive")
						}
					}
					if (resolvedToot[4]) {
						if (!$(bookmarkButton).hasClass("fediactive")) {
							toggleInlineCss($(bookmarkButton),[["color","!remove","rgb(255, 80, 80)"]], "fediactive")
						}
					}
					// set the redirect to home instance URL in @ format
					var redirectUrl = 'https://' + settings.fediact_homeinstance + "/@" + resolvedToot[0] + "/" + resolvedToot[1]
					// continue with click handling...
					$(replyButton).on("click", function(e){
						// reply button is handle specially (always redirects with reply parameter set)
						e.preventDefault();
						e.stopImmediatePropagation();
						redirectTo(redirectUrl+"?fedireply")
					})
					$([favButton, boostButton, bookmarkButton]).each(function() {
						// all other buttons will behave differently with single / double click
						var clicks = 0;
						var timer;
						$(this).on("click", async function(e) {
							// prevent default and immediate propagation
							e.preventDefault();
							e.stopImmediatePropagation();
							clicks++;
							if (clicks == 1) {
								timer = setTimeout(async function() {
									// execute action on click and get result (fail/success)
									var actionExecuted = await clickAction(resolvedToot[1], e);
									if (!actionExecuted) {
										log("Action failed.")
									}
									clicks = 0;
								}, 350);
							} else {
								clearTimeout(timer);
								// same as above, but we redirect if the result is successful
								var actionExecuted = await clickAction(resolvedToot[1], e);
								if (!actionExecuted) {
									log("Action failed.")
								} else {
									redirectTo(redirectUrl)
								}
								clicks = 0;
							}
						}).on("dblclick", function(e) {
							// default dblclick event must be prevented
							e.preventDefault();
							e.stopImmediatePropagation();
						});
					});
				} else {
					log("Failed to resolve: "+homeResolveString)
					$("<span style='color: orange; padding-right: 5px'>Not resolved</span>").insertAfter($(favButton))
				}
			} else {
				log("Could not identify a post URI for home resolving.")
			}
		} else {
			log("Could not get toot data.")
		}
	}
	// TODO: ADD MASTODON v3 IDENTIFIERS + MASTODON v4 ALTERNATIVE IDENTIFIERS
	if (tootsPageRegex.test(lastUrl.split("?")[0])) {
		// single toot pages load all replies instantly, so this is easy
		if (tootRegex.test(lastUrl)) {
			// on page changes, the detailed status (either reply or original toot) are on the page right away
			$(document).find("div.detailed-status__wrapper").each(function() {
				process($(this))
			})
			// all others will be inserted
			$(document).DOMNodeAppear(async function(e) {
				process($(e.target))
			}, "div.status, div.detailed-status__wrapper");
		// OTHERWISE (/explore and profile pages), we need additional steps.
		} else {
			// this is for v3 only
			$(document).ready(async function() {
				var lasthtml = $("body").html()
				// wait for the html to not change anymore
				await new Promise(resolve => {
					// check all 100ms
					var i = setInterval(function() {
						let currenthtml = $("body").html()
						if (currenthtml == lasthtml) {
							changing = false
							resolve(true)
							clearInterval(i)
						} else {
							lasthtml = currenthtml
						}
					},100)
				})
				$(document).find("div.entry > div.status").each(function() {
					process($(this))
				})
			})
			// wait for any articles to appear
			// this solution utilizes css animation events and is WAY more reliable than a) DOMInsertedNode (depcrecated), b) on ready delegation and c) MutationObserver (will not observe childs if only their parent was inserted)
			$(document).DOMNodeAppear(async function(e) {
				let article = $(e.target)
				var lasthtml = $("body").html()
				// wait for the html to not change anymore
				// mastodon 4 feeds will have all div.status elements on load BUT will replace them after a short time, leading to the found div.status being gone
				await new Promise(resolve => {
					// check all 100ms
					var i = setInterval(function() {
						let currenthtml = $("body").html()
						if (currenthtml == lasthtml) {
							changing = false
							resolve(true)
							clearInterval(i)
						} else {
							lasthtml = currenthtml
						}
					},100)
				})
				// okay, now we look for ACTUAL div.status elements that are still there and will not be catched by below mutation observer
				article.find("div.status").each(async function() {
					// one last check if it really exists...
					if (document.body.contains($(this)[0])) {
						// okay, lets go
						process($(this))
					}
				})
				// all other div.status elements will be updated/inserted/replaced when the user is scrolling, so here the mutationobserver is a great choice
				let observe = getMutationObserver(article, {subtree: true, childList: true}, ["div.status"], function(el, mutation) {
					process($(el))
				})
			}, "article, div.entry > div.status");
		}
	} else {
		log("There are no toots on this site");
	}
}

// main function to listen for the follow button pressed and open a new tab with the home instance
// TODO: this is still an old implementation, update in accordance with processToots as far as possible
async function processFollow() {
	// for mastodon v3 - v4 does not show follow buttons / account cards on /explore
	async function process(el) {
		var fullHandle
		var action = "follow"
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
						$(el).text("Unfollow");
						action = "unfollow";
					}
				}
				var clicks = 0;
				var timer;
				$(el).off()
				$(el).unbind()
				$(el).on("click", async function(e) {
					// prevent default and immediate propagation
					e.preventDefault();
					e.stopImmediatePropagation();
					clicks++;
					if (clicks == 1) {
						timer = setTimeout(async function() {
							if (action == "follow") {
								var followed = await followHomeInstance(resolvedHandle[0])
								if (followed) {
									$(el).text("Unfollow");
									action = "unfollow"
								}
							} else {
								var unfollowed = await unfollowHomeInstance(resolvedHandle[0])
								if (unfollowed) {
									$(el).text("Follow");
									action = "follow"
								}
							}
							clicks = 0;
						}, 350);
					} else {
						clearTimeout(timer);
						var done
						if (action == "follow") {
							var followed = await followHomeInstance(resolvedHandle[0])
							if (followed) {
								$(el).text("Unfollow");
								action = "unfollow"
								done = true
							}
						} else {
							var unfollowed = await unfollowHomeInstance(resolvedHandle[0])
							if (unfollowed) {
								$(el).text("Follow");
								action = "follow"
								done = true
							}
						}
						if (done) {
							var saveText = $(el).text()
							var redirectUrl = 'https://' + settings.fediact_homeinstance + '/@' + resolvedHandle[1]
							$(el).text("Redirecting...");
							setTimeout(function() {
								redirectTo(redirectUrl);
								$(el).text(saveText)
							}, 1000);
						} else {
							log("Action failed.")
						}
						clicks = 0;
					}
				}).on("dblclick", function(e) {
					e.preventDefault();
					e.stopImmediatePropagation();
				});
			} else {
				log("Could not resolve user home ID.")
			}
		}
	}
	// check if this is a profile url or explore page with account cards
	if (followPageRegex.test(lastUrl.split("?")[0])) {
		// dirty fix for some v3 instance views
		var allFollowPaths = followButtonPaths.join(",")
		$(document).DOMNodeAppear(async function(e) {
			process($(e.target))
		}, allFollowPaths)
	} else {
		log("Not a profile URL.");
	}
}

// for some reason, locationchange event did not work for me so lets use this ugly thing...
async function urlChangeLoop() {
	// run every 100ms, can probably be reduced
	setTimeout(function() {
		// compare last to current url
		if (!(lastUrl == window.location.href)) {
			// update lastUrl and run main script
			lastUrl = window.location.href;
			processFollow();
			processToots();
		}
		// repeat
		urlChangeLoop();
	}, 300);
}


// =-=-=-=-==-=-=-=-==-=-=-=-==-=-=-=
// =-=-=-=-=-= SETUP / RUN =-==-=-=-=
// =-=-=-=-==-=-=-=-==-=-=-=-==-=-=-=

// process white/blacklist from ext settings
function processDomainList(newLineList) {
	// split by new line
	var arrayFromList = newLineList.split(/\r?\n/);
	// array to put checked domains into
	var cleanedArray = [];
	for (var domain of arrayFromList) {
		// remove whitespace
		domain = domain.trim();
		if (domainRegex.test(domain)) {
			cleanedArray.push(domain)
		} else {
			log("Removed invalid domain " + domain + " from blacklist/whitelist.")
		}
	}
	// return newly created set (remvoes duplicates)
	return [...new Set(cleanedArray)];;
}

function checkSettings() {
	// if the home instance is undefined/null/empty
	if (settings.fediact_homeinstance == null || !settings.fediact_homeinstance) {
		log("Mastodon home instance is not set.");
		return false;
	}
	// no token for api available (see background.js)
	if (!settings.fediact_token) {
		log("No API token available. Are you logged in to your home instance? If yes, wait for 1-2 minutes and reload page.");
		return false;
	} else {
		settings.tokenheader = {"Authorization":"Bearer " + settings.fediact_token,};
	}
	// if the value looks like a domain...
	if (!(domainRegex.test(settings.fediact_homeinstance))) {
		log("Instance setting is not a valid domain name.");
		return false;
	}
	// set default if wrong value
	if ($.inArray(settings.fediact_mode, ["blacklist","whitelist"]) < 0) {
		settings.fediact_mode = "blacklist";
	}
	if ($.inArray(settings.fediact_target, ["_blank","_self"]) < 0) {
		settings.fediact_target = "_blank";
	}
	if (settings.fediact_mode == "whitelist") {
		// if in whitelist mode and the cleaned whitelist is empty, return false
		settings.fediact_whitelist = processDomainList(settings.fediact_whitelist);
		if (settings.fediact_whitelist.length < 1) {
			log("Whitelist is empty or invalid.")
			return false;
		}
	} else {
		// also process the blacklist if in blacklist mode, but an empty blacklist is OK so we do not return false
		settings.fediact_blacklist = processDomainList(settings.fediact_blacklist);
	}
	return true;
}

// test if the current site should be processed or not
// this will also be the function for whitelist/blacklist feature
async function checkSite() {
	// is this site on our home instance?
	if (location.hostname == settings.fediact_homeinstance) {
		fedireply = getUrlParameter("fedireply")
		if (!fedireply) {
			log("Current site is your home instance.");
			return false;
		}
	}
	// are we in whitelist mode?
	if (settings.fediact_mode == "whitelist") {
		// if so, check if site is NOT in whitelist
		if ($.inArray(location.hostname, settings.fediact_whitelist) < 0) {
			log("Current site is not in whitelist.");
			return false;
		}
	} else {
		// otherwise we are in blacklist mode, so check if site is on blacklist
		if ($.inArray(location.hostname, settings.fediact_blacklist) > -1) {
			log("Current site is in blacklist.");
			return false;
		}
	}
	// last check - and probably the most accurate to determine if it actually is mastadon
	var requestUrl = location.protocol + '//' + location.hostname + instanceApi;
	// call instance api to confirm its mastodon and get normalized handle uri
	var response = await makeRequest("GET", requestUrl, null);
	if (response) {
		var uri = JSON.parse(response).uri;
		if (uri) {
			// run external mode
			return true;
		}
	}
	log("Does not look like a Mastodon instance.");
	return false;
}

// run wrapper
async function run() {
	// get settings
	settings = await (browser || chrome).storage.local.get(settingsDefaults);
	if (settings) {
		// validate settings
		if (checkSettings()) {
			// check site (if and which scripts should run)
			if (await checkSite()) {
				if (fedireply) {
					processReply()
				} else {
					processFollow();
					processToots();
					urlChangeLoop();
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
