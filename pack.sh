zip -r "fedifollow-$1-chrome.zip" ./ -x "firefox/*" -x "img/*" -x ".git/*" -x "README.md" -x ".gitignore" -x "pack.sh" -x "LICENSE" -x "*.zip"
cd firefox && zip -r "../fedifollow-$1-firefox.zip" ./