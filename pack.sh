# RUN FROM MAIN DIR
# USE ./pack.sh <VERSION>

# remove all minified files (excluding lib folder) and zip files
find . -type d -name lib -prune -o -type f -name "*.min.js" -o -type f -name "*.min.css" -o -type f -name "*.zip" | grep -v "/lib" | tr '\n' '\0' | xargs -r0 rm
# minify all js files, excluding lib folder (and mangle toplevel without browser, chrome variable scopes)
find . -type d -name lib -prune -o -type f -name "*.js" -exec bash -c 'uglifyjs $1 --compress -m toplevel,reserved=["chrome","browser"] -o "$(echo $1 | rev | cut -f 2- -d '.' | rev).min.js"' _ {} \;
# minify all css files, excluding lib folder
find . -type d -name lib -prune -o -type f -name "*.css" -exec bash -c 'uglifycss $1 > "$(echo $1 | rev | cut -f 2- -d '.' | rev).min.css"' _ {} \;
# zip release files
zip -r "fediact-$1-chrome.zip" ./ -x "firefox/*" -x "img/*" -x ".git/*" -x "README.md" -x "NOTES.md" -x ".gitignore" -x "pack.sh" -x "LICENSE" -x "src/background.js" -x "src/inject.js" -x "src/popup.js" -x "src/nodeinserted.css" 1>/dev/null
cd firefox && zip -r "../fediact-$1-firefox.zip" ./ -x "src/background.js" -x "src/inject.js" -x "src/popup.js" -x "src/nodeinserted.css" 1>/dev/null
