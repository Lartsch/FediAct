# FediAct (v0.9.6)
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
  * [FAQ](#faq)
  * [Screenshots / GIFs](#screenshots--gifs)
  * [Manual installation](#manual-installation)
      * [Install in Firefox for Android](#install-in-firefox-for-android)
  * [Additional notes](#additional-notes)
  * [Todos / Planned features](#todos--planned-features)
  * [Contributing](#contributing)

## Installation

[link-chrome]: https://chrome.google.com/webstore/detail/fediact/lmpcajpkjcclkjbliapfjfolocffednm 'Version published on Chrome Web Store'
[link-firefox]: https://addons.mozilla.org/en-US/firefox/addon/fediact/ 'Version published on Mozilla Add-ons'

[<img src="https://raw.githubusercontent.com/alrra/browser-logos/90fdf03c/src/chrome/chrome.svg" width="48" alt="Chrome" valign="middle">][link-chrome] [<img valign="middle" src="https://img.shields.io/chrome-web-store/v/lmpcajpkjcclkjbliapfjfolocffednm.svg?label=%20">][link-chrome] + other Chromium browsers

[<img src="https://raw.githubusercontent.com/alrra/browser-logos/90fdf03c/src/firefox/firefox.svg" width="48" alt="Firefox" valign="middle">][link-firefox] [<img valign="middle" src="https://img.shields.io/amo/v/fediact.svg?label=%20%20">][link-firefox] including Firefox for Android

> **Note**
> 
> - **If webstore release is outdated, use the [manual installation method](#manual-installation) to install the latest version**  
> - **Special installation steps for [Firefox on Android](#install-in-firefox-for-android)**

If you like this addon, please consider donating: [paypal.me/lartsch](https://paypal.me/lartsch)

## Setup

1. Make sure you are logged in to your home instance
2. Click the extension icon or open its settings page
3. Set your home instance (required)
4. Check the other settings (optional)
5. Click the "Submit" button to save

If you have set your home instance correctly, you can now interact on other instances.

**Only redirect?**  
Simply turn off auto-action and leave redirect on - double click will then only redirect, not execute the action.

**"Hide muted" feature**  
If enabled, your muted/blocked users/instances are synced every minute, so changes may not be reflected instantly. Blocked/muted are treated the same: All boosts, toots and toots with mentions of them will be hidden. There can be edge cases where hiding might fail and also, this feature can decrease performance, so it is disabled by default.

## FAQ
**Why does it need permission for all websites?**

The addon needs to determine if the site you are currently browsing is a Mastodon instance or not. For that matter, it requires access to all sites. Otherwise, each existing Mastodon instance would have to be explicitly added.

**Can I use this on Android?**

Yes! There are three options that I am aware of: Kiwi Browser (Chromium with add-on support), Yandex Browser and Firefox Nightly (see [below](#install-in-firefox-for-android))

**Can I use this on iOS?**

As of now, this addon does not support Safari and I am not aware of any other browsers on iOS, that support extensions. So no, not at this time. PLEASE NOTE: Safari support will NOT happen unless somebody wants to pay the 99$ Apple wants per year for the [Developer Program membership](https://developer.apple.com/support/compare-memberships).

**Can you add feature XY?**

Feel free to create an issue here on Github and I will look into it.

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
- Firefox [**Nightly**](https://play.google.com/store/apps/details?id=org.mozilla.fenix) for Android  
  
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
1. Support for other Fedi software is planned
2. The whitelist mode can be useful if you do not want the extension to run basic checks on every site (since it needs to determine if its a Mastodon site). Not sure if blacklist is good for anything but I still included it.
3. It can have several reasons why resolving might not work:
    - Not logged in to your home instance
    - Element identifiers have changed / instance uses an unsupported flavour
    - The external instance you are browsing or the originating instance of a toot is not Mastodon
    - Your home instance has strong rate limiting
    - Your home instance / the external instance / the original instance of a toot have defederated / are moderated
    - The toot has not yet federated to your home instace (follow the account and toots should start federating)
    - The instance you are browsing does not use 302 redirects for external toots
    - Maybe it also plays a role if the toot is set to unlisted on its original instance
4. There can be delays since API calls have to be made and it is attempted to prevent error 429 (too many requests). Especially if a page has many toots or you are scrolling through a feed really fast.
5. If the extension fails to resolve content, the affected buttons will behave like usually (popup modal) and a notice ("Unresolved") is added to the toot
6. If you are logged in on another instance than your home instance, the addon will not process that site (so you can still use other instances where you have an account)

## Todos / Planned features 
- Replace implementations that require latest browser versions (to support older browsers)
- Support for Safari
- Update settings in content script without page reload
- Improve handling of irrelevant errors
- General performance and code improvements
- Improve 429 prevention and add resolving fallbacks
- Add support for other implementations (Plemora, GNU Social, ...)
- Find additional layouts/flavours to add identifiers for
- Support for profiles / card views with no follow button
- If I find myself to be bored, probably more

## Contributing
Feel free to create pull requests for whatever improvements you can make! :)

## Thanks to...
@raikasdev because I stole his fix for cross-browser storage API support  
@rosemarydotworld because I customized and use his awesome jQuery.DOMNodeAppear where MutationObservers and delegation failed
