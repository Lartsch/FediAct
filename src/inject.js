// prep
const followButtonPaths = ["div.account__header button.logo-button","div.public-account-header a.logo-button","div.account-card a.logo-button"];
const tootButtonsPaths = ["div.status__action-bar button:not(.disabled):not(:has(i.fa-share-alt))","div.detailed-status__action-bar button:not(.disabled):not(:has(i.fa-share-alt))","div.status__action-bar a.modal-button","a.detailed-status__link"];
const tokenPaths = ["head script#initial-state"];
const appHolderPaths = ["body > div.app-holder", "body > div.public-layout"];
const profileNamePaths = ["div.account__header__tabs__name small", "div.public-account-header__tabs__name small"];
const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/;
const profileRegex = /^(?:https?:\/\/(www\.)?.*\..*?\/)((?<handle>@\w+(?:@([\w-]+\.)+?\w+)?)|explore)\/?$/;
const tootsRegex = /^(?:https?:\/\/(www\.)?.*\..*?)(\/explore|\/public|\/public\/local|\d+)$/;
const tootRegex = /^(?:https?:\/\/(www\.)?.*\..*?\/)(?<handle>@\w+(?:@([\w-]+\.)+?\w+)?)\/\d+\/?$/;
const handleExtractRegex = /^.*@(?<handle>\w+)@(?<handledomain>([\w-]+\.)+?\w+)\/?$/;
const enableConsoleLog = true;
const logPrepend = "[FediFollow]";
const maxElementWaitFactor = 200; // x 100ms for total time
const instanceApi = "/api/v1/instance";
const statusApi = "/api/v1/statuses";
const searchApi = "/api/v2/search"
const fediParamName = "fedifollow";
const fediParamActionName = "fediaction";

var lastUrl = window.location.href;

// settings keys with defauls
var settingsDefaults = {
	fedifollow_homeinstance: null,
	fedifollow_alert: false,
	fedifollow_mode: "blacklist",
	fedifollow_whitelist: null,
	fedifollow_blacklist: null,
	fedifollow_target: "_self",
	fedifollow_autoaction: true,
	fedifollow_token: null,
	fedifollow_follows: null,
	fedifollow_showfollows: true,
	fedifollow_redirects: true
}

// fix for cross-browser storage api compatibility and other public vars
var browser, chrome, settings;

// wrappers to prepend to log messages
function log(text) {
	if (enableConsoleLog) {
		console.log(logPrepend + ' ' + text)
	}
}

// function to wait for given elements to appear - first found element gets returned (but as of now the selectors are for different layouts anyways)
function waitForEl(counter, selectors, callback) {
	// check all of the selectors
	for (const selector of selectors) {
		// if found
		if ($(selector).length) {
			return callback(selector);
		}
	}
	// repeat if no match was found and we did not exceed the wait factor yet
	if (counter < maxElementWaitFactor) {
	    setTimeout(function() {
				// increase counter
        waitForEl(counter + 1, selectors, callback);
      }, 100);
	} else {
		return callback(false);
	}
};

