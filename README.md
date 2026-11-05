# Build_A_PC
Project 3 for CST438 Software Engineering

## How to Setup Expo for development

- In Android Studio SDK Manager
  - Install Android SDK Platform 36 (Android 16)
  - Install SDK Build-Tools
  - Install Android Emulator
  - Install Android SDK Platform-Tools (includes adb)
  - (note that many of these may already be installed)

- In Android Studio Device Manager
  - Create a newer Pixel Device (I am using Pixel 9)
  - Start the emulator (not connected to any app)

- From /client, run:

1. 
```bash
adb devices
npx expo run:android
```
(note that adb devices may not work first try, contact Austin for help if you have issues)
(i had to add 
```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
```
to ~/.zshrc or create (~/.config/zsh/conf.d/android-sdk.zsh and add it there)
)

2. run:
```bash
npx expo start --web
```

3. Using npx expo start will work once the other two have been run once

## How to Setup Spring Boot for development

- From /api
  - Run ./gradlew bootrun
  - Run curl -i http://localhost:8080/
  - (note that you have to build gradle first)
