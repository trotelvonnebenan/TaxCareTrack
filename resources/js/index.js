var activeItemId = 0;
var selectedProjectId = null;
var selectedActivityId = null;
var selectedTagIds = [];
var isBillable = false;

init().then(() => {
    api = new API();
    if (debug) console.log('starting load elements')
})
    .then(() => {
        loadItems();
        loadActive();

        // Init Sounds
        window.audioStart = new Audio('audio/start.wav');
        window.audioEnd = new Audio('audio/end.wav');
        window.audioTick = new Audio('audio/tick.wav'); // Optional for seconds? Might be annoying.

        // Initialize search listeners
        $('#projectSearch').on('keyup', function () {
            renderProjectList($(this).val());
        });
        $('#activitySearch').on('keyup', function () {
            renderActivityList($(this).val());
        });
        $('#tagSearch').on('keyup', function () {
            renderTagList($(this).val());
        });

        // Keyboard Shortcuts
        $(document).on('keydown', function (e) {
            // Ctrl+S or Cmd+S to Start/Stop
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (activeItemId > 0) {
                    stopItem();
                } else {
                    startItem();
                }
            }

            // Ctrl+N or Cmd+N for New Entry (redirect to detail)
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                window.location.href = '/detail.html';
            }

            // Ctrl+R or Cmd+R to Sync/Reload (already handled by browser usually, but let's map to our loadItems)
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
                loadItems();
                loadActive();
            }

            // Esc to close modals
            if (e.key === 'Escape') {
                $('.modal').modal('hide');
            }
        });
    })

async function loadItems() {
    api.makeAPICallAsync("get", "/api/timesheets?active=0").then((items) => {
        if (debug) console.log('items', items)
        renderTimesheet(items)
    });
}

async function loadActive() {
    api.makeAPICallAsync("get", "/api/timesheets/active").then((activeItemArr) => {
        if (debug) console.log('active', activeItemArr)
        if (activeItemArr.length) {
            activeItemId = activeItemArr[0].id;
            renderActive(activeItemArr[0]);
        }
        else {
            renderInactive();
        }
    });
}

var timerDuration;
async function renderActive(item) {
    $('#desc').val(item.description);
    $('.start-btn').addClass('d-none');
    $('.stop-btn').removeClass('d-none');

    // Update project button and global state
    if (item.project && cache._parseProjects[item.project]) {
        selectedProjectId = item.project;
        updateProjectButton(item.project);
    } else {
        selectedProjectId = null;
        resetProjectButton();
    }

    // Update activity button and global state
    if (item.activity && cache._parseActivities[item.activity]) {
        selectedActivityId = item.activity;
        updateActivityButton(item.activity);
    } else {
        selectedActivityId = null;
        resetActivityButton();
    }

    // Update tags global state
    if (item.tags && Array.isArray(item.tags)) {
        selectedTagIds = item.tags.map(t => t.id || t); // Handle object or ID array
        updateTagButton(selectedTagIds.length);
    } else {
        selectedTagIds = [];
        updateTagButton(0);
    }

    // Update billable status
    isBillable = item.billable;
    updateBillableButton();

    $('#desc').addClass('active');
    // Allow clicking description to go to detail view
    $('#desc').off('click').on('click', function () {
        window.location.href = '/detail.html?timesheet=' + item.id + '&active=1';
    });

    clearInterval(timerDuration);
    var totalSec = (moment().format('X') - moment(item.begin).format('X'));
    timerDuration = setInterval(function () {
        totalSec += 1
        stringDuration = formatDuration(totalSec)
        $('.stop-time').text(stringDuration);
        document.title = stringDuration + " - CodeTimer";
    }, 1000);
}

async function startItem() {
    var desc = $('#desc').val();

    var data = {};
    data.begin = moment().format();
    data.description = desc;
    data.billable = isBillable;

    if (selectedProjectId) {
        data.project = selectedProjectId;
    }

    if (selectedActivityId) {
        data.activity = selectedActivityId;
    }

    if (selectedTagIds.length > 0) {
        data.tags = selectedTagIds.join(',');
    }

    if (!selectedProjectId) {
        openProjectSelector();
        return;
    }

    if (!selectedActivityId) {
        openActivitySelector();
        return;
    }

    await api.makeAPICallAsync("post", "/api/timesheets", data).then((resp) => {
        if (resp.id) {
            activeItemId = resp.id;
            renderActive(resp);
            loadItems();
            if (window.audioStart) window.audioStart.play().catch(e => console.log(e));
        } else {
            alert("Failed to start timer. Please check your selection.");
        }
    });
}

