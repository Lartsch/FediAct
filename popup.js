var currentVal_instance;
var currentVal_alert;

function popupTasks() {
	$(document).ready(function() {
		$("input#homeinstance").val(currentVal_instance);
		if (currentVal_alert){
			$("input#alert").prop('checked', true);
		} else {
			$("input#alert").prop('checked', false);
		}
		$("form#homeinstance").on('submit', function(e){
			e.preventDefault();
			var newVal_instance = $("input#homeinstance").val();
			var newVal_alert = $("input#alert").is(':checked')
			chrome.storage.local.set({mastodonhomeinstance: newVal_instance}, function() {
				chrome.storage.local.set({mastodonalert: newVal_alert}, function() {
					$("span#indicator").show();
				});
			});
		});
	});
}

chrome.storage.local.get(['mastodonhomeinstance'], function(fetchedData) {
	currentVal_instance = fetchedData.mastodonhomeinstance;
	chrome.storage.local.get(['mastodonalert'], function(fetchedData) {
		currentVal_alert = fetchedData.mastodonalert;
		popupTasks()
	});
});