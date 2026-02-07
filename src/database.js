/**
 * DevNotes - Database Handler
 * SQLite Database mit better-sqlite3
 */

const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

class DevNotesDatabase {
    constructor(dbPath) {
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.initTables();
    }

    close() {
        if (this.db) {
            this.db.close();
        }
    }

    // Hash password with bcrypt-like algorithm using crypto
    hashPassword(password) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
        return `${salt}:${hash}`;
    }

    verifyPassword(password, storedHash) {
        const [salt, hash] = storedHash.split(':');
        const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
        return hash === verifyHash;
    }

    initTables() {
        // Admin table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS admin (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Categories table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                icon TEXT DEFAULT '📁',
                sort_order INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Notes table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT,
                category_id TEXT,
                tags TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
            )
        `);

        // FTS table for full-text search
        this.db.exec(`
            CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
                title, content, tags, content=notes, content_rowid=rowid
            )
        `);

        // Triggers for FTS sync
        try {
            this.db.exec(`
                CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
                    INSERT INTO notes_fts(rowid, title, content, tags) 
                    VALUES (NEW.rowid, NEW.title, NEW.content, NEW.tags);
                END
            `);

            this.db.exec(`
                CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
                    INSERT INTO notes_fts(notes_fts, rowid, title, content, tags) 
                    VALUES('delete', OLD.rowid, OLD.title, OLD.content, OLD.tags);
                END
            `);

            this.db.exec(`
                CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
                    INSERT INTO notes_fts(notes_fts, rowid, title, content, tags) 
                    VALUES('delete', OLD.rowid, OLD.title, OLD.content, OLD.tags);
                    INSERT INTO notes_fts(rowid, title, content, tags) 
                    VALUES (NEW.rowid, NEW.title, NEW.content, NEW.tags);
                END
            `);
        } catch (e) {
            // Triggers might already exist
        }

        // Rebuild FTS if needed
        this.rebuildFtsIfNeeded();

        // Insert default categories if empty
        const count = this.db.prepare("SELECT COUNT(*) as count FROM categories").get();
        if (count.count === 0) {
            this.insertDefaultCategories();
        }
    }

    rebuildFtsIfNeeded() {
        try {
            const notesCount = this.db.prepare("SELECT COUNT(*) as count FROM notes").get().count;
            if (notesCount === 0) return;

            const ftsCount = this.db.prepare("SELECT COUNT(*) as count FROM notes_fts").get().count;
            if (ftsCount === 0 || Math.abs(ftsCount - notesCount) > 0) {
                this.db.exec("DELETE FROM notes_fts");
                this.db.exec(`
                    INSERT INTO notes_fts(rowid, title, content, tags)
                    SELECT rowid, title, content, tags FROM notes
                `);
            }
        } catch (e) {
            // Ignore errors
        }
    }

    insertDefaultCategories() {
        const categories = [
            { id: 'git', name: 'Git', icon: 'git', sort_order: 1 },
            { id: 'github', name: 'GitHub', icon: 'github', sort_order: 2 },
            { id: 'vscode', name: 'VS Code', icon: 'vscode', sort_order: 3 },
            { id: 'intellij', name: 'IntelliJ', icon: 'intellij', sort_order: 4 },
            { id: 'eclipse', name: 'Eclipse', icon: 'eclipse', sort_order: 5 },
            { id: 'java', name: 'Java', icon: 'java', sort_order: 6 },
            { id: 'javascript', name: 'JavaScript', icon: 'javascript', sort_order: 7 },
            { id: 'react', name: 'React', icon: 'react', sort_order: 8 },
            { id: 'csharp', name: 'C#', icon: 'csharp', sort_order: 9 },
            { id: 'python', name: 'Python', icon: 'python', sort_order: 10 },
            { id: 'php', name: 'PHP', icon: 'php', sort_order: 11 },
            { id: 'html', name: 'HTML/CSS', icon: 'html', sort_order: 12 },
            { id: 'sql', name: 'SQL', icon: 'sql', sort_order: 13 },
            { id: 'postgresql', name: 'PostgreSQL', icon: 'postgresql', sort_order: 14 },
            { id: 'docker', name: 'Docker', icon: 'docker', sort_order: 15 },
            { id: 'linux', name: 'Linux/Bash', icon: 'linux', sort_order: 16 },
            { id: 'magik', name: 'Smallworld Magik', icon: 'magik', sort_order: 17 },
            { id: 'smallworld', name: 'Smallworld GIS', icon: 'smallworld', sort_order: 18 },
            { id: 'qgis', name: 'QGIS', icon: 'qgis', sort_order: 19 },
            { id: 'geoserver', name: 'GeoServer', icon: 'geoserver', sort_order: 20 },
            { id: 'misc', name: 'Sonstiges', icon: 'misc', sort_order: 99 }
        ];

        const stmt = this.db.prepare("INSERT INTO categories (id, name, icon, sort_order) VALUES (?, ?, ?, ?)");
        for (const cat of categories) {
            stmt.run(cat.id, cat.name, cat.icon, cat.sort_order);
        }
    }

    // ==================== ADMIN ====================
    needsSetup() {
        const result = this.db.prepare("SELECT COUNT(*) as count FROM admin").get();
        return result.count === 0;
    }

    createAdmin(email, password) {
        if (!email || !password) {
            throw new Error('E-Mail und Passwort sind erforderlich');
        }
        if (password.length < 6) {
            throw new Error('Das Passwort muss mindestens 6 Zeichen haben');
        }

        const hashedPassword = this.hashPassword(password);
        this.db.prepare("INSERT INTO admin (email, password) VALUES (?, ?)").run(email, hashedPassword);
    }

    verifyAdmin(email, password) {
        const admin = this.db.prepare("SELECT * FROM admin WHERE email = ?").get(email);
        if (!admin) return false;
        return this.verifyPassword(password, admin.password);
    }

    getAdminEmail() {
        const admin = this.db.prepare("SELECT email FROM admin LIMIT 1").get();
        return admin ? admin.email : null;
    }

    changePassword(currentPassword, newPassword) {
        const admin = this.db.prepare("SELECT * FROM admin LIMIT 1").get();
        if (!admin) {
            throw new Error('Kein Admin-Account gefunden');
        }
        if (!this.verifyPassword(currentPassword, admin.password)) {
            throw new Error('Aktuelles Passwort ist falsch');
        }
        if (newPassword.length < 6) {
            throw new Error('Das neue Passwort muss mindestens 6 Zeichen haben');
        }

        const hashedPassword = this.hashPassword(newPassword);
        this.db.prepare("UPDATE admin SET password = ? WHERE id = ?").run(hashedPassword, admin.id);
    }

    // ==================== CATEGORIES ====================
    getCategories() {
        return this.db.prepare("SELECT * FROM categories ORDER BY sort_order ASC, name ASC").all();
    }

    createCategory(name, icon = '📁') {
        if (!name || !name.trim()) {
            throw new Error('Name ist erforderlich');
        }

        const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const existing = this.db.prepare("SELECT id FROM categories WHERE id = ?").get(id);
        if (existing) {
            throw new Error('Kategorie existiert bereits');
        }

        const maxOrder = this.db.prepare("SELECT MAX(sort_order) as max_order FROM categories").get();
        const sortOrder = (maxOrder.max_order || 0) + 1;

        this.db.prepare("INSERT INTO categories (id, name, icon, sort_order) VALUES (?, ?, ?, ?)").run(id, name.trim(), icon, sortOrder);
        return { id, name: name.trim(), icon, sort_order: sortOrder };
    }

    deleteCategory(id) {
        if (!id || id === 'misc') {
            throw new Error('Diese Kategorie kann nicht gelöscht werden');
        }

        this.db.prepare("UPDATE notes SET category_id = 'misc' WHERE category_id = ?").run(id);
        this.db.prepare("DELETE FROM categories WHERE id = ?").run(id);
    }

    reorderCategories(categories) {
        const stmt = this.db.prepare("UPDATE categories SET sort_order = ? WHERE id = ?");
        const transaction = this.db.transaction((cats) => {
            cats.forEach((cat, index) => {
                stmt.run(index, cat.id);
            });
        });
        transaction(categories);
    }

    // ==================== NOTES ====================
    getNotes(categoryId = null, search = null) {
        let sql, params;

        if (search) {
            sql = `
                SELECT n.*, c.name as category_name 
                FROM notes n 
                LEFT JOIN categories c ON n.category_id = c.id 
                WHERE n.rowid IN (SELECT rowid FROM notes_fts WHERE notes_fts MATCH ?)
            `;
            params = [search + '*'];

            if (categoryId) {
                sql += " AND n.category_id = ?";
                params.push(categoryId);
            }
        } else {
            sql = `
                SELECT n.*, c.name as category_name 
                FROM notes n 
                LEFT JOIN categories c ON n.category_id = c.id 
                WHERE 1=1
            `;
            params = [];

            if (categoryId) {
                sql += " AND n.category_id = ?";
                params.push(categoryId);
            }
        }

        sql += " ORDER BY n.updated_at DESC";

        const notes = this.db.prepare(sql).all(...params);
        return notes.map(note => ({
            ...note,
            tags: JSON.parse(note.tags || '[]')
        }));
    }

    getNote(id) {
        const note = this.db.prepare(`
            SELECT n.*, c.name as category_name 
            FROM notes n 
            LEFT JOIN categories c ON n.category_id = c.id 
            WHERE n.id = ?
        `).get(id);

        if (note) {
            note.tags = JSON.parse(note.tags || '[]');
        }
        return note;
    }

    createNote(title, content, categoryId = 'misc', tags = []) {
        if (!title || !title.trim()) {
            throw new Error('Titel ist erforderlich');
        }

        const id = 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const tagsJson = JSON.stringify(tags);

        this.db.prepare("INSERT INTO notes (id, title, content, category_id, tags) VALUES (?, ?, ?, ?, ?)").run(id, title.trim(), content, categoryId, tagsJson);
        return { id, title: title.trim() };
    }

    updateNote(id, title, content, categoryId = 'misc', tags = []) {
        if (!id || !title || !title.trim()) {
            throw new Error('ID und Titel sind erforderlich');
        }

        const tagsJson = JSON.stringify(tags);
        this.db.prepare(`
            UPDATE notes 
            SET title = ?, content = ?, category_id = ?, tags = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `).run(title.trim(), content, categoryId, tagsJson, id);
    }

    deleteNote(id) {
        if (!id) {
            throw new Error('ID ist erforderlich');
        }
        this.db.prepare("DELETE FROM notes WHERE id = ?").run(id);
    }

    // ==================== STATS ====================
    getStats() {
        const rows = this.db.prepare("SELECT category_id, COUNT(*) as count FROM notes GROUP BY category_id").all();
        const categoryCounts = {};
        for (const row of rows) {
            categoryCounts[row.category_id] = row.count;
        }
        return { category_counts: categoryCounts };
    }

    // ==================== EXPORT/IMPORT ====================
    exportData() {
        const categories = this.db.prepare("SELECT * FROM categories ORDER BY sort_order").all();
        const notes = this.db.prepare("SELECT * FROM notes ORDER BY updated_at DESC").all();

        return {
            version: '1.0',
            exported_at: new Date().toISOString(),
            categories,
            notes: notes.map(note => ({
                ...note,
                tags: JSON.parse(note.tags || '[]')
            }))
        };
    }

    importData(data) {
        if (!data || !data.notes) {
            throw new Error('Ungültiges Import-Format');
        }

        let imported = 0;
        let skipped = 0;

        // Import categories
        if (data.categories) {
            const catStmt = this.db.prepare(`
                INSERT OR IGNORE INTO categories (id, name, icon, sort_order) 
                VALUES (?, ?, ?, ?)
            `);

            for (const cat of data.categories) {
                catStmt.run(cat.id, cat.name, cat.icon || '📁', cat.sort_order || 0);
            }
        }

        // Import notes
        const noteStmt = this.db.prepare(`
            INSERT OR REPLACE INTO notes (id, title, content, category_id, tags, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const note of data.notes) {
            try {
                noteStmt.run(
                    note.id,
                    note.title,
                    note.content || '',
                    note.category_id || 'misc',
                    JSON.stringify(note.tags || []),
                    note.created_at || new Date().toISOString(),
                    note.updated_at || new Date().toISOString()
                );
                imported++;
            } catch (e) {
                skipped++;
            }
        }

        // Rebuild FTS
        this.rebuildFtsIfNeeded();

        return { imported, skipped };
    }
}

module.exports = DevNotesDatabase;
