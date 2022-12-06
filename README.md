# FediAct (v0.8.4)
A Chrome/Firefox extension that simplifies following and post interactions on other Mastodon instances than your own.

> **Note**
> Renamed from "FediFollow" to "FediAct" to prevent a naming issue with an existing Fedi account.

**Features**:
- Supports Mastodon v3 + v4
- Follow, boost, bookmark, reply and favourite on external instances (and vice-versa)
- Show following status and toot status (boosted, faved, bookmarked) on external instances
- Single click to execute action, double click to redirect to content on home instance (bookmark, favourite, boost)
- Reply button on external instances always redirects to home instance and enters reply-mode
- Customizable

**Supported browsers**:
- All up-to-date Chromium browsers, including Kiwi browser on Android
- Up-to-date Firefox, including Firefox Nightly on Android

**Important notes**:
- This is still a beta, there will be issues!
- All data is processed locally only
- Performance depends on the performance (and rate limiting) of your home instance (read more [below](#additional-notes))

## Navigation
  * [Installation](#installation)
  * [Setup](#setup)
  * [Known bugs](#known-bugs)
  * [Screenshots / GIFs](#screenshots--gifs)
  * [Manual installation](#manual-installation)
      * [Install in Firefox for Android](#install-in-firefox-for-android)
  * [Additional notes](#additional-notes)
  * [Todos / Planned features](#todos--planned-features)

## Installation

[link-chrome]: https://chrome.google.com/webstore/detail/fedifollow/lmpcajpkjcclkjbliapfjfolocffednm 'Version published on Chrome Web Store'
[link-firefox]: https://addons.mozilla.org/en-US/firefox/addon/fedifollow/ 'Version published on Mozilla Add-ons'

[<img src="https://raw.githubusercontent.com/alrra/browser-logos/90fdf03c/src/chrome/chrome.svg" width="48" alt="Chrome" valign="middle">][link-chrome] [<img valign="middle" src="https://img.shields.io/chrome-web-store/v/lmpcajpkjcclkjbliapfjfolocffednm.svg?label=%20">][link-chrome] and other Chromium browsers (v0.8.3 in review)

[<img src="https://raw.githubusercontent.com/alrra/browser-logos/90fdf03c/src/firefox/firefox.svg" width="48" alt="Firefox" valign="middle">][link-firefox] [<img valign="middle" src="https://img.shields.io/amo/v/fedifollow.svg?label=%20">][link-firefox] including Firefox for Android

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

## Known bugs
- Toot resolving does not work for some external instances - this is the same if you manually entered the toot URL in your home instance search and it wouldn't return a result (for ex. local toots on toot.site). Not sure if this can be fixed at all, as the official method for resolving by entering the URL in the search does not work either.
- In some rare cases, when the toot ID on an external instance is grabbed using a.status__relative-time element, it can happen that this is already the toot ID on the originating external instance and resolving on the home instance is therefore failing (will be fixed until 08/12/2022)
- Read the [additional notes](#additional-notes) for good-to-know behaviour that is not considered as bugs

## Screenshots / GIFs
<details>
  <summary>Extension popup / settings</summary>
  <img src="https://github.com/lartsch/FediFollow-Chrome/blob/main/img/settings.png?raw=true">
</details>
<details>
  <summary>Showcase</summary>
  <img src="https://github.com/lartsch/FediFollow-Chrome/blob/main/img/showcase.gif?raw=true">
</details>

## Manual installation
1. Download the [latest Github release](https://github.com/Lartsch/FediFollow-Chrome/releases/latest) for your browser (chrome or firefox)
### Chrome
2. Unzip the downloaded file somewhere
3. Go to your Chrome extension page (URL: chrome://extensions) and enable developer mode
4. Click the "Load unpacked" button and then select the unzipped folder (should be "fedifollow-X.X.X-chrome")
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
    - Name: FediFollow
5. Click OK, Firefox will close - reopen it
6. FediFollow will now be available in the Add-ons menu of Firefox Nightly

To update the addon instantly, simply remove and re-install it. Not sure when/if auto-update triggers in Firefox.
  
I included all of the default add-ons in the custom collection, so you will not miss out on any of those. Of course, you can create [your own collection](https://support.mozilla.org/en-US/kb/how-use-collections-addonsmozillaorg) as well.

## Additional notes
1. Currently supports external Mastodon instances v3 + v4
    - **I have not tested if Mastodon v3 works as home instance! In general, Mastodon v4 support is the main objective.**
    - Support for other Fedi software is still planned
2. The whitelist mode can be useful if you do not want the extension to run basic checks on every site (since it needs to determine if it is a Mastodon site). Not sure if the blacklist feature is good for anything but I still included it.
3. It can have several reasons why resolving/executing actions/redirection might not work:
    - You are not logged in to your home instance (can't fix, log in)
    - You are scrolling really fast and posts are not resolved instantly (a delay is implemented to prevent 429 API errors - wait shortly and try again)
    - There are instances that use custom layouts/flavours (additional identifiers need to be added to extension)
    - It's not a Mastodon instance (not supported yet)
    - Element identifiers might change over time (extension needs to be updated)
    - **Your home instance has strong rate limiting and blocks the API requests**
5. There can be a short delay before you are redirected since an API call to the respective external instance must be made. In general, performance of this addon depends on the performance of the external instance and your home instance.
6. If you only want redirects, simply turn off auto-action and leave redirect on - double click will then only redirect, not execute the action (alternatively, you can simply use the reply button, as it will always redirect to your home instance if redirects are enabled)
7. If the extension fails to resolve content, the affected buttons will behave like usually

## Todos / Planned features 
- Add support for replying
- Fix last remaining resolve fails - not sure yet what causes them, please report fails
- General performance and code improvements
- Add indicator for content that failed to resolve
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
