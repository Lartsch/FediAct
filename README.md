# FediFollow (Beta v0.5.2)
A Chrome/Firefox extension that simplifies following and post interactions on other Mastodon instances than your own by intelligently redirecting you to your instance and utilizing the local API to resolve the content. If enabled, the extension automatically performs the desired action (follow, boost, favourite for now).

Should work for all updated Chromium browsers, updated Firefox, as well as Kiwi browser on Android. Currently only Mastodon 3 + 4 in different flavours are supported as far as I tested. Support for other Fediverse software and additional flavours might be added in the future. Feel free to create pull requests / issues. This is my first proper browser extension so please bear with my awful JS skills.

**Important**: Your data will never leave your machine by using this addon. Also, no usage stats are collected.

  * [Installation](#installation)
  * [Setup](#setup)
  * [Screenshots / GIFs](#screenshots--gifs)
  * [Manual installation](#manual-installation)
  * [Additional notes](#additional-notes)
  * [How it works](#how-it-works)
  * [Todos / Planned features](#todos--planned-features)

## Installation

[link-chrome]: https://chrome.google.com/webstore/detail/fedifollow/lmpcajpkjcclkjbliapfjfolocffednm 'Version published on Chrome Web Store'
[link-firefox]: https://addons.mozilla.org/en-US/firefox/addon/fedifollow/ 'Version published on Mozilla Add-ons'

[<img src="https://raw.githubusercontent.com/alrra/browser-logos/90fdf03c/src/chrome/chrome.svg" width="48" alt="Chrome" valign="middle">][link-chrome] [<img valign="middle" src="https://img.shields.io/chrome-web-store/v/lmpcajpkjcclkjbliapfjfolocffednm.svg?label=%20">][link-chrome] and other Chromium browsers (OUTDATED, v0.5.0 currently in review)

[<img src="https://raw.githubusercontent.com/alrra/browser-logos/90fdf03c/src/firefox/firefox.svg" width="48" alt="Firefox" valign="middle">][link-firefox] [<img valign="middle" src="https://img.shields.io/amo/v/fedifollow.svg?label=%20">][link-firefox] (soon including Firefox Android)

> **Note**
> 
> **If the webstore releases are outdated, you can use the [manual installation method](#manual-installation) to install the latest version**

## Setup

- Required: Click the extension icon to set your Mastodon instance
  - Only set the domain name (like "infosec.exchange") without http/https or URL)
- Optional: Change whether to redirect in current or new tab (**for new tab you might need to allow popups if your browser asks for it**)
- Optional: Change the mode (all sites except those on blacklist (default) / no sites but those on whitelist)
- Optional: Add domain names to the blacklist/whitelist textarea, one per line, for ex.
  ```
  mastodon.social
  bbq.snoot.com
  ```
- Required: Hit "Submit" to update your settings

**Please read the [additional notes](#additional-notes).**

## Screenshots / GIFs
![Extension Popup](https://github.com/lartsch/FediFollow-Chrome/blob/main/img/screenshot1.PNG?raw=true)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
![Follow Redirect](https://github.com/lartsch/FediFollow-Chrome/blob/main/img/follow-interaction.gif?raw=true)
![Follow Redirect](https://github.com/lartsch/FediFollow-Chrome/blob/main/img/post-interaction.gif?raw=true)

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

So please be aware, that this extension can fail in some cases. Feel free to submit pull requests / issues.

## How it works
Some basic explanations how the addon works...
### General
- Addon performs basic checks on the URL and site content to determine if and what scripts to run
- On external instances, depending on the interaction, a search string is built for the content you wish to interact with
- You are then redirected to your local instance with the search string as value for an URL parameter that the addon checks for
- If the home instance is opened with this parameter...
    - Your authorization token is extracted from the DOM
    - Then the parameter value is used to perform a search for it with the search API endpoint (with resolving, so auth is needed)
    - If a match for a user or post was found
        - If enabled, the desired action is executed by using the Mastodon API (follow, fav, boost)
        - You are redirected to the requested content
    - Using the search API gives best compatibility for resolving content (for ex. Toot IDs differ on instances for the same toot)
### Follow interactions
- Addon uses a list of DOM identifiers of follow buttons (for different views / flavors)
- All default actions for clicking the button are prevented
- Addon extracts the handle and handle domain from the profile view
- The handle domain is then searched for with the external instance's search API endpoint (without resolving, so no authorization needed)
    - This is to ensure we grab the correct instance URL for this user, since it can differ from the domain handle (also, the domain handle does not always resolve)
- If all worked out, we build our search string and redirect to your home instance with the value as URL parameter then continue as explained in "General"
### Post interactions
- Addon uses a list of allowed URLs and DOM identifiers for interaction buttons
- It then grabs the Toot ID using different methods, depending on the Mastodon version / flavor
- The Toot ID is then searched for using the external instance's status API
    - This gives us the actual URL of the post on its home instance for using as the search string (even if the post is from another external instance than the external instance it is viewed on)
- If all worked out, we build our search string and redirect to your home instance with the value as URL parameter then continue as explained in "General"

## Todos / Planned features 
- Add support for post interactions (DONE)
- Support executing the intended action after redirect (DONE)
- Add support for other implementations (Plemora, GNU Social, ...)
- Publish to Chrome Webstore (IN PROGRESS)
- Publish to Firefox addon store (IN PROGRESS)
- Find additional layouts/flavours to add identifiers for
- Support for profiles views with follow button disabled
- Add support for Firefox (DONE)
- Fix some rare cases where an instance runs on a subdomain but the handle uses the domain without subdomain (need to get the handle directly from the profile instead of URL + domain name) (DONE)
- Add support for whitelist/blacklist (DONE)
- Add feature to indicate if you are already following a user when browsing his profile on another instance (this requires calls to the home instance, will look into it soon)
- Review if permissions in current manifest are actually needed like that (DONE)
- If I find myself to be bored, probably more

## Thanks to...
@raikasdev because I stole his fix for cross-browser storage API support
