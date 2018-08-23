// Attempt recognition of MediaWiki-based website.
chrome.runtime.onInstalled.addListener(function() {
	chrome.declarativeContent.onPageChanged.removeRules(
		undefined,
		function() {
			chrome.declarativeContent.onPageChanged.addRules([
				{
					conditions: [
						new chrome.declarativeContent.PageStateMatcher({
							css: [".mediawiki"],
						}),
					],
					actions: [ new chrome.declarativeContent.ShowPageAction() ],
				},
			]);
		},
	);
});

const URL_SCHEMAS = [ 'http', 'https' ];
var errors = {};
var redirectConf = {
	hostname: null,
	date: null,
	tabId: null,
	windowId: null,
};
var redirectListener;

var handleError = function(errMsg) {
	// We display error popup once, then go back to normal one.
	let tabId = redirectConf.tabId;
	errors[tabId] = errMsg;
	chrome.pageAction.setPopup({
		tabId,
		popup: 'error.html',
	}, function() {
		chrome.pageAction.show(redirectConf.tabId, function() {
			chrome.pageAction.setPopup({
				tabId,
				popup: 'popup.html',
			}, function() { delete errors[tabId]; });
		});
	});
};

var xhrHandlerFactory = function(xhr, handler, errMsg) {
	return function() {
		if (xhr.readyState == 4) {
			if (xhr.status == 200) {
				handler(xhr);
			} else {
				handleError(errMsg || (xhr.responseUrl + ' is not accessible.'));
			};
		};
	};
};

// Parse MediaWiki page for RSD url, then the url itself for API endpoint.
// https://www.mediawiki.org/wiki/API:Main_page#The_endpoint
var getApiUrlAsync = function(url, callback) {
	let req = new XMLHttpRequest();
	req.open('GET', url, true);
	req.responseType = 'document';
	req.onreadystatechange = xhrHandlerFactory(req, function(xhr) {
		let editLinks = xhr.responseXML.querySelectorAll('link[rel="EditURI"]');
		if (editLinks.length < 1) {
			handleError(url + ' has no API urls.');
		};
		if (editLinks.length > 1) {
			console.warn(
				url + ' has more than 1 API urls. Only the first one will be used.');
		};
		let newReq = new XMLHttpRequest();
		newReq.open('GET', editLinks[0].getAttribute('href'), true);
		newReq.onreadystatechange = xhrHandlerFactory(newReq, function(newXhr) {
			let api = newXhr.responseXML.querySelectorAll('api[name="MediaWiki"]')[0];
			callback(api.getAttribute('apiLink'));
		}, 'API definition couldn\'t be retrieved');
		newReq.send(null);
	});
	req.send(null);
};

// Construct webRequest.onBeforeHeadersSent listener
var listenerFactory = function(apiUrl, date) {
	let listener = function(details) {
		let response = {
			redirectUrl: details.url,
		}
		let url = new URL(details.url);
		// Short circuit processing if user already accesses old revision.
		if (url.searchParams.has('oldid')) {
			return response;
		}

		let apiReq = new XMLHttpRequest();

		let pageTitle = url.pathname.substring(1);
		let params = new URLSearchParams();
		params.append('format', 'json');
		params.append('action', 'query');
		params.append('prop', 'revisions');
		params.append('titles', encodeURIComponent(pageTitle));
		params.append('rvprop', 'ids');
		params.append('rvlimit', '1');
		params.append('rvstart', date + 'T23:59:59');
		params.append('rvdir', 'older');
		// We have to use synchronous XHR because returning from this function
		// unblocks request. Let's hope Chrome will finally adopt Promises
		// in extension APIs.
		apiReq.open('GET', apiUrl + '?' + params.toString(), false);
		apiReq.send(null);
		if (apiReq.status == 200) {
			let apiRes = JSON.parse(apiReq.responseText);
			let pageId = Object.keys(apiRes['query']['pages'])[0];
			let revisions = apiRes['query']['pages'][pageId]['revisions']
			// Only redirect if there are older revisions
			if (revisions) {
				let redirectParams = new URLSearchParams(url.searchParams);
				redirectParams.append('oldid', revisions[0]['revid']);
				let redirect = url.origin
					+ url.pathname
					+ '?'
					+ redirectParams.toString()
				;
				response['redirectUrl'] = redirect;
			};
		} else {
			console.error('API response invalid.');
		};

		return response;
	};
	return listener;
};

// Construct filters and swap current listener for new one.
var setRedirectListenerAsync = function(config) {
	if (redirectListener) {
		chrome.webRequest.onBeforeRequest.removeListener(redirectListener);
	};

	if (!config) {
		return true;
	}

	let filters = [];
	for (let schema of URL_SCHEMAS) {
		filters.push(schema + '://' + config.hostname + '/*');
	};

	let apiUrlCallback = function(apiUrl) {
		delete config.url;

		let listener = listenerFactory(apiUrl, config.date);

		chrome.webRequest.onBeforeRequest.addListener(
			listener,
			{
				urls: filters,
				types: [ 'main_frame' ],
				tabId: config.tabId,
				windowId: config.windowId,
			},
			[ 'blocking' ],
		);
		redirectListener = listener;
	}

	getApiUrlAsync(config.url, apiUrlCallback);
};

// Listen for messages from popup. Supported are:
// - request for current redirect config,
// - request for clearing the config,
// - new redirect config.
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
	if (sender.id === chrome.runtime.id) {
		if (message.get === 'redirectConf') {
			sendResponse(redirectConf);
		} else if (message.unsetRedirect) {
			setRedirectListenerAsync(null);
			if (redirectConf.tabId) {
				chrome.tabs.get(redirectConf.tabId, function(tab) {
					let tabUrl = new URL(tab.url);
					let params = new URLSearchParams(tabUrl.searchParams);
					if (params.has('oldid')) {
						params.delete('oldid');
						chrome.tabs.update(tab.id, {
							url: tabUrl.origin + tabUrl.pathname + '?' + params.toString(),
						});
					};
				});
			};
		} else if (message.setRedirect) {
			Object.assign(redirectConf, message.setRedirect);
			setRedirectListenerAsync(redirectConf);
		} else {
			console.error("Unexpected message: " + JSON.stringify(message));
		};
	};
});