window.regExp = /((CPU[ +]OS|iPhone[ +]OS|CPU[ +]iPhone|CPU IPhone OS)[ +]+(14[_.]5|14[_.]([6-9]|\d{2,})|14[_.]7|14[_.]([8-9]|\d{2,})|(1[5-9]|[2-9]\d|\d{3,})[_.]\d+)(?:[_.]\d+)?)|(Edge\/(88(?:\.0)?|88(?:\.([1-9]|\d{2,}))?|(89|9\d|\d{3,})(?:\.\d+)?))|((Chromium|Chrome)\/(88\.0|88\.([1-9]|\d{2,})|(89|9\d|\d{3,})\.\d+)(?:\.\d+)?)|(Version\/(14\.1|14\.([2-9]|\d{2,})|(1[5-9]|[2-9]\d|\d{3,})\.\d+)(?:\.\d+)? Safari\/)|(Firefox\/(87\.0|87\.([1-9]|\d{2,})|(8[8-9]|9\d|\d{3,})\.\d+)\.\d+)|(Firefox\/(87\.0|87\.([1-9]|\d{2,})|(8[8-9]|9\d|\d{3,})\.\d+)(pre|[ab]\d+[a-z]*)?)/;
window.supportedBrowsers = [{"id":"safari","version":"14","name":"Safari","icon":"safari.png"},{"id":"firefox","version":"87","name":"Firefox","icon":"firefox.png"},{"id":"chrome","version":"88","name":"Chrome","icon":"chrome.png"},{"id":"edge","version":"88","name":"Edge","icon":"edge.png"}];
window.isSupportedBrowser = window.navigator.userAgent.match(window.regExp) !== null;
document.documentElement.classList.add(window.isSupportedBrowser ? 'supported' : 'not-supported');

if (!window.isSupportedBrowser) {
    window.addEventListener('load', function () {
        const browsers = document.getElementById('browsers');
        let entries = '';

        if (browsers) {
            for (var i = 0; i < window.supportedBrowsers.length; i++) {
                const browser = window.supportedBrowsers[i];
                entries += `<li class="browser"><div><img class="logo" src="browsers/${browser.icon}"></div><div class="info"><p><b>${browser.name}</b></p><p>Version ${browser.version} or higher</p></div></li>`;
            }

            browsers.innerHTML = entries;
        }
    });
}
