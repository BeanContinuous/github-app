#!/bin/bash
open -a "Safari" app.html
handle_mac_os() {
  osascript -e '
      tell application "Safari"
          activate
          -- append app name
          set updateAppName to "var jsonObject = JSON.parse(document.getElementById('"'manifest'"').value); jsonObject.name = '"'$3'"'; document.getElementById('"'manifest'"').value = JSON.stringify(jsonObject);"
          do JavaScript updateAppName in current tab of first window
      end tell
      tell application "Safari"
          activate
          delay 2
          set theScript to "document.getElementById('"'myForm'"').submit();"
          -- set theScript to "document.getElementById('"'submitManifest'"').click();"
          do JavaScript theScript in current tab of first window
          delay 2
      end tell
      tell application "Safari"
          set inputUserName to "document.querySelector('"'#login_field'"').value = '"'$1'"';"
          set inputPassword to "document.querySelector('"'#password'"').value = '"'$2'"';"
          set inputSudoPassword to "document.querySelector('"'#sudo_password'"').value = '"'$2'"';"
          do JavaScript inputUserName in current tab of first window
          do JavaScript inputPassword in current tab of first window
          delay 2
          set login to "document.querySelector('"'#login > div.auth-form-body.mt-3 > form > div > input.btn.btn-primary.btn-block.js-sign-in-button'"').click();"
          do JavaScript login in current tab of first window
                  -- TODO check if need to login
          delay 2
          do JavaScript inputSudoPassword in current tab of first window -- when sudo password is required
          set sudoLogin to "document.querySelector('"'#sudo > sudo-credential-options > div:nth-child(4) > form > div > div > button'"').click();"
          do JavaScript sudoLogin in current tab of first window
          delay 2
      end tell

      tell application "Safari"
          set createGithubApp to "document.querySelector('"'#new_integration_manifest > input.btn.btn-primary.btn-block'"').click();"
          do JavaScript createGithubApp in current tab of first window
          delay 2
      end tell

      tell application "Safari"
          set existAppText to "document.getElementsByClassName('"'error'"')[0].textContent"
          set isAppExisted to (do JavaScript existAppText in current tab of first window)
          try
              if isAppExisted is not "" then
                  log("App is existed")
                  close every window
              end if
          on error errText
               log "The app name is available"
          end try
      end tell

      tell application "Safari"
          set redirectURL to "function myValue() {var urlString = window.location.href; var regex = /[?&]code=([^&]+)/; var match = urlString.match(regex); if (match) {return match[1];}} myValue();"
          set code to do JavaScript redirectURL in current tab of first window
          try
              set curlCommand to "curl -L -X POST -H '"'Accept: application/vnd.github+json'"' -H '"'X-GitHub-Api-Version: 2022-11-28'"' https://api.github.com/app-manifests/" & code & "/conversions"
              set curlResult to do shell script curlCommand

          on error errText
              log "An error occurred: " & errText & ""
              tell application "Safari"
                  -- close every window
              end tell
          end try
      end tell
  '
}

unameOut="$(uname -s)"
case "${unameOut}" in
    Linux*)     machine=Linux;;
    Darwin*)    machine=Mac;;
    CYGWIN*)    machine=Cygwin;;
    MINGW*)     machine=MinGw;;
    *)          machine="UNKNOWN:${unameOut}"
esac
message="Executing ${machine} commands"
case $machine in
    "Mac")
        echo $message
        handle_mac_os $1 $2 $3
        ;;
    "Linux")
        echo $message
        ;;
    *)
        echo "Unsupported ${machine} OS"
        ;;
esac