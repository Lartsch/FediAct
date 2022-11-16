// prep
var instance;
var showAlert;
var lastUrl = window.location.href;
var buttonPaths = ["div.account__header button.logo-button","div.public-account-header a.logo-button"];

// function to wait for given elements to appear - first found element gets returned
var waitForEl = function(selectors, callback) {
	var match = false;
	for (const selector of selectors) {
		if ($(selector).length) {
			match = true;
			callback(selector);
		}
	}
	if (!match) {
	    setTimeout(function() {
            waitForEl(selectors, callback);
        }, 100);
	}
};

// regex match to extract @handle from any (as always, the regex was awful to build)
function extractHandle(url) {
  if (!url) return null;
  // regex with named match group
  const match = url.match(/^(?:https?:\/\/(www\.)?.*\..*?\/)(?<handle>@\w+(?:@\w+\.\w+)?)(?:\/?.*|\z)$/);
  // return the named match group
  return match.groups.handle
} 

// main function to listen for the follow button pressed and open a new tab with the home instance
function processButton() {
	// is this site on our home instance?
	if (!(document.domain == instance)) {
		// wait for the DOM...
		$(document).ready(function() {
			// check if we are on a mastodon site with a handle in url
			if (($("head").text().includes("mastodon") || $("head").text().includes("Mastodon") || $("div#mastodon").length) && window.location.href.includes("@")) {
				// wait until follow button appears
				waitForEl(buttonPaths, function(found) {
					// grab the user handle
					handle = extractHandle(window.location.href);
					// if we got one...
					if (!(handle == null) && (handle.match(/@/g) || []).length > 0) {
						// setup the button click listener
						$(found).click(function(e) {
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
								// if more than 1 @, we have a domain
								if ((handle.match(/@/g) || []).length > 1) {
									// but if its our own...
									if (handle.includes(instance)) {
										// ...then we need to remove it
										handle = "@"+ handle.split("@")[1];
									}
									// request string
									var request = 'https://'+instance+'/'+handle;
								} else {
									// with only 1 @, we have a local handle and need to append to domain
									var request = 'https://'+instance+'/'+handle+'@'+document.domain;
								}
								// open the window
								var win = window.open(request, '_blank');
								// focus the new tab if open was successfull
								if (win) {
									win.focus();
								} else {
									// otherwise notify user...
									console.log('Please allow popups for this website');
								}
								// restore original button text
								$(found).text(originaltext)
							}, 1000);
						});
					}
				});
			}
		});
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
			processButton();
		}
		// repeat
		urlChangeLoop();
	}, 300);
}

// get the extension setting for the users' Mastadon home instance
chrome.storage.local.get(['mastodonhomeinstance'], function(fetchedData) {
	instance = fetchedData.mastodonhomeinstance;
	// and alert setting
	chrome.storage.local.get(['mastodonalert'], function(fetchedData) {
		showAlert = fetchedData.mastodonalert;
		// if the value is empty/null/undefined...
		if (instance == null || !instance) {
			console.log("Mastodon home instance is not set.");
		} else {
			// if the value looks like a domain...
			if (/\w+\.\w+/.test(instance)) {
				// ... run the actual script (once for the start and then in a loop depending on url changes)
				processButton();
				urlChangeLoop();
			} else {
				console.log("Instance setting is not a valid domain name.");
			}
		}
	});
});