async function stopItem() {
    if (activeItemId > 0) {
        await api.makeAPICallAsync("patch", "/api/timesheets/" + activeItemId + "/stop")
        renderInactive();
        clearInterval(timerDuration);
        document.title = "TaxCareTracker";
        if (window.audioEnd) window.audioEnd.play().catch(e => console.log(e));
        await loadItems()
    }
}

async function repeatItem(itemId) {
    var data = {};
    data.copy = "all";
    data.begin = moment().format(); // Fix time drift by enforcing client start time

    await api.makeAPICallAsync("patch", "/api/timesheets/" + itemId + "/restart", data).then((item) => {
        if (item.id) {
            if (debug) console.log('repeatItem', item);
            activeItemId = item.id;
            renderActive(item);
            window.scrollTo(0, 0);
        }
    });
}

function renderInactive() {
    activeItemId = 0;
    $('#desc').val('');
    $('.start-btn').removeClass('d-none');
    $('.stop-btn').addClass('d-none');
    $('.stop-time').text('00:00:00');

    if (timerDuration) clearInterval(timerDuration);

    resetProjectButton();
    resetActivityButton();
    selectedProjectId = null;
    selectedActivityId = null;
    selectedTagIds = [];
    isBillable = false;
    updateBillableButton();

    $('#desc').removeClass('active');
    $('#desc').off('click');
    document.title = "CodeTimer";

    // Update Tray
    if (typeof window.updateTray === 'function') {
        window.updateTray(false, "");
    }
}

function updateProjectButton(projectId) {
    if (cache._parseProjects[projectId]) {
        var p = cache._parseProjects[projectId];
        $('.project-select-btn').html(`<i class="fas fa-folder" style="color: ${p.color}"></i> ${p.name}`);
        $('.project-select-btn').css('color', '#fff');
    }
}

function resetProjectButton() {
    $('.project-select-btn').html(`<i class="fas fa-folder-plus"></i> Project`);
    $('.project-select-btn').css('color', 'var(--toggl-purple)');
}

function updateActivityButton(activityId) {
    if (cache._parseActivities[activityId]) {
        var a = cache._parseActivities[activityId];
        $('.activity-select-btn').html(`<i class="fas fa-tasks"></i> ${a.name}`);
        $('.activity-select-btn').css('color', '#fff');
    }
}

function resetActivityButton() {
    $('.activity-select-btn').html(`<i class="fas fa-tasks"></i> Activity`);
    $('.activity-select-btn').css('color', 'var(--toggl-purple)');
}

function toggleBillable() {
    isBillable = !isBillable;
    updateBillableButton();
}

function updateBillableButton() {
    if (isBillable) {
        $('.billable-btn').addClass('active');
    } else {
        $('.billable-btn').removeClass('active');
    }
}

function switchTab(tabName) {
    $('.nav-link').removeClass('active');
    $(`.nav-link[onclick="switchTab('${tabName}')"]`).addClass('active');

    $('#listView, #pomodoroView, #calendarView').addClass('d-none');

    if (tabName === 'list') {
        $('#listView').removeClass('d-none');
        $('.today-total-container').removeClass('d-none');
    } else if (tabName === 'pomodoro') {
        $('#pomodoroView').removeClass('d-none');
        $('.today-total-container').addClass('d-none');
    } else if (tabName === 'calendar') {
        $('#calendarView').removeClass('d-none');
        $('.today-total-container').addClass('d-none');
    }
}