// promisified xhr for api calls
function makeRequest(method, url, headers) {
    return new Promise(function (resolve, reject) {
        let xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.timeout = 6000;
		if (headers) {
			for (var key in headers) {
				xhr.setRequestHeader(key, headers[key])
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

function redirectTo(url) {
	if (settings.fedifollow_redirects) {
		if (settings.fedifollow_alert) {
			alert("Redirecting...")
		}
		// open the url in same/new tab
		var win = window.open(url, settings.fedifollow_target);
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

async function followHomeInstance(id, headers, unfollow) {
	// if auto actions are enbaled...
	if (settings.fedifollow_autoaction) {
		// build follow post request
		var requestUrl = 'https://' + settings.fedifollow_homeinstance + "/api/v1/accounts/" + id + "/";
		if (unfollow) {
			requestUrl = requestUrl + "unfollow";
		} else {
			requestUrl = requestUrl + "follow";
		}
		var responseFollow = await makeRequest("POST",requestUrl,headers);
		// check if it worked (it is ignored if the user was already followed)
		if (responseFollow) {
			responseFollow = JSON.parse(responseFollow);
			if (!responseFollow.following && !responseFollow.requested) {
				log("Follow failed.");
			}
		}
	} else {
		log("Auto-action disabled.")
	}
}

async function boostHomeInstance(id, headers) {
	// if auto actions are enbaled...
	if (settings.fedifollow_autoaction) {
		// build follow post request
		var requestUrl = 'https://' + settings.fedifollow_homeinstance + "/api/v1/statuses/" + id + "/reblog";
		var responseBoost = await makeRequest("POST",requestUrl,headers);
		// check if it worked (it is ignored if the user was already followed)
		if (responseBoost) {
			responseBoost = JSON.parse(responseBoost);
			if (!responseBoost.reblogged) {
				log("Boost failed.");
			}
		}
	} else {
		log("Auto-action disabled.")
	}
}

async function favouriteHomeInstance(id, headers) {
	// if auto actions are enbaled...
	if (settings.fedifollow_autoaction) {
		// build follow post request
		var requestUrl = 'https://' + settings.fedifollow_homeinstance + "/api/v1/statuses/" + id + "/favourite";
		var responseFav = await makeRequest("POST",requestUrl,headers);
		// check if it worked (it is ignored if the user was already followed)
		if (responseFav) {
			responseFav = JSON.parse(responseFav);
			if (!responseFav.favourited) {
				log("Favourite failed.");
			}
		}
	} else {
		log("Auto-action disabled.")
	}
}

// resolve content uri on home instance
async function resolveHomeInstance(searchstring, action, unfollow) {
	var requestUrl = 'https://' + settings.fedifollow_homeinstance + searchApi + "/?q="+encodeURIComponent(searchstring)+"&resolve=true&limit=10";
	var headers = {"Authorization":"Bearer " + settings.fedifollow_token,};
	// api request: search endpoint, resolve search string locally (best support for edge cases (for ex. where subdomain does not equal the handle domain) and prevents uncached profile issue)
	var response = await makeRequest("GET", requestUrl, headers);
	if (response) {
		response = JSON.parse(response);
		// if we got no data (failed resolve) we can at least try to resolve a user by swapping the domain in case we got a domain in the handle
		// this does not work for resolving post IDs so we check against the handle regex
		if (!response.accounts.length && !response.statuses.length && handleExtractRegex.test(searchstring)) {
			// get matches
			var matches = searchstring.match(handleExtractRegex);
			if (matches.groups.handle && matches.groups.handledomain) {
				// we got handle + handledomain, so try to put the handle domain as host for this fallback (not guaranteed to resolve)
				var searchstring = "https://" + matches.groups.handledomain + "/@" + matches.groups.handle;
				var requestUrl = 'https://' + settings.fedifollow_homeinstance + searchApi + "/?q="+encodeURIComponent(searchstring)+"&resolve=true&limit=10";
				// update response var
				response = await makeRequest("GET", requestUrl, headers);
				response = JSON.parse(response);
			}
		}
		// set to false initially
		var redirect = false;
		// if we got an account but no statuses, redirect to profile (first result)
		if (response.accounts.length && !response.statuses.length) {
			// build redirect url
			var redirect = 'https://' + settings.fedifollow_homeinstance + "/@" + response.accounts[0].acct;
			await followHomeInstance(response.accounts[0].id, headers, unfollow);
		} else if (!response.accounts.length && response.statuses.length) {
			// if statuses but no accounts, redirect to status (first result)
			var status = response.statuses[0];
			var statusData = {
				"id": status.id,
				"account": status.account.acct
			}
			// build redirect url
			var redirect = 'https://' + settings.fedifollow_homeinstance + "/@" + statusData.account + "/" + statusData.id;
			// perform action if set
			if (action == "boost") {
				await boostHomeInstance(statusData.id, headers)
			} else if (action == "favourite") {
				await favouriteHomeInstance(statusData.id, headers)
			}
		}
		// if we got a redirect url...
		if (redirect) {
			redirectTo(redirect);
		} else {
			log("Could not resolve a match for this search...");
		}
	} else {
		log("API call failed...")
	}
}

// process any toots found on supported sites
async function processToots() {
	// if the url matches our pattern for supported sites OR is a profile url
	if (tootsRegex.test(window.location.href.split("?")[0]) || profileRegex.test(window.location.href.split("?")[0])) {
		// wait for follow button to appear
		waitForEl(0,tootButtonsPaths, function(found) {
			if (found) {
				// convert array to comma separated list for jquery select
				var allElements = tootButtonsPaths.join(", ");
				// disable handlers for those elements
				$(allElements).off();
				$("body").on("click", allElements, async function(e) {
					// prevent default and immediate propagation
					e.preventDefault();
					e.stopImmediatePropagation();
					// determine action
					var action;
					// determine if we have an action (mastodon 4)
					if ($(this).children("i.fa-retweet").length) {
						action = "boost";
					} else if ($(this).children("i.fa-star").length) {
						action = "favourite";
					}
					// extract the toot id from the closest article element
					var closestTootId;
					// first check if there is an <a> sibling with the actual post URL (easiest and fastest)
					if ($(this).siblings("a.status__relative-time").attr("href")) {
						var redirected = true;
						resolveHomeInstance((this).siblings("a.status__relative-time").attr("href"), action, null);
					} else if ($(e.target).closest("div.status").attr("data-id")) {
						// no? then check if there is a closest div.status with the ID in data-id attribute
						closestTootId = $(e.target).closest("div.status").attr("data-id").replace(/[^0-9]/gi,'');
					} else if ($(e.target).closest("article").attr("data-id")) {
						// no? then check if there is a closest <article> element with the ID in data-id attribute
						closestTootId = $(e.target).closest("article").attr("data-id").replace(/[^0-9]/gi,'');
					} else if (this.href) {
						// no? then this is probably mastodon 3 and we have the ID in the href of the clicked link
						closestTootId = this.href.split("?")[0].split("/")[4];
						// double check action because we have a fallback here
						if (!action) {
							// if the link contains...
							if (~this.href.indexOf("type=reblog")) {
								action = "boost";
							} else if (~this.href.indexOf("type=favourite")) {
								action = "favourite";
							}
						}
					} else if (tootRegex.test(window.location.href.split("?")[0])) {
						// no? then this is probably the detailed view of a post, so we can extract the ID from the URL
						closestTootId = window.location.href.split("/")[4];
					}
					// if we have a toot id and NOT already redirected (see first check above)
					if (!redirected) {
						if (closestTootId) {
							var requestUrl = location.protocol + '//' + location.hostname + statusApi+"/"+closestTootId;
							// call status API to get correct author handle
							var response = await makeRequest("GET", requestUrl, null);
							if (response) {
								// if succesfull, get the url and clean it (fix for some instances)
								var postUri = JSON.parse(response).url.replace("/activity/","").replace("/activity","");
								if (postUri) {
									// redirect to home instance
									resolveHomeInstance(postUri, action, null);
								} else {
									log("Could not find post url.")
								}
							}
						} else {
							log("Could not find toot ID.");
						}
					}
				});
			} else {
				log("Could not find any toots");
			}
		});
	} else {
		log("There are no toots on this site");
	}
}

// main function to listen for the follow button pressed and open a new tab with the home instance
function processFollow() {
	// check if this is a profile url
	if (profileRegex.test(window.location.href.split("?")[0])) {
		// wait until follow button appears (document is already ready, but most content is loaded afterwards)
		waitForEl(0, followButtonPaths, async function(found) {
			if (found) {
				var unfollow, handleEl, handleDomain, handle;
				// dirty fix for some v3 instance views
				if (~window.location.href.indexOf("/explore")) {
					var temp = $(e.target).closest("div.account-card").find("div.display-name > span");
					if (temp.length) {
						handleEl = temp;
					}
				} else {
					// check all defined selectors for the username element
					for (const selector of profileNamePaths) {
						if ($(selector).length) {
							handleEl = $(selector)
							break;
						}
					}
				}
				if (handleEl) {
					// match content of first found element against handle regex (with match grups)
					var handleDomainMatches = handleEl.text().trim().match(handleExtractRegex);
					handleDomain = handleDomainMatches.groups.handledomain;
					handle = handleDomainMatches.groups.handle;
				}
				// if extraction worked...
				if (handleDomain && handle) {
					if (settings.fedifollow_showfollows) {
						if (settings.fedifollow_follows) {
							if ($.inArray(handle + "@" + handleDomain, settings.fedifollow_follows) > -1) {
								$(found).text("Unfollow");
								unfollow = true;
							}
						}
					}
					// make request to the external instances search endpoint to make sure we get the correct url for the searchstring
					// (for ex. another external instance, also instance domain can differ from handle domain)
					var requestUrl = location.protocol + "//" + location.hostname + searchApi + "/?q=" + encodeURIComponent("@"+handle+"@"+handleDomain) + "&resolve=false&limit=10";
					var response = await makeRequest("GET", requestUrl, null);
					var result;
					if (response) {
						response = JSON.parse(response);
						// if there are any accounts in the response
						if (response.accounts.length) {
							// get url of first account (which will be the one we need since we searched user+domain)
							result = response.accounts[0].url;
							// set result for searchstring
							var url = document.createElement('a');
							url.setAttribute('href', response.accounts[0].url);
							result = url.protocol + "//" + url.hostname;
						}
					}
					// setup the button click listener
					$(found).click(async function(e) {
						// prevent default action and other handlers
						e.preventDefault();
						e.stopImmediatePropagation();
						// backup the button text
						var originaltext = $(found).html();
						// replace the button text to indicate redirection
						$(found).text("Redirecting...");
						// if we could resolve the user domain...
						if (result) {
							// add the handle
							var redirectUrl = result + "/@" + handle;
							// timeout 1000ms to make it possible to notice the redirection indication
							setTimeout(function() {
								resolveHomeInstance(redirectUrl, null, unfollow);
								// restore original button text
								$(found).html(originaltext);
							}, 1000);
						} else {
							log("Could not get instance URL from API search, attempting raw redirect.");
							var rawRedirect = window.location.href;
							// dirty fix for some v3 views
							if (~rawRedirect.indexOf("/explore")) {
								rawRedirect = "https://" + handleDomain + "/@" + handle;
							}
							// timeout 1000ms to make it possible to notice the redirection indication
							setTimeout(function() {
								resolveHomeInstance(rawRedirect, null, unfollow);
								// restore original button text
								$(found).html(originaltext);
							}, 1000);
						}
					});
				} else {
					log("Could not extract user handle.")
				}
			} else {
				log("Could not find any follow button.");
			}
		});
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

function checkSettings() {
	// if the home instance is undefined/null/empty
	if (settings.fedifollow_homeinstance == null || !settings.fedifollow_homeinstance) {
		log("Mastodon home instance is not set.");
		return false;
	}
	// no token for api available (see background.js)
	if (!settings.fedifollow_token) {
		log("No API token available. Are you logged in to your home instance?");
		return false;
	}
	// if the value looks like a domain...
	if (!(domainRegex.test(settings.fedifollow_homeinstance))) {
		log("Instance setting is not a valid domain name.");
		return false;
	}
	// set default if wrong value
	if ($.inArray(settings.fedifollow_mode, ["blacklist","whitelist"]) < 0) {
		settings.fedifollow_mode = "blacklist";
	}
	if ($.inArray(settings.fedifollow_target, ["_blank","_self"]) < 0) {
		settings.fedifollow_target = "_blank";
	}
	if (settings.fedifollow_mode == "whitelist") {
		// if in whitelist mode and the cleaned whitelist is empty, return false
		settings.fedifollow_whitelist = processDomainList(settings.fedifollow_whitelist);
		if (settings.fedifollow_whitelist.length < 1) {
			log("Whitelist is empty or invalid.")
			return false;
		}
	} else {
		// also process the blacklist if in blacklist mode, but an empty blacklist is OK so we do not return false
		settings.fedifollow_blacklist = processDomainList(settings.fedifollow_blacklist);
	}
	return true;
}

// test if the current site should be processed or not
// this will also be the function for whitelist/blacklist feature
async function checkSite(callback) {
	// is this site on our home instance?
	if (location.hostname == settings.fedifollow_homeinstance) {
		log("Current site is your home instance.");
		return false;
	}
	// are we in whitelist mode?
	if (settings.fedifollow_mode == "whitelist") {
		// if so, check if site is NOT in whitelist
		if ($.inArray(location.hostname, settings.fedifollow_whitelist) < 0) {
			log("Current site is not in whitelist.");
			return false;
		}
	} else {
		// otherwise we are in blacklist mode, so check if site is on blacklist
		if ($.inArray(location.hostname, settings.fedifollow_blacklist) > -1) {
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
				processFollow();
				processToots();
				urlChangeLoop();
			} else {
				log("Will not process this site.")
			}
		}
	} else {
		log("Could not load settings.")
	}
}

run()