// prep
var currentVal_instance;
var currentVal_alert;
var currentVal_mode;
var currentVal_whitelist;
var currentVal_blacklist;
var currentVal_target;

// this performs loading the settings into the popup, reacting to changes and saving changes
function popupTasks() {
	$(document).ready(function() {
		// set all default/configured values and show fields accordingly
		$("input#homeinstance").val(currentVal_instance);
		$("textarea#blacklist_content").val(currentVal_blacklist);
		$("textarea#whitelist_content").val(currentVal_whitelist);
		if (currentVal_alert){
			$("input#alert").prop('checked', true);
		} else {
			$("input#alert").prop('checked', false);
		}
				// we only set the mode if we have an actual value. otherwise the default should be left.
		if (currentVal_mode) {
			$("select#mode").val(currentVal_mode);
		}
		if (currentVal_target) {
			$("select#target").val(currentVal_target);
		}
				// both containers are hidden by default
		if ($("select#mode").val() == "whitelist") {
			$("div#whitelist_input").show();
		} else {
			$("div#blacklist_input").show();
		}
		// check changes of the select to update whitelist/blacklist input
		$("select#mode").change(function() {
			if ($("select#mode").val() == "whitelist") {
				$("div#blacklist_input").hide();
				$("div#whitelist_input").show();
			} else {
				$("div#whitelist_input").hide();
				$("div#blacklist_input").show();
			}
		});
		// perform storage actions on form submit
		$("form#fedifollow-settings").on('submit', function(e){
			e.preventDefault();
			var newVal_instance = $("input#homeinstance").val();
			var newVal_alert = $("input#alert").is(':checked')
			var newVal_mode = $("select#mode").val();
			var newVal_whitelist = $("textarea#whitelist_content").val();
			var newVal_blacklist = $("textarea#blacklist_content").val();
			var newVal_target = $("select#target").val();
			chrome.storage.local.set({fedifollow_homeinstance: newVal_instance}, function() {
				chrome.storage.local.set({fedifollow_alert: newVal_alert}, function() {
					chrome.storage.local.set({fedifollow_mode: newVal_mode}, function() {
						chrome.storage.local.set({fedifollow_whitelist: newVal_whitelist}, function() {
							chrome.storage.local.set({fedifollow_blacklist: newVal_blacklist}, function() {
								chrome.storage.local.set({fedifollow_target: newVal_target}, function() {
									$("span#indicator").show();
								});
							});
						});
					});
				});
			});
		});
	});
}

// read all settings, then run popupTasks()
chrome.storage.local.get(['fedifollow_homeinstance'], function(fetchedData) {
	currentVal_instance = fetchedData.fedifollow_homeinstance;
	chrome.storage.local.get(['fedifollow_alert'], function(fetchedData) {
		currentVal_alert = fetchedData.fedifollow_alert;
		chrome.storage.local.get(['fedifollow_mode'], function(fetchedData) {
			currentVal_mode = fetchedData.fedifollow_mode;
			chrome.storage.local.get(['fedifollow_whitelist'], function(fetchedData) {
				currentVal_whitelist = fetchedData.fedifollow_whitelist;
				chrome.storage.local.get(['fedifollow_blacklist'], function(fetchedData) {
					currentVal_blacklist = fetchedData.fedifollow_blacklist;
					chrome.storage.local.get(['fedifollow_target'], function(fetchedData) {
						currentVal_target = fetchedData.fedifollow_target;
						popupTasks()
					});
				});
			});
		});
	});
});
