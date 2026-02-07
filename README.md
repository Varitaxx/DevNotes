# DevNotes - Desktop App

**Entwickler-Nachschlagewerk als Desktop-Anwendung**

Eine Electron-basierte Desktop-App für Windows, macOS und Linux zur Verwaltung von Entwickler-Notizen, Code-Snippets und Tutorials.

## ✨ Features

- 📚 **Kategorien** – Vordefinierte Kategorien (Git, Java, React, Smallworld Magik, etc.) + eigene hinzufügen
- 🔍 **Volltextsuche** – Blitzschnelle Suche mit SQLite FTS5
- 📝 **Markdown** – Vollständige Markdown-Unterstützung
- 🎨 **Syntax-Highlighting** – Code-Blöcke werden automatisch formatiert
- 🏷️ **Tags** – Zusätzliche Verschlagwortung
- 💾 **Offline-First** – Alle Daten lokal in SQLite gespeichert
- 📤 **Export/Import** – Backup als JSON
- 🖥️ **Cross-Platform** – Windows, macOS, Linux

## 🚀 Schnellstart (Entwicklung)

### Voraussetzungen

- [Node.js](https://nodejs.org/) v18 oder höher
- npm (wird mit Node.js installiert)

### Installation

```bash
# Repository klonen oder ZIP entpacken
cd devnotes-electron

# Abhängigkeiten installieren
npm install

# App starten (Entwicklungsmodus)
npm start
```

## 📦 Build erstellen

### Alle Plattformen (auf der jeweiligen Plattform)

```bash
# Windows (auf Windows)
npm run build:win

# macOS (auf macOS)
npm run build:mac

# Linux (auf Linux)
npm run build:linux
```

### Build-Ausgabe

Nach dem Build findest du die Installer im `dist/` Ordner:

| Plattform | Datei | Beschreibung |
|-----------|-------|--------------|
| Windows | `DevNotes Setup x.x.x.exe` | NSIS Installer |
| Windows | `DevNotes x.x.x.exe` | Portable Version |
| macOS | `DevNotes-x.x.x.dmg` | DMG Installer |
| macOS | `DevNotes-x.x.x-mac.zip` | ZIP Archiv |
| Linux | `DevNotes-x.x.x.AppImage` | AppImage (Universal) |
| Linux | `devnotes_x.x.x_amd64.deb` | Debian/Ubuntu Package |

## 🔧 Build-Voraussetzungen

### Windows
- Node.js 18+
- npm

### macOS
- Node.js 18+
- npm
- Xcode Command Line Tools (`xcode-select --install`)

### Linux
- Node.js 18+
- npm
- Build-Tools: `sudo apt install build-essential`
- Für .deb: `dpkg`, `fakeroot`
- Für .rpm: `rpm`

## 📁 Projektstruktur

```
devnotes-electron/
├── assets/
│   ├── icon.svg          # Quell-Icon (512x512)
│   ├── icon.png          # Linux Icon
│   ├── icon.ico          # Windows Icon
│   └── icon.icns         # macOS Icon
├── src/
│   ├── main.js           # Electron Main Process
│   ├── preload.js        # Preload Script (sichere API)
│   ├── database.js       # SQLite Datenbank-Handler
│   └── index.html        # Frontend (HTML/CSS/JS)
├── package.json          # Projekt-Konfiguration
└── README.md
```

## 💾 Datenbank

Die App speichert alle Daten lokal in einer SQLite-Datenbank:

| Betriebssystem | Speicherort |
|----------------|-------------|
| Windows | `%APPDATA%\devnotes\devnotes.db` |
| macOS | `~/Library/Application Support/devnotes/devnotes.db` |
| Linux | `~/.config/devnotes/devnotes.db` |

### Backup

1. **Export**: In der App unter Einstellungen → "Daten exportieren"
2. **Import**: Einstellungen → "Daten importieren"
3. **Manuell**: Die `devnotes.db` Datei kopieren

## ⌨️ Tastenkürzel

| Kürzel | Aktion |
|--------|--------|
| `Strg/Cmd + K` | Suche öffnen |
| `Strg/Cmd + N` | Neue Notiz |
| `Strg/Cmd + S` | Notiz speichern |
| `Escape` | Dialog schließen |

## 🎨 Kategorien

Vordefinierte Kategorien:
- Git, GitHub
- VS Code, IntelliJ, Eclipse
- Java, JavaScript, React, C#, Python, PHP
- HTML/CSS, SQL, PostgreSQL
- Docker, Linux/Bash
- **Smallworld Magik**, **Smallworld GIS**
- QGIS, GeoServer
- Sonstiges

Eigene Kategorien können jederzeit hinzugefügt werden.

## 🔐 Sicherheit

- Alle Daten bleiben lokal auf deinem Computer
- Keine Cloud-Anbindung, keine Telemetrie
- Admin-Passwort wird mit PBKDF2-SHA512 gehasht
- Context Isolation aktiviert (kein direkter Node.js Zugriff im Renderer)

## 🛠️ Entwicklung

### DevTools öffnen

Im Entwicklungsmodus öffnen sich die DevTools automatisch. Im gebauten Release:
- Windows/Linux: `Strg + Shift + I`
- macOS: `Cmd + Option + I`

### Hot Reload

Für schnellere Entwicklung:

```bash
npm install -g electron-reload
```

Dann in `main.js` hinzufügen:
```javascript
require('electron-reload')(__dirname);
```

## 📝 Lizenz

MIT License - Frei verwendbar für private und kommerzielle Projekte.

## 🌐 Links

- Website: [asgardschmiede.eu](https://asgardschmiede.eu)
- Online-Version: [asgardschmiede.eu/devnotes](https://asgardschmiede.eu/devnotes)

---

**Made with ❤️ for developers**