async function renderTimesheet(data) {
    var items = data;
    var list = {};
    var todayTotal = 0;
    var todayStr = moment().format('ddd, D MMM');

    if (items.length) {
        items.forEach(function (item, key) {
            var date = new Date(item.end)
            var d = date.getDate();
            var m = date.getMonth() + 1;
            var y = date.getFullYear();

            var itemData = item;
            var dateFormatted = moment(item.end).format('ddd, D MMM');
            if (typeof (list[dateFormatted]) === "undefined") list[dateFormatted] = [];
            list[dateFormatted].push(itemData);

            // Calculate Today Total
            if (dateFormatted === todayStr) {
                todayTotal += item.duration;
            }
        });

        $('#todayTotal').text(formatDuration(todayTotal));

        var htmlData = ``;
        for (item of Object.entries(list)) {

            var htmlDataItems = '';
            var totalDayTime = 0;

            if (item.length) {
                item[1].forEach(function (listItem, listItemKey) {
                    desc = listItem.description;
                    if (desc == null) desc = '<span class="text-secondary fst-italic">(No description)</span>';

                    totalDayTime += listItem.duration;
                    var durationTime = formatDuration(listItem.duration)

                    var projectName = 'No Project';
                    var projectColor = 'var(--text-secondary)';

                    if (listItem.project && cache._parseProjects[listItem.project]) {
                        projectName = cache._parseProjects[listItem.project].name;
                        projectColor = cache._parseProjects[listItem.project].color;
                    }

                    var billableIcon = listItem.billable ? '<i class="fas fa-dollar-sign text-success ms-2" style="font-size: 10px;"></i>' : '';

                    htmlDataItems += `
                        <div class="time-entry">
                            <div class="entry-desc" onclick="window.location.href='/detail.html?timesheet=${listItem.id}'" style="cursor: pointer;">
                                ${desc} ${billableIcon}
                            </div>
                            <div class="entry-project" style="color: ${projectColor}">
                                ${projectName}
                            </div>
                            <div class="entry-time">
                                ${durationTime}
                            </div>
                            <button class="btn-continue" onclick="repeatItem(${listItem.id})">
                                <i class="fas fa-play" style="font-size: 10px;"></i>
                            </button>
                        </div>`;
                });
            }

            htmlData += `
            <div class="time-entry-group">
                <div class="date-header">
                    <span>${item[0]}</span>
                    <span>${formatDuration(totalDayTime)}</span>
                </div>
                ${htmlDataItems}
            </div>`;
        }

        // Update Daily Progress (using the first group which is "Today" if sorted desc)
        // Note: result is sorted by date key. If today exists, it should be the last or first?
        // Let's rely on finding today's date key.
        var todayKey = moment().format("DD.MM.YYYY");
        var todayTotalSeconds = 0;

        // Find total for today
        Object.entries(result).forEach(([key, items]) => {
            if (key === todayKey) {
                items.forEach(i => todayTotalSeconds += i.duration);
            }
        });

        // Add active time if started today
        if (activeItemId > 0) {
            // This is trickier as we don't track active duration in this loop easily.
            // But renderActive() updates the timer. 
            // We might just update progress bar from result for now.
        }

        var goalHours = (setting && setting.daily_goal) ? parseFloat(setting.daily_goal) : 8;
        var goalSeconds = goalHours * 3600;
        var pct = Math.min(100, (todayTotalSeconds / goalSeconds) * 100);

        $('#dailyProgress').css('width', pct + '%');

        // Color Change
        if (pct >= 100) {
            $('#dailyProgress').css('background-color', '#ffc107'); // Gold
        } else if (pct > 50) {
            $('#dailyProgress').css('background-color', '#4db6ac'); // Teal/Success
        } else {
            $('#dailyProgress').css('background-color', 'var(--toggl-purple)');
        }

        $('.list-data').html(htmlData)
    }
    else {
        $('.list-data').html('<div class="text-center text-secondary mt-5">No time entries found</div>')
        $('#todayTotal').text('0:00:00');
        $('#dailyProgress').css('width', '0%');
    }
}

// Project Selection Logic
function openProjectSelector() {
    renderProjectList();
    var myModal = new bootstrap.Modal(document.getElementById('projectModal'));
    myModal.show();
    setTimeout(() => $('#projectSearch').focus(), 500);
}

// Pinning Logic
function togglePinProject(e, id) {
    e.stopPropagation();
    var pinned = JSON.parse(localStorage.getItem('pinnedProjects') || '[]');
    if (pinned.includes(id)) {
        pinned = pinned.filter(pid => pid !== id);
    } else {
        pinned.push(id);
    }
    localStorage.setItem('pinnedProjects', JSON.stringify(pinned));
    renderProjectList($('#projectSearch').val());
}

function renderProjectList(filter = "") {
    var html = "";
    var projects = Object.values(cache._parseProjects);
    var pinned = JSON.parse(localStorage.getItem('pinnedProjects') || '[]');

    // Separating pinned and unpinned
    var pinnedProjects = [];
    var otherProjects = [];

    projects.forEach(p => {
        if (pinned.includes(p.id)) pinnedProjects.push(p);
        else otherProjects.push(p);
    });

    // Sort both arrays
    pinnedProjects.sort((a, b) => a.name.localeCompare(b.name));
    otherProjects.sort((a, b) => a.name.localeCompare(b.name));

    // Combine
    var allProjects = [...pinnedProjects, ...otherProjects];

    allProjects.forEach(p => {
        if (filter && !p.name.toLowerCase().includes(filter.toLowerCase())) return;

        var isPinned = pinned.includes(p.id);
        var starClass = isPinned ? "fas fa-star text-warning" : "far fa-star text-secondary";

        html += `
        <div class="list-group-item list-group-item-action bg-dark text-light border-secondary d-flex justify-content-between align-items-center p-0">
             <button type="button" class="btn btn-link text-decoration-none text-light flex-grow-1 text-start p-2" onclick="selectProject(${p.id})">
                <i class="fas fa-circle me-2" style="color: ${p.color}; font-size: 10px;"></i>
                ${p.name}
                <small class="text-secondary ms-2">${p.parentTitle || ''}</small>
            </button>
            <button class="btn btn-link p-2" onclick="togglePinProject(event, ${p.id})">
                <i class="${starClass}"></i>
            </button>
        </div>
        `;
    });
    $('#projectList').html(html);
}

