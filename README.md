# FediFollow-Chrome
A Chrome extension that simplifies following Fediverse users on other instances than your own by automatically redirecting you to your instance when pressing a follow button. Should work for other Chromium browsers too, as well as Kiwi browser on Android. It was tested with about 20 instances and supports different instance layouts/designs.

I made this since I could only find a working extension for Firefox, that does the same (Simplified Federation).

## Installation
Right now, you need to install it using developer mode. I plan to put this in the Chrome Webstore soon, though.
1. Download this repository as ZIP or the current release ZIP file and extract it somewhere.
2. Go to your Chrome extension page and enable developer mode.
3. Click the "Load unpacked" button and then select the folder of the unpacked extension (should be "FediFollow-Chrome-main").
    + If you have a "Load ZIP" option you can also directly load the downloaded zip file

> :warning: For reasons unknown to me, Edge showed weird errors after importing clicking the "issues" link, but the errors made no sense and the extension still worked fine.

## Setup
- Click the extension icon to set your Mastadon instance (like "infosec.exchange").

When visiting a user profile on other Mastodon instances, the follow button will now redirect you to your home instance. The redirection is shortly indicated in the follow button itself. Info modals are blocked because they are not needed due to redirection.



## Todos
- Update to manifest v3
- Review if permissions in current manifest are actually needed like that
- If I find myself to be bored, probably more
