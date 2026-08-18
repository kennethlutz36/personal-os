#!/bin/zsh
set -euo pipefail

APP_NAME="Personal OS Mac Bridge"
APP="$HOME/Applications/$APP_NAME.app"
TMP="$(mktemp -d)"
SRC="$TMP/PersonalOSMacBridge.swift"
BIN="$APP/Contents/MacOS/PersonalOSMacBridge"
SOURCE_URL="https://kennethlutz36.github.io/personal-os/mac-bridge/PersonalOSMacBridge.swift?v=1"

cleanup(){ rm -rf "$TMP"; }
trap cleanup EXIT

if ! command -v xcrun >/dev/null 2>&1; then
  echo "Apple Command Line Tools are required. macOS will offer to install them now."
  xcode-select --install || true
  echo "After installation finishes, run this installer again."
  read -k 1 "?Press any key to close…"
  exit 1
fi

mkdir -p "$HOME/Applications" "$APP/Contents/MacOS" "$APP/Contents/Resources"
echo "Downloading Personal OS Mac Bridge source…"
curl -fsSL "$SOURCE_URL" -o "$SRC"

echo "Building native macOS helper…"
xcrun swiftc -O -parse-as-library "$SRC" -o "$BIN" \
  -framework SwiftUI -framework AppKit -framework EventKit -framework Security

cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleExecutable</key><string>PersonalOSMacBridge</string>
  <key>CFBundleIdentifier</key><string>com.personal-os.mac-bridge</string>
  <key>CFBundleName</key><string>Personal OS Mac Bridge</string>
  <key>CFBundleDisplayName</key><string>Personal OS Mac Bridge</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>1.0.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSMinimumSystemVersion</key><string>14.0</string>
  <key>LSUIElement</key><true/>
  <key>NSCalendarsFullAccessUsageDescription</key><string>Personal OS reads the calendars already visible on this Mac so your Personal OS Calendar matches Apple Calendar.</string>
  <key>NSRemindersFullAccessUsageDescription</key><string>Personal OS reads scheduled reminders so they can appear alongside calendar events.</string>
  <key>NSAppleEventsUsageDescription</key><string>Personal OS can optionally use Apple Mail as a fallback for mailboxes that cannot be connected directly, such as a tenant-restricted work mailbox.</string>
</dict></plist>
PLIST

chmod +x "$BIN"
codesign --force --deep --sign - "$APP" >/dev/null 2>&1 || true
xattr -dr com.apple.quarantine "$APP" >/dev/null 2>&1 || true

echo "Installed: $APP"
echo "Opening Personal OS Mac Bridge…"
open "$APP"
echo ""
echo "Next: Personal OS → Calendar → Mac Bridge → Generate bridge key, then paste it into the helper's Settings."
read -k 1 "?Press any key to close…"
