// Global Navigation Tab Swapping Framework
function switchSection(targetSection) {
    document.querySelectorAll('section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('nav#main-nav ul li a').forEach(nav => nav.classList.remove('active'));
    
    document.getElementById(`sec-${targetSection}`).classList.add('active');
    document.getElementById(`nav-${targetSection}`).classList.add('active');

    if (targetSection === 'start') {
        buildSummaryScreen();
    }
    
    if (targetSection === 'allowlist') {
        fetchRunningApps();
    }
}

// Inner Settings sub-tabs controller
function switchSubTab(targetTab) {
    document.querySelectorAll('.sub-tab-content').forEach(content => content.classList.remove('active'));
    document.querySelectorAll('.sub-tab-link').forEach(link => link.classList.remove('active'));
    
    document.getElementById(`sub-${targetTab}`).classList.add('active');
    document.getElementById(`tab-link-${targetTab}`).classList.add('active');
}

// Dropdown/Radio constraints handler for Duration parameters
function toggleDurationInput(disableDropdown) {
    const dropdown = document.getElementById('duration-select');
    const inlineDisplay = document.getElementById('duration-time-display');
    dropdown.disabled = disableDropdown;
    inlineDisplay.style.opacity = disableDropdown ? "0.2" : "0.6";
}

// Dynamically calculates the future completion time based on the dropdown duration
function updateLiveTime() {
    const select = document.getElementById('duration-select');
    const display = document.getElementById('duration-time-display');
    const customInput = document.getElementById('custom-minutes');
    const customLabel = document.getElementById('custom-minutes-label');
    
    let minutesToAdd;

    if (select.value === "custom") {
        customInput.style.display = "inline-block";
        customLabel.style.display = "inline-block";
        minutesToAdd = parseInt(customInput.value) || 0;
    } else {
        customInput.style.display = "none";
        customLabel.style.display = "none";
        minutesToAdd = parseInt(select.value);
    }

    const now = new Date();
    const future = new Date(now.getTime() + minutesToAdd * 60000);

    let hours = future.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    const minutes = future.getMinutes().toString().padStart(2, '0');
    
    const day = future.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[future.getMonth()];
    const year = future.getFullYear();

    display.value = `${hours}:${minutes} ${ampm}, ${day} ${month} ${year}`;
}

// --- SETTINGS SAVE/LOAD LOGIC ---
function saveSettings() {
    const settings = {};
    
    const pref24h = document.getElementById('pref-24h');
    if (pref24h) settings.pref24h = pref24h.checked;
    
    const blockTaskmgr = document.getElementById('block-taskmgr');
    if (blockTaskmgr) settings.blockTaskmgr = blockTaskmgr.checked;
    
    const blockSettings = document.getElementById('block-settings');
    if (blockSettings) settings.blockSettings = blockSettings.checked;
    
    const blockAction = document.getElementById('block-action');
    if (blockAction) settings.blockAction = blockAction.value;
    
    const notifyBlock = document.getElementById('notify-block');
    if (notifyBlock) settings.notifyBlock = notifyBlock.checked;
    
    const notifyBreak = document.getElementById('notify-break');
    if (notifyBreak) settings.notifyBreak = notifyBreak.checked;
    
    const notifyEnd = document.getElementById('notify-end');
    if (notifyEnd) settings.notifyEnd = notifyEnd.checked;

    localStorage.setItem('boltfireSettings', JSON.stringify(settings));
}

function loadSettings() {
    const savedSettings = localStorage.getItem('boltfireSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        
        const pref24h = document.getElementById('pref-24h');
        if (pref24h && settings.pref24h !== undefined) pref24h.checked = settings.pref24h;
        
        const blockTaskmgr = document.getElementById('block-taskmgr');
        if (blockTaskmgr && settings.blockTaskmgr !== undefined) blockTaskmgr.checked = settings.blockTaskmgr;
        
        const blockSettings = document.getElementById('block-settings');
        if (blockSettings && settings.blockSettings !== undefined) blockSettings.checked = settings.blockSettings;
        
        const blockAction = document.getElementById('block-action');
        if (blockAction && settings.blockAction !== undefined) blockAction.value = settings.blockAction;
        
        const notifyBlock = document.getElementById('notify-block');
        if (notifyBlock && settings.notifyBlock !== undefined) notifyBlock.checked = settings.notifyBlock;
        
        const notifyBreak = document.getElementById('notify-break');
        if (notifyBreak && settings.notifyBreak !== undefined) notifyBreak.checked = settings.notifyBreak;
        
        const notifyEnd = document.getElementById('notify-end');
        if (notifyEnd && settings.notifyEnd !== undefined) notifyEnd.checked = settings.notifyEnd;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Load previously saved settings
    loadSettings();

    // Attach listeners to save settings automatically when changed
    const settingInputs = [
        'pref-24h', 'block-taskmgr', 'block-settings', 
        'block-action', 'notify-block', 'notify-break', 'notify-end'
    ];
    settingInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', saveSettings);
        }
    });

    updateLiveTime();
    setInterval(updateLiveTime, 10000); 
});

