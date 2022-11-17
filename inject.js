// prep
var buttonPaths = ["div.account__header button.logo-button","div.public-account-header a.logo-button"];
var domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/;
var handleRegex = /^(?:https?:\/\/(www\.)?.*\..*?\/)(?<handle>@\w+(?:@\w+\.\w+)?)(?:\/?.*|\z)$/;
var enableConsoleLog = true;
var logPrepend = "[FediFollow]";
var maxElementWaitFactor = 200; // x 100ms for total time

var lastUrl = window.location.href;
var instance;
var showAlert;
var mode;
var whitelist;
var blacklist;
var target;

// wrapper to prepend to log messages
function log(text) {
	if (enableConsoleLog) {
		console.log(logPrepend + ' ' + text)
	}
}

// function to wait for given elements to appear - first found element gets returned (but as of now the selectors are for different layouts anyways)
var waitForEl = function(counter, selectors, callback) {
	var match = false;
	// check all of the selectors
	for (const selector of selectors) {
		// if found
		if ($(selector).length) {
			// set match = true to prevent repetition hand over the found element
			match = true;
			callback(selector);
		}
	}
	// repeat if no match was found and we did not exceed the wait factor yet
	if (!match && counter < maxElementWaitFactor) {
	    setTimeout(function() {
				// increase counter
        waitForEl(counter + 1, selectors, callback);
      }, 100);
	}
};

// extract handle from any mastodon url
var extractHandle = function(url, callback) {
  // regex with named match group
  var match = url.match(handleRegex);
	match = match.groups.handle
	// check if match is valid
	ats = (match.match(/@/g) || []).length;
	if (!(match == null) && ats >= 1 && ats <= 2) {
  	// return the named match group
  	callback(match);
	}
}

// test if the current site should be processed or not
// this will also be the function for whitelist/blacklist feature
function checkSite() {
	// is this site on our home instance?
	if (document.domain == instance) {
		log("Current site is your home instance.");
		return false;
	}
	if (mode == "whitelist") {
		if ($.inArray(document.domain, whitelist) < 0) {
			log("Current site is not in whitelist.");
			return false;
		}
	} else {
		if ($.inArray(document.domain, blacklist) > -1) {
			log("Current site is in blacklist.");
			return false;
		}
	}
	// check if the current site looks like Mastodon
	$(document).ready(function() {
		if (!($("head").text().includes("mastodon") || $("head").text().includes("Mastodon") || $("div#mastodon").length)) {
			log("Could not find a reference that this is a Mastodon site.")
			return false;
		}
	});
	return true;
}

// main function to listen for the follow button pressed and open a new tab with the home instance
function processSite() {
	// check if we have a handle in the url
	if (window.location.href.includes("@")) {
		// grab the user handle
		extractHandle(window.location.href, function(handle) {	
			// if we got one...
			if (handle) {
				// wait until follow button appears (document is already ready, but most content is loaded afterwards)
				waitForEl(0, buttonPaths, function(found) {
					if (found) {
						// setup the button click listener
						$(found).click(function(e) {
							// prevent default action and other handlers
							e.preventDefault();
							e.stopImmediatePropagation();
							// check the alert setting and show it if set
							if (showAlert) {
								alert("Redirecting to "+instance);
							}
							// backup the button text
							var originaltext = $(found).text();
							// replace the button text to indicate redirection
							$(found).text("Redirecting...");
							// timeout 1000ms to make it possible to notice the redirection indication
							setTimeout(function() {
								// if more than 1 @, we have a domain in the handle
								if ((handle.match(/@/g) || []).length > 1) {
									// but if its our own...
									if (handle.includes(instance)) {
										// ...then we need to remove it
										handle = "@"+ handle.split("@")[1];
									}
									// request string
									var request = 'https://'+instance+'/'+handle;
								} else {
									// with only 1 @, we have a local handle and need to append the domain
									var request = 'https://'+instance+'/'+handle+'@'+document.domain;
								}
								// open the window
								var win = window.open(request, target);
								log("Redirected to " + request)
								// focus the new tab if open was successfull
								if (win) {
									win.focus();
								} else {
									// otherwise notify user...
									log('Could not open new window. Please allow popups for this website.');
								}
								// restore original button text
								$(found).text(originaltext);
							}, 1000);
						});
					} else {
						log("Could not find any follow button.");
					}
				});
			} else {
				log("Could not find a handle.");
			}
		});
	} else {
		log("No handle in this URL.");
	}
}

// for some reason, locationchange event did not work for me so lets use this ugly thing...
function urlChangeLoop() {
	// run every 100ms, can probably be reduced
	setTimeout(function() {
		// compare last to current url
		if (!(lastUrl == window.location.href)) {
			// update lastUrl and run main script
			lastUrl = window.location.href;
			processSite();
		}
		// repeat
		urlChangeLoop();
	}, 300);
}

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
	if (instance == null || !instance) {
		log("Mastodon home instance is not set.");
		return false;
	}
	// if the value looks like a domain...
	if (!(domainRegex.test(instance))) {
		log("Instance setting is not a valid domain name.");
		return false;
	}
	// set default if no value
	if ($.inArray(mode, ["blacklist","whitelist"]) < 0) {
		mode = "blacklist";
	}
	if ($.inArray(target, ["_blank","_self"]) < 0) {
		target = "_blank";
	}
	if (mode == "whitelist") {
		// if in whitelist mode and the cleaned whitelist is empty, return false
		whitelist = processDomainList(whitelist);
		if (whitelist.length < 1) {
			log("Whitelist is empty or invalid.")
			return false;
		}
	} else {
		// also process the blacklist if in blacklist mode, but an empty blacklist is OK so we do not return false
		blacklist = processDomainList(blacklist);
	}
	return true;
}

function run() {
	// get the extension setting for the users' Mastadon home instance
	chrome.storage.local.get(['fedifollow_homeinstance'], function(fetchedData) {
		instance = fetchedData.fedifollow_homeinstance.trim();
		// and alert setting
		chrome.storage.local.get(['fedifollow_alert'], function(fetchedData) {
			showAlert = fetchedData.fedifollow_alert;
			// mode
			chrome.storage.local.get(['fedifollow_mode'], function(fetchedData) {
				mode = fetchedData.fedifollow_mode;
				// whitelist
				chrome.storage.local.get(['fedifollow_whitelist'], function(fetchedData) {
					whitelist = fetchedData.fedifollow_whitelist;
					// blacklist
					chrome.storage.local.get(['fedifollow_blacklist'], function(fetchedData) {
						blacklist = fetchedData.fedifollow_blacklist;
						chrome.storage.local.get(['fedifollow_target'], function(fetchedData) {
							target = fetchedData.fedifollow_target;
							if (checkSettings()) {
									// check if the current URL should be processed
								if (checkSite()) {
									// ... run the actual script (once for the start and then in a loop depending on url changes)
									processSite();
									urlChangeLoop();
								} else {
									log("Will not process this URL.")
								}
							}
						});
					});
				});		
			});
		});
	});
}

run();
