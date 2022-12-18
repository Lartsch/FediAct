# FediAct (v0.9.7)
A Chrome/Firefox extension that simplifies follow and post interactions on Mastodon instances other than your own.

**Features**:
- Supports Mastodon v3 + v4
- Follow, boost, bookmark, reply, favourite and vote polls on external instances while only being logged in to your home instance
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
- Some toots cannot be resolved to your home (in cases where searching for the post manually would not work either)

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
4. Check out the other settings (optional)
5. Click the "Submit" button to save

If you have set your home instance correctly, you can now interact on other Mastodon instances.

### Options explained

**Redirect settings**

- Enable (default: on): Set if redirects (when replying or double-clicking) should be performed at all
- Prompt (default: off): Set if a prompt should be displayed before redirecting, including the URL
- Open in (default: same tab): Set if redirects should happen in the same or a new tab

**Other**

- Actions (default: on): Set if actions (following, boosting, etc.) should be performed when clicking or double clicking - _**Usage tip:** Disable this if you only want redirects on double click or when replying without automatically performing the action_
- Hide muted/blocked (default: off): If enabled, your blocked/muted users/instances will be synched every 60 seconds and all matching toots, boosts and toots with mentions will be hidden - _**Note:** There are cases where hiding can fail and this is disabled by default because it can decrease performance_
- API delay (default: on): If enabled, there can only be one API request to your home instance per 500ms - _**Note:** Disabling this will likely result in the extension not working because your home instance uses rate limiting if too many requests come from your IP. 500ms has proven to prevent error 429 for the instances I have tested_

**Mode**
- Run if logged in (default: off): Enable FediAct on external instances if you are logged in there as well
- Blacklist (default) / Whitelist: Run the extension on _all_ domains except those on the blacklist / Run the extension on _no_ domains except those on the whitelist

## FAQ
**Why does it need permission for all websites?**

The addon needs to determine whether or not the site you are currently browsing is a Mastodon instance. For that to work, it requires access to all sites. Otherwise, each existing Mastodon instance would have to be explicitly added.

**Can I use this on Android?**

Yes! There are three options that I am aware of: Kiwi Browser (Chromium with add-on support), Yandex Browser and Firefox Nightly (see [below](#install-in-firefox-for-android))

**Can I use this on iOS?**

As of now, this addon does not support Safari and I am not aware of any other browsers on iOS, that support extensions. So, no, not at this time. PLEASE NOTE: Safari support will not happen at this time since Apple wants 99$ per year for the [Developer Program membership](https://developer.apple.com/support/compare-memberships), which is a requirement.

**Can you add feature XY?**

Feel free to create an issue here on GitHub and I will look into it.

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
1. Download the [latest GitHub release](https://github.com/Lartsch/FediAct/releases/latest) for your browser (Chrome or Firefox)
### Chrome
2. Unzip the downloaded file somewhere
3. Go to your Chrome extension page (URL: chrome://extensions) and enable developer mode
4. Click the "Load unpacked" button and then select the unzipped folder

Note: Some Chromium browsers allow you to directly load a .zip file - you can use it if available

### Firefox
2. Open the debugging page (URL: about:debugging)
3. Select "This Firefox"
4. Click the "Load Temporary Add-on" button and then select the downloaded Firefox ZIP file

### Install in Firefox for Android
For a while now, Firefox on Android has only allowed installing from a [curated list](https://addons.mozilla.org/en-US/android/search/?promoted=recommended&sort=random&type=extension) of addons, preventing installation of anything else. The following instructions will guide you through installing it from the webstore anyway.

**Requirements:**  
- Firefox [**Nightly**](https://play.google.com/store/apps/details?id=org.mozilla.fenix) for Android  
  
**Steps:**  
1. In Firefox, go to Settings > About Firefox Nightly
2. Click the Firefox logo 5 times to enable Developer options
3. Go back to Settings > Custom Add-on Collection
4. Enter the following data:
    - ID: 17665294
    - Name: FediAct
5. Click OK, Firefox will close - reopen it
6. FediAct will now be available in the Add-ons menu of Firefox Nightly

To update the addon instantly, simply remove and re-install it. I don't know if or when auto-update triggers in Firefox.
  
I included all of the default add-ons in the custom collection, so you will not miss out on any of those. Of course, you can create [your own collection](https://support.mozilla.org/en-US/kb/how-use-collections-addonsmozillaorg) as well.

## Additional notes
1. Support for other Fedi software is planned
2. There are several reasons why resolving/interacting might not work including:
    - Not being logged in to your home instance
    - Element identifiers have changed / the instance uses an unsupported flavour
    - The external instance you are browsing or the originating instance of a toot is not Mastodon
    - Your home instance has strong rate limiting and limited your IP
    - Your home instance / the external instance / the original instance of a toot have defederated / are moderated
    - The toot has not yet federated to your home instace (follow the account and toots should start federating)
    - The instance you are browsing does not use 302 redirects for external toots
    - The network conditions of your home instance or the external instance are bad (slow speed)
    - That a toot is set to unlisted on its original instance may play a role
3. There can be delays because API calls have to be made and it is tries to avoid error 429 (too many requests). Especially if a page has many toots or you are scrolling through a feed really fast.
4. If the extension fails to resolve content, the affected buttons will behave as if the extension weren't active (popup modal) and a notice ("Unresolved") is added to the toot

## Todos / Planned features 
Check out the [GitHub project](https://github.com/users/Lartsch/projects/2) to see planned features and todos. They are sorted from most important to least important.

## Contributing
Feel free to create [issues](https://github.com/Lartsch/FediAct/issues) for bugs and feature suggestions. Even better: Create pull requests for whatever improvements you can make! :)

## Thanks to...
@raikasdev because I stole his fix for cross-browser storage API support  
@rosemarydotworld because I customized and use his awesome jQuery.DOMNodeAppear where MutationObservers and delegation failed