function selectProject(id) {
    selectedProjectId = id;
    updateProjectButton(id);
    // Reset activity if it doesn't belong to this project (optional, but good practice)
    // For now, let's keep it simple.

    var modalEl = document.getElementById('projectModal');
    var modal = bootstrap.Modal.getInstance(modalEl);
    modal.hide();

    // Auto open activity selector if not selected
    if (!selectedActivityId) {
        setTimeout(() => openActivitySelector(), 300);
    }
}

// Activity Selection Logic
function openActivitySelector() {
    renderActivityList();
    var myModal = new bootstrap.Modal(document.getElementById('activityModal'));
    myModal.show();
    setTimeout(() => $('#activitySearch').focus(), 500);
}

function renderActivityList(filter = "") {
    var html = "";
    var activities = Object.values(cache._parseActivities);

    activities.sort((a, b) => a.name.localeCompare(b.name));

    activities.forEach(a => {
        if (filter && !a.name.toLowerCase().includes(filter.toLowerCase())) return;

        // Filter by project if project is selected
        if (selectedProjectId && a.project && a.project != selectedProjectId) return;

        html += `
        <button type="button" class="list-group-item list-group-item-action bg-dark text-light border-secondary" onclick="selectActivity(${a.id})">
            <i class="fas fa-tasks me-2"></i>
            ${a.name}
        </button>
        `;
    });
    $('#activityList').html(html);
}

function selectActivity(id) {
    selectedActivityId = id;
    updateActivityButton(id);
    var modalEl = document.getElementById('activityModal');
    var modal = bootstrap.Modal.getInstance(modalEl);
    modal.hide();
}

// Tag Selection Logic
function openTagSelector() {
    renderTagList();
    var myModal = new bootstrap.Modal(document.getElementById('tagModal'));
    myModal.show();
    setTimeout(() => $('#tagSearch').focus(), 500);
}

function renderTagList(filter = "") {
    var html = "";
    // Assuming tags are in cache.tags (need to verify cache structure)
    // If not, we might need to fetch them or check cache.js
    var tags = cache.tags || [];

    tags.forEach(t => {
        if (filter && !t.name.toLowerCase().includes(filter.toLowerCase())) return;

        html += `
        <button type="button" class="list-group-item list-group-item-action bg-dark text-light border-secondary" onclick="selectTag(${t.id})">
            <i class="fas fa-tag me-2"></i>
            ${t.name}
        </button>
        `;
    });
    $('#tagList').html(html);
}

function selectTag(id) {
    // For now single tag selection for simplicity, or toggle
    if (selectedTagIds.includes(id)) {
        selectedTagIds = selectedTagIds.filter(tid => tid !== id);
    } else {
        selectedTagIds.push(id);
    }
    // Visual feedback?
    // Close modal
    var modalEl = document.getElementById('tagModal');
    var modal = bootstrap.Modal.getInstance(modalEl);
    modal.hide();
}

// Pomodoro Logic
var pomoInterval;
var pomoTime = 25 * 60;
var pomoRunning = false;
var pomoMode = 'focus'; // focus, short, long

function togglePomodoro() {
    if (pomoRunning) {
        clearInterval(pomoInterval);
        pomoRunning = false;
        $('#pomoBtn i').removeClass('fa-pause').addClass('fa-play');
    } else {
        pomoRunning = true;
        $('#pomoBtn i').removeClass('fa-play').addClass('fa-pause');
        pomoInterval = setInterval(() => {
            pomoTime--;
            updatePomoDisplay();
            if (pomoTime <= 0) {
                clearInterval(pomoInterval);
                pomoRunning = false;
                $('#pomoBtn i').removeClass('fa-pause').addClass('fa-play');
                $('#pomoTimer').text('00:00');
                document.title = "TaxCareTracker";
                Neutralino.os.showNotification('Pomodoro Finished', 'Time is up!', 'INFO');
                Neutralino.window.show();
                if (window.audioEnd) window.audioEnd.play().catch(e => console.log(e));
                return;
            }
        }, 1000);
    }
}

