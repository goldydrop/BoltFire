import os
import sys
import webview
import subprocess
import time
import threading
import ctypes
import pystray
import socket
from PIL import Image, ImageDraw

# --- SINGLE INSTANCE LOCK ---
# Binds to a hidden local port. If a second BoltFire window tries to open, 
# the port will already be in use and the duplicate app will instantly close itself.
try:
    lock_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    lock_socket.bind(('127.0.0.1', 47123))
except socket.error:
    print("BoltFire is already running. Closing duplicate instance.")
    sys.exit(0)
# ----------------------------

REG_PATH = r"SOFTWARE\BoltFire\Settings"

def get_asset_path(relative_path):
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

def create_tray_icon():
    icon_path = get_asset_path('boltfire logo_main.ico')
    if os.path.exists(icon_path):
        return Image.open(icon_path)
        
    image = Image.new('RGB', (64, 64), color=(101, 163, 13)) # Fallback Green
    draw = ImageDraw.Draw(image)
    draw.ellipse((16, 16, 48, 48), fill=(255, 255, 255))
    return image

def start_system_tray(bridge):
    def on_click(icon, item):
        bridge._window.show() # Unhide the webview window using the private attribute
        icon.stop()          # Destroy the tray icon

    # This loop continuously updates the tooltip text on hover
    def update_tooltip(icon):
        icon.visible = True
        while bridge.is_locked and icon.visible:
            remaining = bridge.end_time - time.time()
            if remaining > 0:
                mins = int(remaining // 60)
                secs = int(remaining % 60)
                icon.title = f"{mins} mins, {secs} secs left"
            else:
                icon.title = "Session complete!"
            time.sleep(1)

    icon = pystray.Icon("BoltFire", create_tray_icon(), "BoltFire", menu=pystray.Menu(
        pystray.MenuItem("Open", on_click, default=True)
    ))
    
    # Start the tooltip updater loop alongside the icon
    threading.Thread(target=update_tooltip, args=(icon,), daemon=True).start()
    icon.run()

class BoltFireBridge:
    def __init__(self):
        self.is_locked = False
        self.end_time = 0
        self._window = None # Hidden from pywebview serialization

    def close_existing_managers(self):
        try:
            subprocess.run(["taskkill", "/F", "/IM", "BoltFire.exe"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            subprocess.run(["taskkill", "/F", "/IM", "CTMHelper.exe"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass

    def get_running_apps(self):
        try:
            cmd = 'Get-Process | Where-Object {$_.MainWindowTitle} | Select-Object -ExpandProperty Name'
            output = subprocess.check_output(
                ['powershell', '-NoProfile', '-Command', cmd], 
                text=True,
                creationflags=subprocess.CREATE_NO_WINDOW
            )
            
            apps = set()
            sys_excludes = ['explorer', 'ApplicationFrameHost', 'SystemSettings', 'ctfmon']
            
            for line in output.strip().split('\n'):
                app_name = line.strip()
                if app_name and app_name not in sys_excludes:
                    apps.add(app_name)
                            
            return sorted(list(apps))
        except Exception as e:
            print(f"Error fetching apps: {e}")
            return []

    def browse_for_exe(self):
        try:
            result = webview.windows[0].create_file_dialog(
                webview.OPEN_DIALOG, 
                allow_multiple=True, 
                file_types=('Executable Files (*.exe)', 'All Files (*.*)')
            )
            if result:
                apps = []
                for path in result:
                    filename = os.path.basename(path)
                    if filename.lower().endswith('.exe'):
                        apps.append(filename[:-4])
                return apps
            return []
        except Exception as e:
            print(f"Error opening file dialog: {e}")
            return []

    def activate_lock(self, payload):
        whitelist_data = payload.get("whitelist", "explorer.exe, taskmgr.exe")
        block_task = payload.get("blockTaskManager", True)
        block_sets = payload.get("blockSettings", True)
        duration_mins = payload.get("durationMinutes", 0)
        block_action = payload.get("blockAction", "close") 
        notify_end = payload.get("notifyEnd", True)

        if duration_mins == 0:
            return {"status": "error", "message": "No duration set!"}

        self.is_locked = True
        self.end_time = time.time() + (duration_mins * 60)

        print(f"Starting block for {duration_mins} minutes. Allowed: {whitelist_data}")

        thread = threading.Thread(
            target=self._enforce_lock_loop, 
            args=(whitelist_data, block_task, block_sets, duration_mins, block_action, notify_end),
            daemon=True
        )
        thread.start()
        
        return {"status": "success", "message": f"Lock activated for {duration_mins} minutes!"}

    def _enforce_lock_loop(self, whitelist_data, block_task, block_sets, duration_mins, block_action, notify_end):
        whitelist = [app.strip().lower() for app in whitelist_data.split(',')]
        
        # Auto-allowlist the program itself (python.exe or a compiled .exe)
        current_exe = os.path.basename(sys.executable).lower()
        if current_exe not in whitelist:
            whitelist.append(current_exe)

        if block_task and "taskmgr.exe" not in whitelist:
            pass
        else:
            whitelist.append("taskmgr.exe")

        sys_excludes = ['explorer.exe', 'applicationframehost.exe', 'ctfmon.exe', 'searchhost.exe', 'startmenuexperiencehost.exe']
        for exc in sys_excludes:
            if exc not in whitelist:
                whitelist.append(exc)

        user32 = ctypes.windll.user32
        
        while time.time() < self.end_time or duration_mins == -1:
            try:
                cmd = 'Get-Process | Where-Object {$_.MainWindowTitle} | Select-Object -Property Name, Id | ConvertTo-Csv -NoTypeInformation'
                output = subprocess.check_output(
                    ['powershell', '-NoProfile', '-Command', cmd], 
                    text=True,
                    creationflags=subprocess.CREATE_NO_WINDOW
                )
                
                for line in output.strip().split('\n')[1:]: 
                    if not line: continue
                    parts = line.replace('"', '').split(',')
                    if len(parts) < 2: continue
                    
                    app_name = parts[0].strip().lower()
                    pid = int(parts[1].strip())
                    exe_name = f"{app_name}.exe"
                    
                    if exe_name not in whitelist:
                        if block_action == "minimize":
                            def callback(hwnd, lParam):
                                if user32.IsWindowVisible(hwnd):
                                    window_pid = ctypes.c_int()
                                    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(window_pid))
                                    if window_pid.value == pid:
                                        user32.ShowWindow(hwnd, 6) 
                                return True
                            
                            EnumWindowsProc = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.POINTER(ctypes.c_int), ctypes.POINTER(ctypes.c_int))
                            user32.EnumWindows(EnumWindowsProc(callback), 0)
                        else:
                            subprocess.run(
                                ["taskkill", "/F", "/IM", exe_name], 
                                stdout=subprocess.DEVNULL, 
                                stderr=subprocess.DEVNULL,
                                creationflags=subprocess.CREATE_NO_WINDOW
                            )
            except Exception:
                pass
                
            time.sleep(2) 
            
        print("Timer complete. Lock lifted.")
        self.is_locked = False
        
        if notify_end:
            toast_ps = r"""
            $XML = '<toast><visual><binding template="ToastText02"><text id="1">BoltFire</text><text id="2">Your block session has finished!</text></binding></visual></toast>'
            $XmlDocument = [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime]::new()
            $XmlDocument.loadXml($XML)
            $AppId = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe'
            [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]::CreateToastNotifier($AppId).Show($XmlDocument)
            """
            subprocess.run(["powershell", "-Command", toast_ps], creationflags=subprocess.CREATE_NO_WINDOW)

if __name__ == "__main__":
    bridge = BoltFireBridge()
    html_path = get_asset_path("index.html")

    if not os.path.exists(html_path):
        print(f"Error: Template asset not found at {html_path}")
        sys.exit(1)

    window = webview.create_window(
        title="BoltFire - Focus & Blocker",
        url=html_path,  
        js_api=bridge,   
        width=850,
        height=650,
        resizable=True,
        min_size=(700, 500)
    )

    bridge._window = window # Assigned to the private attribute

    def on_closing():
        if bridge.is_locked:
            window.hide() 
            threading.Thread(target=start_system_tray, args=(bridge,), daemon=True).start()
            return False  
        return True

    window.events.closing += on_closing

    # Icon argument forces PyWebView to load it into the titlebar
    webview.start(private_mode=False, icon=get_asset_path('boltfire logo_main.ico'))