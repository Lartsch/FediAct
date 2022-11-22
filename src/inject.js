// prep
const followButtonPaths = ["div.account__header button.logo-button","div.public-account-header a.logo-button"];
const tootButtonsPaths = ["div.status__action-bar button:not(.disabled)","div.detailed-status__action-bar button:not(.disabled)"];
const tokenPaths = ["head script#initial-state"];
const appHolderPaths = ["body > div.app-holder"]
const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/;
const profileRegex = /^(?:https?:\/\/(www\.)?.*\..*?\/)(?<handle>@\w+(?:@[\w-]+\.\w+)?)\/?$/;
const tootsRegex = /^(?:https?:\/\/(www\.)?.*\..*?)(\/explore|\/public|\/public\/local|\d+)$/;
const tootRegex = /^(?:https?:\/\/(www\.)?.*\..*?\/)(?<handle>@\w+(?:@[\w-]+\.\w+)?)\/\d+\/?$/;
const handleDomainRegex = /^.*(?<handle>@\w+)@(?<handledomain>[\w-]+\.\w+)\/?$/;
const enableConsoleLog = true;
const logPrepend = "[FediFollow]";
const maxElementWaitFactor = 200; // x 100ms for total time
const instanceApi = "/api/v1/instance";
const statusApi = "/api/v1/statuses";
const searchApi = "/api/v2/search"
const fediParamName = "fedifollow";

var lastUrl = window.location.href;

// settings keys with defauls
var settingsDefaults = {
	fedifollow_homeinstance: null,
	fedifollow_alert: false,
	fedifollow_mode: "blacklist",
	fedifollow_whitelist: null,
	fedifollow_blacklist: null,
	fedifollow_target: "_blank"
}

// fix for cross-browser storage api compatibility and other public vars
var browser, chrome, instanceUri, fediParamValue, settings;

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

function redirectToHomeInstance(searchString) {
	// open the window
	var url = "https://" + settings.fedifollow_homeinstance + "/?" + fediParamName + "=" + encodeURIComponent(searchString);
	log("Redirecting to " + url);
	if (settings.fedifollow_alert) {
		alert("Redirecting to "+url);
	}
	var win = window.open(url, settings.fedifollow_target);
	// focus the new tab if open was successfull
	if (win) {
		win.focus();
	} else {
		// otherwise notify user...
		log('Could not open new window. Please allow popups for this website.');
	}
}

