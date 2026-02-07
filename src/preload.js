/**
 * DevNotes - Preload Script
 * Sichere Bridge zwischen Renderer und Main Process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // Setup & Auth
    checkSetup: () => ipcRenderer.invoke('check-setup'),
    setup: (email, password) => ipcRenderer.invoke('setup', { email, password }),
    login: (email, password) => ipcRenderer.invoke('login', { email, password }),
    checkAuth: () => ipcRenderer.invoke('check-auth'),
    changePassword: (currentPassword, newPassword) => 
        ipcRenderer.invoke('change-password', { current_password: currentPassword, new_password: newPassword }),

    // Categories
    getCategories: () => ipcRenderer.invoke('get-categories'),
    createCategory: (name, icon) => ipcRenderer.invoke('create-category', { name, icon }),
    deleteCategory: (id) => ipcRenderer.invoke('delete-category', { id }),
    reorderCategories: (categories) => ipcRenderer.invoke('reorder-categories', { categories }),

    // Notes
    getNotes: (categoryId, search) => ipcRenderer.invoke('get-notes', { category_id: categoryId, search }),
    getNote: (id) => ipcRenderer.invoke('get-note', { id }),
    createNote: (title, content, categoryId, tags) => 
        ipcRenderer.invoke('create-note', { title, content, category_id: categoryId, tags }),
    updateNote: (id, title, content, categoryId, tags) => 
        ipcRenderer.invoke('update-note', { id, title, content, category_id: categoryId, tags }),
    deleteNote: (id) => ipcRenderer.invoke('delete-note', { id }),

    // Stats
    getStats: () => ipcRenderer.invoke('get-stats'),

    // Export/Import
    exportData: () => ipcRenderer.invoke('export-data'),
    importData: () => ipcRenderer.invoke('import-data'),

    // App Info
    getAppInfo: () => ipcRenderer.invoke('get-app-info'),
    openExternal: (url) => ipcRenderer.invoke('open-external', url)
});

// Also provide a simple API object that mimics the PHP API structure
contextBridge.exposeInMainWorld('api', {
    call: async (action, data = {}) => {
        const methodMap = {
            'check_setup': 'check-setup',
            'setup': 'setup',
            'login': 'login',
            'check_auth': 'check-auth',
            'change_password': 'change-password',
            'get_categories': 'get-categories',
            'create_category': 'create-category',
            'delete_category': 'delete-category',
            'reorder_categories': 'reorder-categories',
            'get_notes': 'get-notes',
            'get_note': 'get-note',
            'create_note': 'create-note',
            'update_note': 'update-note',
            'delete_note': 'delete-note',
            'get_stats': 'get-stats',
            'export': 'export-data',
            'import': 'import-data'
        };

        const channel = methodMap[action] || action;
        return await ipcRenderer.invoke(channel, data);
    }
});
