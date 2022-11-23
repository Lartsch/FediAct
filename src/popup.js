
// settings keys with defauls
var settings = {
	fedifollow_homeinstance: null,
	fedifollow_alert: false,
	fedifollow_mode: "blacklist",
	fedifollow_whitelist: null,
	fedifollow_blacklist: null,
	fedifollow_target: "_self",
	fedifollow_autoaction: true
}

// fix for cross-browser storage api compatibility
var browser, chrome;

function onError(error){
	console.error(`[FediFollow] Error: ${error}`)
}

// this performs loading the settings into the popup, reacting to changes and saving changes
function popupTasks(settings) {

	function showConfirmation() {
		$("span#indicator").show();
		setTimeout(function() {
			$("span#indicator").hide();
		}, 1500);
	}

	function updateSettings(){
		// update settings values
		settings.fedifollow_homeinstance = $("input#homeinstance").val().trim();
		settings.fedifollow_alert = $("input#alert").is(':checked');
		settings.fedifollow_mode = $("select#mode").val();
		settings.fedifollow_whitelist = $("textarea#whitelist_content").val();
		settings.fedifollow_blacklist = $("textarea#blacklist_content").val();
		settings.fedifollow_target = $("select#target").val();
		settings.fedifollow_autoaction = $("input#autoaction").is(':checked');
		// write to storage
		const waitForSaved = (browser || chrome).storage.local.set(settings);
		// show saved indicator after successful save
		waitForSaved.then(showConfirmation(), onError);
	}

	function restoreForm() {
		// set all default/configured values and show fields accordingly
		$("input#homeinstance").val(settings.fedifollow_homeinstance);
		$("textarea#blacklist_content").val(settings.fedifollow_blacklist);
		$("textarea#whitelist_content").val(settings.fedifollow_whitelist);
		$("select#mode").val(settings.fedifollow_mode);
		$("select#target").val(settings.fedifollow_target);
		$("input#alert").prop('checked', settings.fedifollow_alert);
		$("input#autoaction").prop('checked', settings.fedifollow_autoaction);
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
		$("form#fedifollow-settings").on('submit', function(e){
			// prevent default
			e.preventDefault();
			// update settings
			updateSettings();
		});
	});

}

(browser || chrome).storage.local.get(settings).then(popupTasks, onError);