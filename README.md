# FediFollow
A Chrome/Firefox extension that simplifies following Mastodon users on other instances than your own by automatically redirecting you to your instance when pressing a follow button. The redirection is shortly indicated in the follow button itself and additional modals are blocked. Should work for other Chromium browsers too, as well as Kiwi browser on Android. It was tested with about 20 instances and supports different instance layouts/flavours.

I made this since I could only find a working extension for Firefox, that does the same (Simplified Federation).

## Installation
Right now, this needs to be installed in debugging / developer mode. Soon it will be available on Chrome Webstore / Firefox addon store.
1. Clone this repo or download it as ZIP (in this case, extract it somewhere)
### Chrome
2. Go to your Chrome extension page (URL: chrome://extensions) and enable developer mode
3. Click the "Load unpacked" button and then select the folder of the unpacked extension (should be "FediFollow-Chrome-main")
    + If you have a "Load ZIP" option you can also directly load the downloaded ZIP file
### Firefox
2. Open the debugging page (URL: about:debugging)
3. Select "This Firefox"
4. Click the "Load Temporary Add-on" button and then select the firefox.zip file in the folder you extracted earlier

## Setup
- Required: Click the extension icon to set your Mastodon instance
  - Only set the domain name (like "infosec.exchange") without http/https or URL)
- Optional: Change whether to redirect in current or new tab
- Optional: Change the mode (all sites except those on blacklist (default) / no sites but those on whitelist)
- Optional: Add domain names to the blacklist/whitelist textarea, one per line, for ex.
  ```
  mastodon.social
  bbq.snoot.com
  ```
- Required: Hit "Submit" to update your settings

> **Additional usage notes**
> 1. Currently supports different flavours of Mastodon 4
> 2. If the redirect is not working, you most likely are not logged in on your home instance
> 3. The whitelist mode can be useful if you do not want the extension to run basic checks on every site (since it needs to determine if it is a Mastodon site). Not sure if the blacklist feature is good for anything but I still included it.
> 4. It can have several reasons why a particular instance might not work:
>     - There are instances that use custom layouts/flavours (additional identifiers need to be added to extension)
>     - Instance chose to hide the follow button when not logged in (not supported yet)
>     - It's not a Mastodon instance (not supported yet)
>     - Element identifiers might change over time (extension needs to be updated)
>
> So please be aware, that this extension can fail in some cases. Feel free to submit pull requests / issues.

## Screenshots
![Extension Popup](https://github.com/lartsch/FediFollow-Chrome/blob/main/img/screenshot1.PNG?raw=true)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
![Redirect Indication](https://github.com/lartsch/FediFollow-Chrome/blob/main/img/screenshot2.PNG?raw=true)

## Todos / Planned features 
- Fix some rare cases where an instance runs on a subdomain but the handle uses the domain without subdomain (need to get the handle directly from the profile instead of URL)
- Add support for post interactions
- Add support for other implementations (Plemora, GNU Social, ...)
- Publish to Chrome Webstore (IN PROGRESS)
- Publish to Firefox addon store
- Find additional layouts/flavours to add identifiers for
- Support for profiles views with follow button disabled
- Add support for Firefox (DONE)
- Add support for whitelist/blacklist (DONE)
- Add feature to indicate if you are already following a user when browsing his profile on another instance (this requires calls to the home instance, will look into it soon)
- Review if permissions in current manifest are actually needed like that (DONE)
- If I find myself to be bored, probably more
