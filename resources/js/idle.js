class IdleService {
    constructor() {
        this.interval = null;
        this.isIdle = false;
        this.idleStartTime = null;
    }

    start() {
        if (this.interval) clearInterval(this.interval);
        // Check every minute
        this.interval = setInterval(() => this.checkIdle(), 60000);
    }

    stop() {
        if (this.interval) clearInterval(this.interval);
    }

    async checkIdle() {
        if (!setting || setting.idle_detection != 1) return;

        let idleTimeMs = await this.getIdleTime();
        let timeoutMs = (setting.idle_timeout || 5) * 60 * 1000;

        if (debug) console.log(`Idle check: ${idleTimeMs}ms / ${timeoutMs}ms`);

        if (idleTimeMs > timeoutMs) {
            if (!this.isIdle) {
                // Entering idle state
                this.isIdle = true;
                // Calculate roughly when idle started
                this.idleStartTime = moment().subtract(idleTimeMs, 'milliseconds');

                // If timer is running, pause it (visually) and show dialog
                if (typeof activeItemId !== 'undefined' && activeItemId > 0) {
                    onIdleDetected(this.idleStartTime); // Defined in index.js
                }
            }
        } else {
            if (this.isIdle) {
                // Recovering from idle state happens via user interaction with the modal
                this.isIdle = false;
            }
        }
    }

    async getIdleTime() {
        let cmd = '';
        if (NL_OS == 'Windows') {
            cmd = 'powershell "Add-Type @\'
            using System;
            using System.Runtime.InteropServices;
            using System.ComponentModel;
            public class User {
                [DllImport(\"User32.dll\")]
                public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);
            }
            public struct LASTINPUTINFO {
                public uint cbSize;
                public uint dwTime;
}
\'@;
$lii = New - Object LASTINPUTINFO;
$lii.cbSize = [System.Runtime.InteropServices.Marshal]:: SizeOf($lii);
[User]:: GetLastInputInfo([ref]$lii);
[Environment]:: TickCount - $lii.dwTime"';
        } else if (NL_OS == 'Linux') {
    // Try xprintidle first
    cmd = 'xprintidle';
} else if (NL_OS == 'Darwin') {
    cmd = 'ioreg -c IOHIDSystem | awk \'/HIDIdleTime/ {print int($NF/1000000); exit}\'';
}

try {
    let output = await Neutralino.os.execCommand(cmd);
    if (output && output.stdOut) {
        return parseInt(output.stdOut.trim());
    }
} catch (e) {
    console.error("Idle check failed:", e);
}
return 0;
    }
}

var idleService = new IdleService();
