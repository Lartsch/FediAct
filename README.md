# FediAct (v0.9.5)
A Chrome/Firefox extension that simplifies following and post interactions on other Mastodon instances than your own.

**Features**:
- Supports Mastodon v3 + v4
- Follow, boost, bookmark, reply and favourite on external instances while only being logged in to your home instance
- Show following status and toot status (boosted, faved, bookmarked) on external instances
- Single click to execute action only, double click to redirect to content on home instance
- Reply button on external instances always redirects to home instance and enters reply-mode
- Hide muted content on external instances if enabled
- Customizable

**Supported browsers**:
- All up-to-date Chromium browsers, including Kiwi browser on Android
- Up-to-date Firefox, including Firefox Nightly on Android

**Important notes**:
- All data is processed locally only
- Performance depends on the performance (and rate limiting) of your home instance and to some degree of the external instance you are browsing (read more [below](#additional-notes))
- Some toots cannot be resolved to your home (in cases where searching the post manually would also not work)

## Navigation
  * [Installation](#installation)
  * [Setup](#setup)
  * [Screenshots / GIFs](#screenshots--gifs)
  * [Manual installation](#manual-installation)
      * [Install in Firefox for Android](#install-in-firefox-for-android)
  * [Additional notes](#additional-notes)
  * [Todos / Planned features](#todos--planned-features)

## Installation

[link-chrome]: https://chrome.google.com/webstore/detail/fediact/lmpcajpkjcclkjbliapfjfolocffednm 'Version published on Chrome Web Store'
[link-firefox]: https://addons.mozilla.org/en-US/firefox/addon/fediact/ 'Version published on Mozilla Add-ons'

[<img src="https://raw.githubusercontent.com/alrra/browser-logos/90fdf03c/src/chrome/chrome.svg" width="48" alt="Chrome" valign="middle">][link-chrome] [<img valign="middle" src="https://img.shields.io/chrome-web-store/v/lmpcajpkjcclkjbliapfjfolocffednm.svg?label=%20%20">][link-chrome] and other Chromium browsers (**currently in review** by Google)

[<img src="https://raw.githubusercontent.com/alrra/browser-logos/90fdf03c/src/firefox/firefox.svg" width="48" alt="Firefox" valign="middle">][link-firefox] [<img valign="middle" src="https://img.shields.io/amo/v/fediact.svg?label=%20%20">][link-firefox] including Firefox for Android

I recommend using version 0.9.5.3 as I think it's the most stable release yet, including all features.

> **Note**
> 
> - **If webstore release is outdated, use the [manual installation method](#manual-installation) to install the latest version**  
> - **Special installation steps for [Firefox on Android](#install-in-firefox-for-android)**

## Setup

1. Make sure you are logged in to your home instance
2. Click the extension icon or open its settings page
3. Set your home instance (required)
4. Check the other settings (optional)
5. Click the "Submit" button to save

**Please read the [additional notes](#additional-notes).**

## Screenshots / GIFs
v0.8.0
<details>
  <summary>Extension popup / settings</summary>
  <img src="https://github.com/lartsch/FediAct/blob/main/img/settings.png?raw=true">
</details>
<details>
  <summary>Showcase</summary>
  <img src="https://github.com/lartsch/FediAct/blob/main/img/showcase.gif?raw=true">
</details>

## Manual installation
1. Download the [latest Github release](https://github.com/Lartsch/FediAct/releases/latest) for your browser (chrome or firefox)
### Chrome
2. Unzip the downloaded file somewhere
3. Go to your Chrome extension page (URL: chrome://extensions) and enable developer mode
4. Click the "Load unpacked" button and then select the unzipped folder

Note: Some Chromium browsers allow to directly load a .zip file - you can use it if available for you

### Firefox
2. Open the debugging page (URL: about:debugging)
3. Select "This Firefox"
4. Click the "Load Temporary Add-on" button and then select the downloaded Firefox ZIP file

### Install in Firefox for Android
Since a while, Firefox on Android only allows a [curated list](https://addons.mozilla.org/en-US/android/search/?promoted=recommended&sort=random&type=extension) of addons to install, preventing installation of anything else. The following explanation will guide you how to install it from the webstore anyways.

**Requirements:**  
- Firefox **Nightly** for Android  
  
**Steps:**  
1. In Firefox, go to Settings > About Firefox Nightly
2. Click the Firefox logo 5 times to enable developer options
3. Go back to Settings > Custom Add-on Collection
4. Enter the following data:
    - ID: 17665294
    - Name: FediAct
5. Click OK, Firefox will close - reopen it
6. FediAct will now be available in the Add-ons menu of Firefox Nightly

To update the addon instantly, simply remove and re-install it. Not sure when/if auto-update triggers in Firefox.
  
I included all of the default add-ons in the custom collection, so you will not miss out on any of those. Of course, you can create [your own collection](https://support.mozilla.org/en-US/kb/how-use-collections-addonsmozillaorg) as well.

## Additional notes
1. Currently supports external Mastodon instances v3 + v4
    - **I have not tested if Mastodon v3 works as home instance! v4 support is the main objective**
    - Support for other Fedi software is still planned
2. The whitelist mode can be useful if you do not want the extension to run basic checks on every site (since it needs to determine if its a Mastodon site). Not sure if blacklist is good for anything but I still included it.
3. It can have several reasons why resolving/executing actions/redirection might not work:
    - You're not logged in to your home instance (can't fix, log in lol)
    - You're scrolling fast and posts are not resolved instantly (a delay is implemented to prevent 429 API errors - wait shortly and check again)
    - Element identifiers have changed / instance uses a custom layout/flavour (identifiers need to be added / updated)
    - The external instance you are browsing is not Mastodon (not supported yet)
    - **Your home instance has strong rate limiting and blocks the API requests** (looking for a way to improve 429 prevention)
    - The toot that was tried to resolve is from an original instance that is not Mastodon(-like) (not supported yet, at leat a fallback will be added)
    - Your home instance or the original instance of a toot have defederated / are moderated in a way that affects the API search endpoint (can't fix)
    - The instance you are browsing does not use 302 redirects for external toots (fallback will be added)
    - Maybe it also plays a role if the toot is set to unlisted on its original instance (not sure yet)
5. There can be short delays since external API calls have to be made
6. If you only want redirects, simply turn off auto-action and leave redirect on - double click will then only redirect, not execute the action (alternatively, you can simply use the reply button, as it will always redirect to your home instance if redirects are enabled)
7. If the extension fails to resolve content, the affected buttons will behave like usually
8. If you have enabled "Hide muted", your muted and blocked accounts/instances will be fetched every 60 seconds in the background or when the settings are updated

## Todos / Planned features 
- Fix last remaining resolve fails as far as **possible**
- General performance and code improvements
- Update settings in content script instantly (so no page reload is needed)
- Improve 429 prevention and add resolving fallbacks
- Add support for other implementations (Plemora, GNU Social, ...)
- Find additional layouts/flavours to add identifiers for
- Support for profiles views with follow button disabled
- Implement caching where applicable to decrease required requests
- If I find myself to be bored, probably more

## Thanks to...
@raikasdev because I stole his fix for cross-browser storage API support  
@rosemarydotworld because I customized and use his awesome jQuery.DOMNodeAppear where MutationObservers and delegation failed