// Compiles Checked items and Choices into the final summary block window layout
function buildSummaryScreen() {
    const checkedApps = [];
    document.querySelectorAll('.app-item:checked').forEach(checkbox => {
        checkedApps.push(checkbox.value);
    });

    const appsDisplay = document.getElementById('summary-apps-list');
    if (checkedApps.length > 0) {
        appsDisplay.innerHTML = `${checkedApps.join('<br>')}<br><span class="summary-subtext">... and BoltFire apps.</span>`;
    } else {
        appsDisplay.innerHTML = `<span style="color: #ef4444;">No apps selected!</span><br><span class="summary-subtext">... and BoltFire apps.</span>`;
    }

    const durType = document.querySelector('input[name="dur-type"]:checked').value;
    const timeDesc = document.getElementById('summary-time-desc');
    
    if (durType === 'restart') {
        timeDesc.textContent = "Your computer is restarted, with no breaks.";
    } else {
        const durationSelect = document.getElementById('duration-select');
        if (durationSelect.value === 'custom') {
            const mins = document.getElementById('custom-minutes').value || 0;
            timeDesc.textContent = `${mins} minutes from now, with no breaks.`;
        } else {
            const durationText = durationSelect.options[durationSelect.selectedIndex].text;
            timeDesc.textContent = `${durationText}, with no breaks.`;
        }
    }
}

// Timer Variables
let countdownInterval;

// Native Local Memory Execution Bridge
function triggerSystemLock() {
    const checkedApps = [];
    document.querySelectorAll('.app-item:checked').forEach(checkbox => {
        checkedApps.push(checkbox.value);
    });

    const durType = document.querySelector('input[name="dur-type"]:checked').value;
    let durationMins = 0;
    
    if (durType === 'timer') {
        const select = document.getElementById('duration-select');
        durationMins = select.value === "custom" 
            ? parseInt(document.getElementById('custom-minutes').value) || 0 
            : parseInt(select.value);
    } else if (durType === 'restart') {
        durationMins = -1; 
    }

    const payload = {
        whitelist: checkedApps.map(app => app + ".exe").join(", "),
        blockTaskManager: document.getElementById("block-taskmgr")?.checked ?? true,
        blockSettings: document.getElementById("block-settings")?.checked ?? true,
        durationMinutes: durationMins,
        blockAction: document.getElementById("block-action").value,
        notifyEnd: document.getElementById("notify-end")?.checked ?? true
    };

    if (window.pywebview && window.pywebview.api) {
        window.pywebview.api.activate_lock(payload).then(function(response) {
            if (response.status === "success" || response.status === "partial") {
                startVisualTimer(checkedApps, durationMins);
            } else {
                alert(`⚠️ Error: ${response.message}`);
            }
        });
    } else {
        // Fallback for testing in browser without python bridge
        startVisualTimer(checkedApps, durationMins);
    }
}

function startVisualTimer(allowedApps, durationMins) {
    document.body.classList.add('blocking-active');
    document.querySelectorAll('section').forEach(sec => sec.classList.remove('active'));
    document.getElementById('sec-active').classList.add('active');
    
    document.getElementById('active-timer-container').style.display = 'block';
    document.getElementById('session-end-container').style.display = 'none';
    
    let appsText = allowedApps.join(", ");
    if (appsText.length > 30 || appsText.length === 0) appsText = "Selected Apps";
    document.getElementById('active-apps-label').textContent = appsText;

    let endTime = Date.now() + (durationMins * 60000);

    countdownInterval = setInterval(() => {
        let remaining = endTime - Date.now();
        
        if (remaining <= 0 || durationMins === -1) {
            clearInterval(countdownInterval);
            document.getElementById('active-timer-container').style.display = 'none';
            document.getElementById('session-end-container').style.display = 'block';
            return;
        }

        let totalSeconds = Math.floor(remaining / 1000);
        let mins = Math.floor(totalSeconds / 60);
        let secs = totalSeconds % 60;

        document.getElementById('countdown-display').textContent = `${mins} min, ${secs} sec`;
    }, 1000);
}

function resetToMainMenu() {
    document.body.classList.remove('blocking-active');
    switchSection('settings'); 
}

// Fetch currently running apps from Python
function fetchRunningApps() {
    if (window.pywebview && window.pywebview.api) {
        window.pywebview.api.get_running_apps().then(function(apps) {
            const listPanel = document.querySelector('.list-panel');
            const existingApps = Array.from(document.querySelectorAll('.app-item')).map(cb => cb.value.toLowerCase());
            
            apps.forEach(app => {
                if (!existingApps.includes(app.toLowerCase())) {
                    const row = document.createElement('div');
                    row.className = 'form-row';
                    row.innerHTML = `<label><input type="checkbox" class="app-item" value="${app}"> ${app}</label>`;
                    listPanel.appendChild(row);
                }
            });
        });
    } else {
        alert("Cannot fetch apps: Python memory bridge not detected.");
    }
}

// Trigger native file browser
function browseForExe() {
    if (window.pywebview && window.pywebview.api) {
        window.pywebview.api.browse_for_exe().then(function(apps) {
            if (!apps || apps.length === 0) return;
            const listPanel = document.querySelector('.list-panel');
            const existingApps = Array.from(document.querySelectorAll('.app-item')).map(cb => cb.value.toLowerCase());
            
            apps.forEach(app => {
                if (!existingApps.includes(app.toLowerCase())) {
                    const row = document.createElement('div');
                    row.className = 'form-row';
                    row.innerHTML = `<label><input type="checkbox" class="app-item" value="${app}" checked> ${app}</label>`;
                    listPanel.appendChild(row);
                }
            });
        });
    }
}