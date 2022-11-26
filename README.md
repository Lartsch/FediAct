# FediFollow (v0.6.0)
A Chrome/Firefox extension that simplifies following and post interactions on other Mastodon instances than your own by utilizing the Mastodon APIs and redirecting you toyour home instance. If enabled, the extension also automatically performs the desired action (follow, unfollow, boost, favourite) for you. If you are already following a user while viewing his profile on another instance, this is also shown.

Should work for all *updated* Chromium browsers, *updated* Firefox, as well as Kiwi browser and Firefox Nightly on Android. Currently only Mastodon 3 + 4 in different flavours are supported as far as I tested. Support for other Fediverse software and additional flavours might be added in the future. Feel free to create pull requests / issues. This is my first proper browser extension so please bear with my awful JS skills.

It can take up to 2 minutes after installation to start working (needs to get your API token). Performance of this addon depends on the performance of the external instance and your home instance.

**Important**: Your data will never leave your machine by using this addon. Also, no usage stats are collected.

  * [Installation](#installation)
  * [Setup](#setup)
  * [Screenshots / GIFs](#screenshots--gifs)
  * [Manual installation](#manual-installation)
      * [Install in Firefox for Android](#install-in-firefox-for-android)
  * [Additional notes](#additional-notes)
  * [Todos / Planned features](#todos--planned-features)

## Installation

[link-chrome]: https://chrome.google.com/webstore/detail/fedifollow/lmpcajpkjcclkjbliapfjfolocffednm 'Version published on Chrome Web Store'
[link-firefox]: https://addons.mozilla.org/en-US/firefox/addon/fedifollow/ 'Version published on Mozilla Add-ons'

[<img src="https://raw.githubusercontent.com/alrra/browser-logos/90fdf03c/src/chrome/chrome.svg" width="48" alt="Chrome" valign="middle">][link-chrome] [<img valign="middle" src="https://img.shields.io/chrome-web-store/v/lmpcajpkjcclkjbliapfjfolocffednm.svg?label=%20">][link-chrome] and other Chromium browsers

[<img src="https://raw.githubusercontent.com/alrra/browser-logos/90fdf03c/src/firefox/firefox.svg" width="48" alt="Firefox" valign="middle">][link-firefox] [<img valign="middle" src="https://img.shields.io/amo/v/fedifollow.svg?label=%20">][link-firefox] including Firefox for Android

> **Note**
> 
> - **If webstore release is outdated, use the [manual installation method](#manual-installation) to install the latest version**  
> - **Special installation steps for [Firefox on Android](#install-in-firefox-for-android)**

## Setup

- Required: Click the extension icon to set your Mastodon instance
  - Only set the domain name (like "infosec.exchange") without http/https or URL
- Optional: All other settings (they are self-explanatory)
- Required: Hit "Submit" to update your settings

**Please read the [additional notes](#additional-notes).**

## Screenshots / GIFs
Not guaranteed to be up to date ;)
<details>
  <summary>Extension popup / settings</summary>
  <img src="https://github.com/lartsch/FediFollow-Chrome/blob/main/img/screenshot1.PNG?raw=true">
</details>
<details>
  <summary>Follow interaction (GIF)</summary>
  <img src="https://github.com/lartsch/FediFollow-Chrome/blob/main/img/follow-interaction.gif?raw=true">
</details>
<details>
  <summary>Post interaction (GIF)</summary>
  <img src="https://github.com/lartsch/FediFollow-Chrome/blob/main/img/post-interaction.gif?raw=true">
</details>
<details>
  <summary>FediFollow installed in Kiwi browser (Android/Chromium)</summary>
  <img width=300 src="https://github.com/lartsch/FediFollow-Chrome/blob/main/img/fedifollow-android-chrome-kiwi-browser.jpg?raw=true">
</details>
<details>
  <summary>FediFollow installed in Firefox Nightly (Android)</summary>
  <img width=300 src="https://github.com/lartsch/FediFollow-Chrome/blob/main/img/fedifollow-android-firefox.jpg?raw=true">
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
  
I included all of the default add-ons in the custom collection, so you will not miss out on any of those. Of course, you can create [your own collection](https://support.mozilla.org/en-US/kb/how-use-collections-addonsmozillaorg) as well.

## Additional notes
1. Currently supports external Mastodon instances v3 + v4
    - I have not tested if Mastodon v3 works as home instance! In general, Mastodon v4 support is the main objective.
2. The whitelist mode can be useful if you do not want the extension to run basic checks on every site (since it needs to determine if it is a Mastodon site). Not sure if the blacklist feature is good for anything but I still included it.
3. It can have several reasons why a redirection/instance might not work:
    - You are not logged in to your home instance (can't fix, log in)
    - There are instances that use custom layouts/flavours (additional identifiers need to be added to extension)
    - Instance chose to hide the follow button when not logged in (not supported yet)
    - It's not a Mastodon instance (not supported yet)
    - Element identifiers might change over time (extension needs to be updated)
    - Your home instance is blocked by the external instance (can't fix, obviously)
4. There is a known bug that sometimes, when following a user and having auto-action enabled, the follow results in a follow request even though the account is unlocked (so it should instantly accept). I suppose this is a bug with Mastodon / network issue. The followed user will in fact receive the request. If you notice it, you can unfollow and follow again, this will work as usual.
5. There can be a short delay before you are redirected since an API call to the respective external instance must be made. In general, performance of this addon depends on the performance of the external instance and your home instance.
6. It can take 1-2 minutes after the installation to sync your API token and following list

So please be aware, that this extension can fail in some cases. Feel free to submit pull requests / issues.

## Todos / Planned features 
- Add support for post interactions (DONE)
- Support executing the intended action after redirect (DONE)
- Add support for other implementations (Plemora, GNU Social, ...)
- Publish to Chrome Webstore (DONE)
- Publish to Firefox addon store (DONE)
- Find additional layouts/flavours to add identifiers for
- Support for profiles views with follow button disabled
- Add support for Firefox (DONE)
- Add support for Firefox on Android (DONE)
- Fix some rare cases where an instance runs on a subdomain but the handle uses the domain without subdomain (need to get the handle directly from the profile instead of URL + domain name) (DONE)
- Add support for whitelist/blacklist (DONE)
- Add feature to indicate if you are already following a user when browsing his profile on another instance (this requires calls to the home instance, will look into it soon) (DONE)
- Indicate if post is already fav'ed / boosted
- Review if permissions in current manifest are actually needed like that (DONE)
- If I find myself to be bored, probably more

## Thanks to...
@raikasdev because I stole his fix for cross-browser storage API support
