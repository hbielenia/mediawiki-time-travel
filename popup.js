let dateForm = document.getElementById('dateForm');
let dateInput = document.getElementById('date');
let dateReset = document.getElementById('reset');

// Common code for extracting active tab information.
var wrapWithTab = function(func) {
	chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
		let activeTab = tabs[0];
		let url = new URL(activeTab.url);
		func(url.hostname, activeTab.id, activeTab.windowId, activeTab.url);
	});
};

// On init, check if we already have a set date and update popup.
wrapWithTab(function(hostname) {
	chrome.runtime.sendMessage(
		message = { get: 'redirectConf' },
		responseCallback = function(response) {
			let dateValue;
			if (response['hostname'] == hostname) {
				dateValue = response['date'];
			} else {
				let now = new Date();
				dateValue = now.toISOString().substring(0, 10);
			};
			dateInput.setAttribute('value', dateValue);
		},
	);
});

// Send date to background page upon changing.
dateInput.addEventListener('change', function() {
	wrapWithTab(function(hostname, tabId, windowId, url) {
		chrome.runtime.sendMessage(
			message = { setRedirect: {
				hostname,
				date: dateInput.value,
				tabId,
				windowId,
				url,
			}},
		);
	});
});

// Reset date to now.
dateReset.addEventListener('click', function() {
	dateInput.setAttribute('value', new Date().toISOString().substring(0, 10));
	chrome.runtime.sendMessage(
		message = { unsetRedirect: true },
	);
});
