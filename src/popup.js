
// required settings keys with defauls
const settingsDefaults = {
	fediact_homeinstance: null,
	fediact_alert: false,
	fediact_mode: "blacklist",
	fediact_whitelist: null,
	fediact_blacklist: null,
	fediact_target: "_self",
	fediact_autoaction: true,
	fediact_showfollows: true,
	fediact_redirects: true,
	fediact_enabledelay: true
}

// fix for cross-browser storage api compatibility
var browser, chrome, settings;
const enableConsoleLog = true;
const logPrepend = "[FediAct]";

// wrapper to prepend to log messages
function log(text) {
	if (enableConsoleLog) {
		console.log(logPrepend + ' ' + text)
	}
}

// this performs loading the settings into the popup, reacting to changes and saving changes
function popupTasks() {
	// function to show confirmation when settings were updated successfully
	function showConfirmation() {
		$("span#indicator").show();
		setTimeout(function() {
			$("span#indicator").hide();
		}, 1500);
	}
	// get all current values and write them to the local storage
	async function updateSettings(){
		// update settings values
		settings.fediact_homeinstance = $("input#homeinstance").val().trim();
		settings.fediact_alert = $("input#alert").is(':checked');
		settings.fediact_mode = $("select#mode").val();
		settings.fediact_whitelist = $("textarea#whitelist_content").val();
		settings.fediact_blacklist = $("textarea#blacklist_content").val();
		settings.fediact_target = $("select#target").val();
		settings.fediact_autoaction = $("input#autoaction").is(':checked');
		settings.fediact_showfollows = $("input#showfollows").is(':checked');
		settings.fediact_redirects = $("input#redirects").is(':checked');
		settings.fediact_enabledelay = $("input#delay").is(':checked');
		// write to storage
		try {
			await (browser || chrome).storage.local.set(settings)
		} catch {
			log(e)
			return false
		}
		// show saved indicator after successful save
		showConfirmation()
	}
	// restore form based on loaded settings
	function restoreForm() {
		// set all default/configured values and show fields accordingly
		$("input#homeinstance").val(settings.fediact_homeinstance);
		$("textarea#blacklist_content").val(settings.fediact_blacklist);
		$("textarea#whitelist_content").val(settings.fediact_whitelist);
		$("select#mode").val(settings.fediact_mode);
		$("select#target").val(settings.fediact_target);
		$("input#alert").prop('checked', settings.fediact_alert);
		$("input#autoaction").prop('checked', settings.fediact_autoaction);
		$("input#showfollows").prop('checked', settings.fediact_showfollows);
		$("input#redirects").prop('checked', settings.fediact_redirects);
		$("input#delay").prop('checked', settings.fediact_enabledelay);
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
	}
	$(document).ready(function() {
		// restore the form values
		restoreForm();
		// perform storage actions on form submit
		$("form#fediact-settings").on('submit', function(e){
			// prevent default
			e.preventDefault()
			// update settings
			updateSettings()
			try {
				chrome.runtime.sendMessage({updatedsettings: true})
			} catch(e) {
				log(e)
			}
		})
	})
}

async function loadAndRun() {
	try {
		settings = await (browser || chrome).storage.local.get(settingsDefaults)
	} catch(e) {
		log(e)
		return false
	}
	if (settings) {
		popupTasks()
	}
}

loadAndRun()