# Personal OS Mac Bridge

The Mac Bridge makes the Personal OS Calendar mirror the calendars already visible to Apple Calendar on a Mac.

It uses Apple's EventKit framework and requests full Calendar and Reminders access. Personal OS only syncs the resulting events into the owner's private Personal OS database; it does not edit Apple Calendar or Reminders.

## Install

Open Terminal on the Mac and run:

```zsh
curl -fsSL https://kennethlutz36.github.io/personal-os/mac-bridge/build.command | zsh
```

This builds the helper locally with Apple's Swift compiler, installs it to `~/Applications/Personal OS Mac Bridge.app`, ad-hoc signs the local build, and opens it.

If macOS asks for Command Line Tools, allow them to install, then run the command again.

## Connect

1. Open Personal OS → Calendar → **Mac Bridge**.
2. Click **Generate bridge key** and copy the one-time key.
3. Open the menu-bar app → **Settings…**.
4. Paste the bridge key and click **Save Settings**.
5. Click **Grant Calendar + Reminders Access** and allow both permissions.
6. Click **Sync Apple Calendar Now** once.

After setup, the bridge listens for EventKit changes and automatically syncs Calendar/Reminders while it is running. Personal OS also has a **Refresh Apple Calendar** button that queues a sync request to the Mac helper.

## Three Rivers Mail fallback

The direct cloud integrations remain preferred for Gmail and Hostinger mailboxes. The bridge can optionally read a configured Apple Mail mailbox as a fallback for an account that cannot authorize a direct cloud integration. The default fallback address is `kenneth.lutz@threeriversdx.com` because its Microsoft tenant currently blocks third-party Outlook authorization.

When Mail fallback is enabled, macOS will request Automation permission for the helper to control Mail. The helper syncs recent inbox messages and polls Personal OS for queued reply/trash actions.

The bridge key is stored in the macOS Keychain.