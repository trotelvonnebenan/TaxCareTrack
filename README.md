# TaxCareTrack (Custom CodeTimer)

A specialized desktop time tracking application integrated with Kimai, featuring a polished dark UI inspired by Toggl Track.

## Features

-   **Seamless Kimai Integration**: Connects directly to your Kimai instance via API.
-   **Dark Theme UI**: A beautiful, distraction-free dark interface.
-   **Smart Idle Detection**: Automatically detects when you are away and lets you decide whether to keep, discard, or split the time.
-   **Pomodoro Timer**: Built-in focus timer with configurable breaks.
-   **Smart Duration Input**: Type natural strings like `1.5h` or `45m` to set duration.
-   **Keyboard Shortcuts**:
    -   `Ctrl+S`: Start/Stop Timer
    -   `Ctrl+N`: New Manual Entry
    -   `Ctrl+R`: Sync/Reload
-   **Inline Management**: Select Projects, Activities, and Tags directly from the timer bar.
-   **Grouped List View**: View your time entries grouped by day.

## Setup

1.  Open the application.
2.  Click the **Settings** (cog) icon in the top right.
3.  Enter your **Kimai URL**, **Username**, and **API Token**.
4.  Click **Test** to verify.
5.  Click **Save**.

## Development & Build

This project is built with [Neutralinojs](https://neutralino.js.org/).

### Prerequisites
-   Node.js and npm installed.

### Build Commands

To build the executable for your platform:

1.  **Install/Update Binaries** (Run once):
    ```bash
    npx @neutralinojs/neu update
    ```

2.  **Build Application**:
    ```bash
    npx @neutralinojs/neu build
    ```

3.  **Locate Executable**:
    Executables will be generated in the `dist/CodeTimer` folder:
    -   Windows: `dist/CodeTimer/CodeTimer-win_x64.exe`
    -   Linux: `dist/CodeTimer/CodeTimer-linux_x64`
    -   macOS: `dist/CodeTimer/CodeTimer-mac_x64`

### Running Locally
To start the app in development mode:
```bash
npx @neutralinojs/neu run
```

## Release Process (Auto-Update)

To release a new version that your coworkers can automatically update to:

1.  **Update Version**:
    -   Open `neutralino.config.json` and bump `"version"` (e.g., `"1.0.1"`).
    -   Open `resources/setting.html` and update the version in the footer.

2.  **Build Application**:
    ```bash
    npx @neutralinojs/neu build
    ```

3.  **Commit and Push**:
    Commit your changes and push to GitHub.

4.  **Create GitHub Release**:
    -   Go to your GitHub repo -> Releases -> Draft a new release.
    -   Tag version: `v1.0.1` (Must match the version in config).
    -   Title: `v1.0.0`.
    -   **Important**: Upload the following files to the release assets:
        -   `dist/TaxCareTracker/resources.neu` (Required for auto-update)
        -   `dist/TaxCareTracker/CodeTimer-win_x64.exe` (Required for new users/coworkers)
    -   Publish release.

5.  **Update Manifest**:
    -   Edit `update/manifest.json` in your project.
    -   Update `"version"` to `"1.0.1"`.
    -   Update `"resourcesURL"` to `https://github.com/trotelvonnebenan/TaxCareTrack/releases/download/v1.0.1/resources.neu`.
    -   Commit and push this change to `main`.
    -   **Note**: If your repository is **Private**, the app cannot read this file safely. You must host the `manifest.json` on a public URL (like a GitHub Gist) and update `main.js` to point to that Gist URL.

6.  **Done**:
    -   Coworkers can download the `.exe` to install.
    -   Existing apps will check `manifest.json` and download `resources.neu` automatically (if manifest is accessible).
