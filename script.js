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
    hours = hours % 12 || 12; 
    const minutes = future.getMinutes().toString().padStart(2, '0');
    
    const day = future.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[future.getMonth()];
    const year = future.getFullYear();

    display.value = `${hours}:${minutes} ${ampm}, ${day} ${month} ${year}`;
}

// --- THEME & SETTINGS LOGIC ---
const themeColorDefaults = {
    'micromanager': { accent: '#65a30d', accentHover: '#4d7c0f', bgMain: '#343438', bgNav: '#27272a', bgPanel: '#3b3b3f' },
    'aftereffects': { accent: '#2d8ceb', accentHover: '#1e70c5', bgMain: '#232323', bgNav: '#1e1e1e', bgPanel: '#2b2b2b' },
    'macos': { accent: '#007aff', accentHover: '#0056b3', bgMain: '#f5f5f7', bgNav: '#e8e8ed', bgPanel: '#ffffff' },
    'boltfire-iconic': { accent: '#ff6600', accentHover: '#cc2900', bgMain: '#0b0c10', bgNav: '#1f2833', bgPanel: '#151821' }
};

function saveSettings() {
    const currentTheme = document.querySelector('input[name="theme-select"]:checked')?.value || 'micromanager';
    
    // Fetch existing so we don't overwrite colors saved for other paradigms
    let settings = JSON.parse(localStorage.getItem('boltfireSettings') || '{}');
    
    settings.pref24h = document.getElementById('pref-24h')?.checked;
    settings.blockTaskmgr = document.getElementById('block-taskmgr')?.checked;
    settings.blockSettings = document.getElementById('block-settings')?.checked;
    settings.blockAction = document.getElementById('block-action')?.value;
    settings.notifyBlock = document.getElementById('notify-block')?.checked;
    settings.notifyBreak = document.getElementById('notify-break')?.checked;
    settings.notifyEnd = document.getElementById('notify-end')?.checked;
    settings.theme = currentTheme;
    
    // Initialize per-theme memory if missing
    if (!settings.themeColors) {
        settings.themeColors = JSON.parse(JSON.stringify(themeColorDefaults));
    }
    
    // Save current colors to the currently active paradigm
    settings.themeColors[currentTheme] = {
        accent: document.getElementById('color-accent').value,
        accentHover: document.getElementById('color-accent-hover').value,
        bgMain: document.getElementById('color-bg-main').value,
        bgNav: document.getElementById('color-bg-nav').value,
        bgPanel: document.getElementById('color-bg-panel').value
    };
    
    localStorage.setItem('boltfireSettings', JSON.stringify(settings));
}

function loadThemeColors(themeName) {
    let settings = JSON.parse(localStorage.getItem('boltfireSettings') || '{}');
    let colors = themeColorDefaults[themeName]; // start with defaults
    
    // Override with user's saved colors for this specific paradigm if they exist
    if (settings.themeColors && settings.themeColors[themeName]) {
        colors = settings.themeColors[themeName];
    } else if (settings.customColors && themeName === (settings.theme || 'micromanager')) {
        // Fallback for previous single-color save architecture
        colors = settings.customColors;
    }

    document.getElementById('color-accent').value = colors.accent;
    document.getElementById('color-accent-hover').value = colors.accentHover;
    document.getElementById('color-bg-main').value = colors.bgMain;
    document.getElementById('color-bg-nav').value = colors.bgNav;
    document.getElementById('color-bg-panel').value = colors.bgPanel;
    
    applyCustomColorsToCSS();
}

function loadSettings() {
    const saved = localStorage.getItem('boltfireSettings');
    if (saved) {
        const settings = JSON.parse(saved);
        
        const checkboxMap = {
            'pref-24h': 'pref24h',
            'block-taskmgr': 'blockTaskmgr',
            'block-settings': 'blockSettings',
            'notify-block': 'notifyBlock',
            'notify-break': 'notifyBreak',
            'notify-end': 'notifyEnd'
        };

        for (const [id, key] of Object.entries(checkboxMap)) {
            if (document.getElementById(id) && settings[key] !== undefined) {
                document.getElementById(id).checked = settings[key];
            }
        }

        if (settings.blockAction && document.getElementById('block-action')) {
            document.getElementById('block-action').value = settings.blockAction;
        }

        if (settings.theme) {
            const themeRadio = document.querySelector(`input[name="theme-select"][value="${settings.theme}"]`);
            if (themeRadio) {
                themeRadio.checked = true;
                document.documentElement.setAttribute('data-theme', settings.theme);
            }
            loadThemeColors(settings.theme);
        } else {
            loadThemeColors('micromanager');
        }
    } else {
        loadThemeColors('micromanager');
    }
}

function applyThemePreset(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
}

function resetThemeColors() {
    const currentTheme = document.querySelector('input[name="theme-select"]:checked')?.value || 'micromanager';
    
    if (themeColorDefaults[currentTheme]) {
        const colors = themeColorDefaults[currentTheme];
        document.getElementById('color-accent').value = colors.accent;
        document.getElementById('color-accent-hover').value = colors.accentHover;
        document.getElementById('color-bg-main').value = colors.bgMain;
        document.getElementById('color-bg-nav').value = colors.bgNav;
        document.getElementById('color-bg-panel').value = colors.bgPanel;
        
        applyCustomColorsToCSS();
        saveSettings(); // Locks the factory defaults back into memory
    }
}

function applyCustomColorsToCSS() {
    const root = document.documentElement;
    root.style.setProperty('--accent-color', document.getElementById('color-accent').value);
    root.style.setProperty('--accent-hover', document.getElementById('color-accent-hover').value);
    root.style.setProperty('--bg-main', document.getElementById('color-bg-main').value);
    root.style.setProperty('--bg-nav', document.getElementById('color-bg-nav').value);
    root.style.setProperty('--bg-panel', document.getElementById('color-bg-panel').value);
}

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();

    document.querySelectorAll('input[type="checkbox"], select').forEach(el => el.addEventListener('change', saveSettings));

    document.querySelectorAll('input[name="theme-select"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            applyThemePreset(e.target.value);
            loadThemeColors(e.target.value); // Load remembered colors for this paradigm instead of wiping them
            saveSettings();
        });
    });

    ['color-accent', 'color-accent-hover', 'color-bg-main', 'color-bg-nav', 'color-bg-panel'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', applyCustomColorsToCSS);
            el.addEventListener('change', saveSettings);
        }
    });

    updateLiveTime();
    setInterval(updateLiveTime, 10000); 
});

// --- BACKEND MEMORY SHELL INTEGRATION ---
function buildSummaryScreen() {
    const checkedApps = Array.from(document.querySelectorAll('.app-item:checked')).map(cb => cb.value);
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

let countdownInterval;

function triggerSystemLock() {
    const checkedApps = Array.from(document.querySelectorAll('.app-item:checked')).map(cb => cb.value);
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
        blockAction: document.getElementById("block-action")?.value ?? "close",
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