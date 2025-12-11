var debug = false;
var setting, cache, api;

Neutralino.init();

Neutralino.events.on("windowClose", onWindowClose);

let tray = {
    icon: '/resources/icons/logo.png',
    menuItems: [

        { id: "open", text: "Open" },
        { id: "min", text: "Minimize" },
        { text: "-" },
        { id: "quit", text: "Quit" }
    ]
};
Neutralino.os.setTray(tray);


function onWindowClose() {

    if (typeof (setting) !== "undefined" && typeof (setting.min_tray) !== "undefined" && setting.min_tray == 1) {
        if (debug) console.log('minimize to tray', setting)
        Neutralino.window.hide();
        //Neutralino.window.minimize();
    }
    else {
        if (debug) console.log('exit app', setting)
        Neutralino.app.exit();
    }

}

//if(debug) console.log('port',NL_PORT,NL_TOKEN);

Neutralino.events.on("trayMenuItemClicked", onTrayMenuItemClicked);
function onTrayMenuItemClicked(event) {
    switch (event.detail.id) {
        case "open":
            Neutralino.window.show();
            break;
        case "min":
            Neutralino.window.minimize();

            break;
        case "startStop":
            // We need to trigger start/stop in index.js context.
            // Since main.js and index.js share window context (if main included there),
            // we can try to call global functions if valid.
            // But main.js runs on start.
            // Better to dispatch event or call function directly if available.

            // Check if startItem/stopItem exists (index.js loaded)
            if (window.activeItemId > 0 && typeof stopItem === 'function') {
                stopItem();
            } else if (typeof startItem === 'function') {
                startItem();
            }
            break;
        case "quit":
            Neutralino.app.exit();
            break;
    }
}

// Function to update tray based on state
window.updateTray = function (isRunning, title) {
    let items = [
        { id: "status", text: isRunning ? "Running: " + title : "Not Running", isDisabled: true },
        { id: "startStop", text: isRunning ? "Stop Timer" : "Start Timer" },
        { text: "-" },
        { id: "open", text: "Open" },
        { id: "min", text: "Minimize" },
        { text: "-" },
        { id: "quit", text: "Quit" }
    ];

    let tray = {
        icon: '/resources/icons/logo.png',
        menuItems: items
    };
    Neutralino.os.setTray(tray);
}

Neutralino.events.on("ready", function () {
    checkUpdate();
    // Init default tray
    window.updateTray(false, "");
});

/*
//prepare for extensions
Neutralino.events.on("createTimesheet", (evt) => {
    console.log(`Extension: ${evt.detail}`);
});
*/

async function loadSettings() {
    settingJSON = await Neutralino.storage.getData('setting');
    setting = JSON.parse(settingJSON)
    return setting;
}

async function init() {
    setting = await loadSettings();
    await initCache()


    if (setting.always_top == 1) Neutralino.window.setAlwaysOnTop(true);
    else Neutralino.window.setAlwaysOnTop(false);

    if (debug) console.log('inited', setting, cache)
}

function openHomepage() {
    Neutralino.os.open(setting.host);
}

function openLoadingDialog() {
    $('#loadingModal').modal('show');
    if (debug) console.log('openLoadingDialog');
}

function closeLoadingDialog() {

    $('#loadingModal').modal('hide');
    if (debug) console.log('closeLoadingDialog');
}

function openDetail() {
    Neutralino.app.open({
        "url": "file:///" + NL_CWD + "/resources/detail.html"
    });
}

async function checkUpdate(forceOpen = 0) {

    try {

        initUpdateBtn();
        if (localStorage.getItem("updateNotify") == "1" && forceOpen == 0) return false;

        let url = "https://raw.githubusercontent.com/trotelvonnebenan/TaxCareTrack/main/update/manifest.json";
        let manifest = await Neutralino.updater.checkForUpdates(url);

        if (manifest.version != NL_APPVERSION) {

            let button = await Neutralino.os.showMessageBox('New version',
                `New version of TaxCareTracker is available!

You are using ${NL_APPVERSION} and new version is ${manifest.version}.
Do you want to install update now?`,
                'YES_NO', 'QUESTION');


            localStorage.setItem("updateNotify", "1");
            initUpdateBtn();


            if (button == 'YES') {

                if (debug) console.log('installing update');
                openLoadingDialog();

                await Neutralino.updater.install();
                await Neutralino.app.restartProcess();
            }

        }
    }
    catch (error) {
        if (debug) console.log('update check failed', error);
        await Neutralino.os.showMessageBox('Update Check Failed',
            `Could not reach update server. \nIf you are using a Private GitHub repository, the app cannot access updates.\n\nError: ${JSON.stringify(error)}`,
            'OK', 'ERROR');
    }


}

function initUpdateBtn() {
    if (localStorage.getItem("updateNotify") == "1") {
        $('.updateBtn').removeClass('d-none');
        $('.update-dot').show();
    }
}