function resetPomodoro() {
    clearInterval(pomoInterval);
    pomoRunning = false;
    $('#pomoBtn i').removeClass('fa-pause').addClass('fa-play');
    setPomoMode(pomoMode); // Reset time based on mode
}

function setPomoMode(mode) {
    pomoMode = mode;
    if (mode === 'focus') {
        pomoTime = 25 * 60;
        $('#pomoStatus').text('FOCUS');
    } else if (mode === 'short') {
        pomoTime = 5 * 60;
        $('#pomoStatus').text('SHORT BREAK');
    } else if (mode === 'long') {
        pomoTime = 15 * 60;
        $('#pomoStatus').text('LONG BREAK');
    }
    updatePomoDisplay();
}

function updatePomoDisplay() {
    var minutes = Math.floor(pomoTime / 60);
    var seconds = pomoTime % 60;
    $('#pomoTimer').text(
        (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds
    );
    if (pomoRunning) {
        document.title = $('#pomoTimer').text() + " - Pomodoro";
    }
}

// Idle Handling
var capturedIdleStartTime = null;

function onIdleDetected(startTime) {
    capturedIdleStartTime = startTime;

    // Calculate idle duration
    var diff = moment().diff(startTime);
    var duration = moment.utc(diff).format("HH:mm:ss");

    $('#idleSinceTime').text(startTime.format('HH:mm:ss'));
    $('#idleDuration').text(duration);

    var myModal = new bootstrap.Modal(document.getElementById('idleModal'));
    myModal.show();

    Neutralino.window.show(); // Bring window to front
    Neutralino.os.showNotification('Idle Detected', 'You have been away. Review your time.', 'INFO');
}

async function handleIdle(action) {
    var modalEl = document.getElementById('idleModal');
    var modal = bootstrap.Modal.getInstance(modalEl);
    modal.hide();

    if (action === 'keep') {
        // Do nothing, just close modal. Timer continues.
    } else if (action === 'discard') {
        // Stop timer at capturedIdleStartTime
        if (activeItemId > 0) {
            // Need to patch the entry with end time = capturedIdleStartTime
            var endStr = capturedIdleStartTime.format();

            // First stop it normally to ensure cleaner state via API,
            // then patch the end time?
            // Or just patch end time? 'stop' endpoint usually sets to NOW.

            // Let's manually patch the entry's end time.
            var data = { end: endStr };
            await api.makeAPICallAsync("patch", "/api/timesheets/" + activeItemId, data);

            renderInactive();
            clearInterval(timerDuration);
            document.title = "TaxCareTracker";
            await loadItems();
        }
    } else if (action === 'discard_new') {
        // Stop at capturedIdleStartTime, then start new
        if (activeItemId > 0) {
            var endStr = capturedIdleStartTime.format();
            var data = { end: endStr };
            await api.makeAPICallAsync("patch", "/api/timesheets/" + activeItemId, data);

            // Refresh to get clean state
            await loadItems();

            // Start new timer
            startItem(); // Starts 'now' with current description/project
        }
    }

    idleService.isIdle = false;
}

// Mini Mode Logic
var isMiniMode = false;
var lastWindowRect = { width: 800, height: 600 }; // Default fallback

async function toggleMiniMode() {
    isMiniMode = !isMiniMode;

    if (isMiniMode) {
        // Save current size? Neutralino doesn't provide easy getSize yet in v3 like this, 
        // but we can assume standard or use fallback. 
        // We'll rely on restoring to default or last known config.

        $('body').addClass('mini-mode');
        // Resize to small strip
        await Neutralino.window.setSize({ width: 350, height: 60 });
        await Neutralino.window.setAlwaysOnTop(true);
        $('#miniModeIcon').removeClass('fa-compress').addClass('fa-expand');
    } else {
        $('body').removeClass('mini-mode');
        // Restore size
        await Neutralino.window.setSize({ width: 800, height: 600 });

        // Restore always on top preference
        if (setting && setting.always_top == 1) {
            await Neutralino.window.setAlwaysOnTop(true);
        } else {
            await Neutralino.window.setAlwaysOnTop(false);
        }

        $('#miniModeIcon').removeClass('fa-expand').addClass('fa-compress');
    }
}
