# BoltFire


notes:
[per build in folder]
pyinstaller --onefile --noconsole --uac-admin --add-data "index.html;." --add-data "style.css;." --add-data "script.js;." app.py

alt: python app.py


notes:
[needs flask installation only once first on new pc]
pip install pyinstaller pywebview Flask psutil
