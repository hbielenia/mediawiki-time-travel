chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
	let activeTab = tabs[0];
	chrome.runtime.getBackgroundPage(function(backgroundPage) {
		if (backgroundPage.errors[activeTab.id]) {
			document.getElementById('error').textContent(backgroundPage.errorMsg);
		}
	});
});
