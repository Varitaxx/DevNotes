/**
 * DevNotes - Electron Main Process
 * Desktop-App für Entwickler-Notizen
 */

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const Database = require('./database');

// Keep a global reference of the window object
let mainWindow;
let db;

// Determine if we're in development mode
const isDev = !app.isPackaged;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 900,
        minHeight: 600,
        icon: path.join(__dirname, '../assets/icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        },
        titleBarStyle: 'default',
        backgroundColor: '#0d1117',
        show: false
    });

    // Load the index.html
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Open DevTools in development
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Initialize database
function initDatabase() {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'devnotes.db');
    db = new Database(dbPath);
}

// App lifecycle
app.whenReady().then(() => {
    initDatabase();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    if (db) {
        db.close();
    }
});

// ==================== IPC HANDLERS ====================

// Setup & Auth
ipcMain.handle('check-setup', () => {
    return { success: true, needs_setup: db.needsSetup() };
});

ipcMain.handle('setup', (event, { email, password }) => {
    try {
        db.createAdmin(email, password);
        return { success: true, message: 'Admin-Account erstellt' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('login', (event, { email, password }) => {
    try {
        const result = db.verifyAdmin(email, password);
        if (result) {
            return { success: true, message: 'Login erfolgreich' };
        }
        return { success: false, error: 'E-Mail oder Passwort falsch' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('check-auth', () => {
    // In desktop app, always logged in after setup
    return { success: true, logged_in: !db.needsSetup(), email: db.getAdminEmail() };
});

ipcMain.handle('change-password', (event, { current_password, new_password }) => {
    try {
        db.changePassword(current_password, new_password);
        return { success: true, message: 'Passwort geändert' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Categories
ipcMain.handle('get-categories', () => {
    try {
        const categories = db.getCategories();
        return { success: true, data: categories };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('create-category', (event, { name, icon }) => {
    try {
        const category = db.createCategory(name, icon);
        return { success: true, data: category };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('delete-category', (event, { id }) => {
    try {
        db.deleteCategory(id);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('reorder-categories', (event, { categories }) => {
    try {
        db.reorderCategories(categories);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Notes
ipcMain.handle('get-notes', (event, { category_id, search }) => {
    try {
        const notes = db.getNotes(category_id, search);
        return { success: true, data: notes };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-note', (event, { id }) => {
    try {
        const note = db.getNote(id);
        return { success: true, data: note };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('create-note', (event, { title, content, category_id, tags }) => {
    try {
        const note = db.createNote(title, content, category_id, tags);
        return { success: true, data: note };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('update-note', (event, { id, title, content, category_id, tags }) => {
    try {
        db.updateNote(id, title, content, category_id, tags);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('delete-note', (event, { id }) => {
    try {
        db.deleteNote(id);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Stats
ipcMain.handle('get-stats', () => {
    try {
        const stats = db.getStats();
        return { success: true, data: stats };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Export/Import
ipcMain.handle('export-data', async () => {
    try {
        const data = db.exportData();
        
        const { filePath } = await dialog.showSaveDialog(mainWindow, {
            title: 'DevNotes exportieren',
            defaultPath: `devnotes-export-${new Date().toISOString().split('T')[0]}.json`,
            filters: [{ name: 'JSON', extensions: ['json'] }]
        });

        if (filePath) {
            const fs = require('fs');
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            return { success: true, message: 'Export erfolgreich' };
        }
        return { success: false, error: 'Export abgebrochen' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('import-data', async () => {
    try {
        const { filePaths } = await dialog.showOpenDialog(mainWindow, {
            title: 'DevNotes importieren',
            filters: [{ name: 'JSON', extensions: ['json'] }],
            properties: ['openFile']
        });

        if (filePaths && filePaths.length > 0) {
            const fs = require('fs');
            const content = fs.readFileSync(filePaths[0], 'utf8');
            const data = JSON.parse(content);
            const result = db.importData(data);
            return { success: true, data: result };
        }
        return { success: false, error: 'Import abgebrochen' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Get app info
ipcMain.handle('get-app-info', () => {
    return {
        version: app.getVersion(),
        electron: process.versions.electron,
        node: process.versions.node,
        platform: process.platform,
        dataPath: app.getPath('userData')
    };
});

// Open external URL
ipcMain.handle('open-external', (event, url) => {
    shell.openExternal(url);
});