// process fedifollow redirects to the home instance
async function processHomeInstance() {
	// first we need the api token
	waitForEl(0, tokenPaths, function(found){
		if (found) {
			// then we wait for the appHolder
			waitForEl(0, appHolderPaths, async function(holder) {
				if (holder) {
					// hide the app holder
					$(holder).hide();
					// append our notification div
					$('body').append('<div style="position: absolute; display: block; margin-left: 30px; margin-top: 30px; font-size: 18px; font-weight: bold" id="fedifollow"></div>');
					// extract the token
					var token = JSON.parse($(found).text()).meta.access_token;
					if (token) {
						// update notification div
						$('div#fedifollow').text("Resolving search...");
						var requestUrl = location.protocol + '//' + location.host + searchApi + "/?q="+fediParamValue+"&resolve=true&limit=10";
						var headers = {"Authorization":"Bearer "+token,};
						// api request: search endpoint, resolve search string locally (best support for edge cases (for ex. where subdomain does not equal the handle domain) and prevents uncached profile issue)
						var response = await makeRequest("GET", requestUrl, headers);
						if (response) {
							response = JSON.parse(response);
							var decodedParam = decodeURIComponent(fediParamValue);
							// if we got no data (failed resolve) we can at least try to resolve a user by swapping the domain in case we got a domain in the handle
							// this does not work for resolving post IDs
							if (!response.accounts.length && !response.statuses.length && handleDomainRegex.test(decodedParam)) {
								var matches = decodedParam.match(handleDomainRegex);
								if (matches.groups.handle && matches.groups.handledomain) {
									$('div#fedifollow').text("Failed, trying domain swap...");
									var searchstring = encodeURIComponent("https://" + matches.groups.handledomain + "/" + matches.groups.handle);
									var requestUrl = location.protocol + '//' + location.host + searchApi + "/?q="+searchstring+"&resolve=true&limit=10";
									response = await makeRequest("GET", requestUrl, headers);
									response = JSON.parse(response);
								}
							}
							// set to false initially
							var redirect = false;
							// if we got an account but no statuses, redirect to profile (first result)
							if (response.accounts.length && !response.statuses.length) {
								var redirect = "https://" + settings.fedifollow_homeinstance + "/@" + response.accounts[0].acct;
							} else if (!response.accounts.length && response.statuses.length) {
								// if statuses but no accounts, redirect to status (first result)
								var status = response.statuses[0]
								var statusData = {
									"id": status.id,
									"account": status.account.acct
								}
								var redirect = "https://" + settings.fedifollow_homeinstance + "/@" + statusData.account + "/" + statusData.id;
							}
							// if we got a redirect url...
							if (redirect) {
								// update notification div
								$('div#fedifollow').text("Match! Redirecting...")
								// open the url in current tab
								var win = window.open(redirect, "_self");
								log("Redirected to " + redirect)
								// focus the new tab if open was successfull
								if (win) {
									win.focus();
									return true;
								} else {
									// otherwise notify user...
									log('Could not open new window. Please allow popups for this website.');
									$('div#fedifollow').text('Could not open new window. Please allow popups for this website.');
								}
							} else {
								log("Could not resolve a match for this search...");
								$('div#fedifollow').text("Could not resolve a match for this search....")
							}
						} else {
							log("API call failed...")
							$('div#fedifollow').text("API call failed...")
						}
					} else {
						log("Could not extract API token.")
						$('div#fedifollow').text("Could not get API token...");
					}
					// show app holder after 1.5s (in case we did not redirect)
					setTimeout(function(){
						$(holder).show()
					}, 1500);
				} else {
					log("Could not find app holder element.")
				}
			});
		} else {
			log("Could not find API token.")
		}
	});
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
					// extract the toot id from the closest article element
					var closestTootId;
					if ($(e.target).closest("div.status").attr("data-id")) {
						closestTootId = $(e.target).closest("div.status").attr("data-id").replace(/[^0-9]/gi,'');
					} else if (tootRegex.test(window.location.href.split("?")[0])) {
						closestTootId = window.location.href.split("/")[4];
					}
					if (closestTootId) {
						var requestUrl = location.protocol + '//' + location.host + statusApi+"/"+closestTootId;
						// call status API to get correct author handle
						var response = await makeRequest("GET", requestUrl, null);
						if (response) {
							var user = JSON.parse(response).account.username;
							if (user) {
								// prepend @ and build searchstring
								var handle = "@" + user;
								var searchstring = location.protocol + '//' + location.host + '/' + handle + "/" + closestTootId;
								// redirect to home instance
								redirectToHomeInstance(searchstring);
							}
						}
					} else {
						log("Could not find toot ID");
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
		waitForEl(0, followButtonPaths, function(found) {
			if (found) {
				// setup the button click listener
				$(found).click(function(e) {
					// prevent default action and other handlers
					e.preventDefault();
					e.stopImmediatePropagation();
					// backup the button text
					var originaltext = $(found).text();
					// replace the button text to indicate redirection
					$(found).text("Redirecting...");
					// timeout 1000ms to make it possible to notice the redirection indication
					setTimeout(function() {
						redirectToHomeInstance(window.location.href);
						// restore original button text
						$(found).text(originaltext);
					}, 1000);
				});
			} else {
				log("Could not find any follow button.");
			}
		});
	} else {
		log("Not a profile URL.");
	}
}

// for some reason, locationchange event did not work for me so lets use this ugly thing... since it calls processFollow, it needs to be in runWithSettings as well
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
	if (location.host == settings.fedifollow_homeinstance) {
		// do we have a fedifollow param?
		fediParamValue = getUrlParameter(fediParamName);
		if (fediParamValue) {
			// if so, run home mode
			return "home";
		} else {
			log("Current site is your home instance.");
			return false;
		}
	}
	// are we in whitelist mode?
	if (settings.fedifollow_mode == "whitelist") {
		// if so, check if site is NOT in whitelist
		if ($.inArray(location.host, settings.fedifollow_whitelist) < 0) {
			log("Current site is not in whitelist.");
			return false;
		}
	} else {
		// otherwise we are in blacklist mode, so check if site is on blacklist
		if ($.inArray(location.host, settings.fedifollow_blacklist) > -1) {
			log("Current site is in blacklist.");
			return false;
		}
	}
	// last check - and probably the most accurate to determine if it actually is mastadon
	var requestUrl = location.protocol + '//' + location.host + instanceApi;
	// call instance api to confirm its mastodon and get normalized handle uri
	var response = await makeRequest("GET", requestUrl, null);
	if (response) {
		var uri = JSON.parse(response).uri;
		if (uri) {
			// update global var
			instanceUri = uri;
			// run external mode
			return "external";
		}
	}
	log("Does not look like a Mastodon site.");
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
			var mode = await checkSite();
			// run or exit
			if (mode == "external") {
				processFollow();
				processToots();
				urlChangeLoop();
			} else if (mode == "home") {
				processHomeInstance();
			} else {
				log("Will not process this site.")
			}
		}
	} else {
		log("Could not load settings.")
	}
}

run()