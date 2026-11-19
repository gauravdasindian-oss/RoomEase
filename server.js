
/* =====================================
   ROOMEASE - BACKEND SERVER
===================================== */


/* =====================================
   1. IMPORT PACKAGES
===================================== */

const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");


/* =====================================
   2. INITIALIZE EXPRESS
===================================== */

const app = express();

const PORT = process.env.PORT || 3000;


// Middleware to read JSON data

app.use(express.json());


// Serve frontend files from public folder

app.use(express.static(path.join(__dirname, "public")));


/* =====================================
   3. CONNECT SQLITE DATABASE
===================================== */

const db = new Database(
    path.join(__dirname, "roomease.db")
);


// Enable foreign keys

db.pragma("foreign_keys = ON");


// Improve database performance

db.pragma("journal_mode = WAL");


/* =====================================
   4. CREATE DATABASE TABLES
===================================== */

// Roommates

db.exec(`
    CREATE TABLE IF NOT EXISTS roommates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
`);


// Chores

db.exec(`
    CREATE TABLE IF NOT EXISTS chores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        assignee_id INTEGER,
        due_date TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (assignee_id)
        REFERENCES roommates(id)
        ON DELETE SET NULL
    );
`);


// Expenses

db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        category TEXT,
        amount REAL NOT NULL,
        paid_by INTEGER,
        date TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (paid_by)
        REFERENCES roommates(id)
        ON DELETE SET NULL
    );
`);


// Groceries

db.exec(`
    CREATE TABLE IF NOT EXISTS groceries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT,
        quantity REAL DEFAULT 1,
        unit TEXT,
        added_by INTEGER,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (added_by)
        REFERENCES roommates(id)
        ON DELETE SET NULL
    );
`);


// Inventory

db.exec(`
    CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT,
        quantity REAL DEFAULT 1,
        owner TEXT,
        condition TEXT DEFAULT 'Available',
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
`);


// Bookings

db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resource TEXT NOT NULL,
        roommate_id INTEGER,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (roommate_id)
        REFERENCES roommates(id)
        ON DELETE SET NULL
    );
`);


// Notifications

db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        is_read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
`);


// Announcements

db.exec(`
    CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        created_by INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (created_by)
        REFERENCES roommates(id)
        ON DELETE SET NULL
    );
`);


// House Rules

db.exec(`
    CREATE TABLE IF NOT EXISTS rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        category TEXT,
        description TEXT NOT NULL,
        created_by INTEGER,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (created_by)
        REFERENCES roommates(id)
        ON DELETE SET NULL
    );
`);


/* =====================================
   5. DATABASE HELPER FUNCTIONS
===================================== */

// Convert SQLite boolean values into JavaScript booleans

function formatRow(row, booleanFields = []) {

    if (!row) return row;

    const result = { ...row };

    booleanFields.forEach(field => {

        if (result[field] !== undefined) {
            result[field] = Boolean(result[field]);
        }
    });

    return result;
}


// Send a successful response

function sendSuccess(res, data, status = 200) {

    res.status(status).json({
        success: true,
        data
    });
}


// Send an error response

function sendError(res, message, status = 400) {

    res.status(status).json({
        success: false,
        message
    });
}


// Check whether a roommate exists

function roommateExists(id) {

    return Boolean(
        db.prepare(
            "SELECT id FROM roommates WHERE id = ?"
        ).get(id)
    );
}


// Check whether an ID is a positive integer

function validId(id) {

    return Number.isInteger(Number(id)) && Number(id) > 0;
}


/* =====================================
   6. API CONFIGURATION
===================================== */

const resources = {

    roommates: {
        table: "roommates",
        fields: ["name", "email"],
        required: ["name"],
        booleans: []
    },

    chores: {
        table: "chores",
        fields: ["name", "assignee_id", "due_date", "status"],
        required: ["name"],
        booleans: []
    },

    expenses: {
        table: "expenses",
        fields: ["title", "category", "amount", "paid_by", "date", "notes"],
        required: ["title", "amount"],
        booleans: []
    },

    groceries: {
        table: "groceries",
        fields: ["name", "category", "quantity", "unit", "added_by", "status"],
        required: ["name"],
        booleans: []
    },

    inventory: {
        table: "inventory",
        fields: ["name", "category", "quantity", "owner", "condition", "notes"],
        required: ["name"],
        booleans: []
    },

    bookings: {
        table: "bookings",
        fields: ["resource", "roommate_id", "date", "start_time", "end_time", "notes"],
        required: ["resource", "date", "start_time", "end_time"],
        booleans: []
    },

    notifications: {
        table: "notifications",
        fields: ["title", "message", "category", "is_read"],
        required: ["title", "message"],
        booleans: ["is_read"]
    },

    rules: {
        table: "rules",
        fields: ["title", "category", "description", "created_by", "is_active"],
        required: ["title", "description"],
        booleans: ["is_active"]
    }
};


/* =====================================
   7. VALIDATE API DATA
===================================== */

function validateData(resource, data, isUpdate = false) {

    const config = resources[resource];

    if (!config) {
        return "Invalid resource.";
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) {
        return "Invalid request data.";
    }

    if (!isUpdate) {

        for (const field of config.required) {

            if (
                data[field] === undefined ||
                data[field] === null ||
                data[field] === ""
            ) {
                return `${field} is required.`;
            }
        }
    }

    for (const field of Object.keys(data)) {

        if (!config.fields.includes(field)) {
            return `Invalid field: ${field}`;
        }
    }

    if (
        data.amount !== undefined &&
        (!Number.isFinite(Number(data.amount)) || Number(data.amount) <= 0)
    ) {
        return "Expense amount must be greater than zero.";
    }

    if (
        data.quantity !== undefined &&
        (!Number.isFinite(Number(data.quantity)) || Number(data.quantity) <= 0)
    ) {
        return "Quantity must be greater than zero.";
    }

    if (
        data.assignee_id !== undefined &&
        data.assignee_id !== null &&
        !roommateExists(data.assignee_id)
    ) {
        return "Selected roommate does not exist.";
    }

    if (
        data.paid_by !== undefined &&
        data.paid_by !== null &&
        !roommateExists(data.paid_by)
    ) {
        return "Selected roommate does not exist.";
    }

    if (
        data.added_by !== undefined &&
        data.added_by !== null &&
        !roommateExists(data.added_by)
    ) {
        return "Selected roommate does not exist.";
    }

    if (
        data.roommate_id !== undefined &&
        data.roommate_id !== null &&
        !roommateExists(data.roommate_id)
    ) {
        return "Selected roommate does not exist.";
    }

    if (
        data.created_by !== undefined &&
        data.created_by !== null &&
        !roommateExists(data.created_by)
    ) {
        return "Selected roommate does not exist.";
    }

    if (
        data.status !== undefined &&
        !["pending", "completed", "purchased"].includes(data.status)
    ) {
        return "Invalid status.";
    }

    if (
        data.is_read !== undefined &&
        typeof data.is_read !== "boolean"
    ) {
        return "is_read must be true or false.";
    }

    if (
        data.is_active !== undefined &&
        typeof data.is_active !== "boolean"
    ) {
        return "is_active must be true or false.";
    }

    return null;
}


/* =====================================
   8. GENERIC GET ROUTE
===================================== */

app.get("/api/:resource", (req, res) => {

    try {

        const resource = req.params.resource;
        const config = resources[resource];

        if (!config) {
            return sendError(res, "Resource not found.", 404);
        }

        const rows = db.prepare(
            `SELECT * FROM ${config.table} ORDER BY id DESC`
        ).all();

        const formattedRows = rows.map(row =>
            formatRow(row, config.booleans)
        );

        sendSuccess(res, formattedRows);

    } catch (error) {

        console.error(error);

        sendError(res, "Unable to retrieve data.", 500);
    }
});


/* =====================================
   9. GENERIC POST ROUTE
===================================== */

app.post("/api/:resource", (req, res) => {

    try {

        const resource = req.params.resource;
        const config = resources[resource];

        if (!config) {
            return sendError(res, "Resource not found.", 404);
        }

        const errorMessage = validateData(resource, req.body);

        if (errorMessage) {
            return sendError(res, errorMessage);
        }

        const data = { ...req.body };

        // Apply default values

        if (resource === "chores" && !data.status) {
            data.status = "pending";
        }

        if (resource === "groceries" && !data.status) {
            data.status = "pending";
        }

        if (resource === "notifications" && data.is_read === undefined) {
            data.is_read = false;
        }

        if (resource === "rules" && data.is_active === undefined) {
            data.is_active = true;
        }

        // Convert boolean values for SQLite

        config.booleans.forEach(field => {

            if (typeof data[field] === "boolean") {
                data[field] = data[field] ? 1 : 0;
            }
        });

        const fields = Object.keys(data);

        const placeholders = fields.map(() => "?").join(", ");

        const columns = fields.join(", ");

        const values = fields.map(field => data[field]);

        const statement = db.prepare(`
            INSERT INTO ${config.table} (${columns})
            VALUES (${placeholders})
        `);

        const result = statement.run(...values);

        const newRecord = db.prepare(
            `SELECT * FROM ${config.table} WHERE id = ?`
        ).get(result.lastInsertRowid);

        sendSuccess(
            res,
            formatRow(newRecord, config.booleans),
            201
        );

    } catch (error) {

        console.error(error);

        sendError(res, "Unable to save data.", 500);
    }
});


/* =====================================
   10. GENERIC PATCH ROUTE
===================================== */

app.patch("/api/:resource/:id", (req, res) => {

    try {

        const resource = req.params.resource;
        const id = Number(req.params.id);

        const config = resources[resource];

        if (!config) {
            return sendError(res, "Resource not found.", 404);
        }

        if (!validId(id)) {
            return sendError(res, "Invalid record ID.");
        }

        const existingRecord = db.prepare(
            `SELECT * FROM ${config.table} WHERE id = ?`
        ).get(id);

        if (!existingRecord) {
            return sendError(res, "Record not found.", 404);
        }

        const errorMessage = validateData(
            resource,
            req.body,
            true
        );

        if (errorMessage) {
            return sendError(res, errorMessage);
        }

        const fields = Object.keys(req.body);

        if (fields.length === 0) {
            return sendError(res, "No fields provided for update.");
        }

        const data = { ...req.body };

        config.booleans.forEach(field => {

            if (typeof data[field] === "boolean") {
                data[field] = data[field] ? 1 : 0;
            }
        });

        const updates = fields.map(
            field => `${field} = ?`
        ).join(", ");

        const values = fields.map(
            field => data[field]
        );

        db.prepare(`
            UPDATE ${config.table}
            SET ${updates}
            WHERE id = ?
        `).run(...values, id);

        const updatedRecord = db.prepare(
            `SELECT * FROM ${config.table} WHERE id = ?`
        ).get(id);

        sendSuccess(
            res,
            formatRow(updatedRecord, config.booleans)
        );

    } catch (error) {

        console.error(error);

        sendError(res, "Unable to update data.", 500);
    }
});


/* =====================================
   11. GENERIC DELETE ROUTE
===================================== */

app.delete("/api/:resource/:id", (req, res) => {

    try {

        const resource = req.params.resource;
        const id = Number(req.params.id);

        const config = resources[resource];

        if (!config) {
            return sendError(res, "Resource not found.", 404);
        }

        if (!validId(id)) {
            return sendError(res, "Invalid record ID.");
        }

        const result = db.prepare(
            `DELETE FROM ${config.table} WHERE id = ?`
        ).run(id);

        if (result.changes === 0) {
            return sendError(res, "Record not found.", 404);
        }

        res.status(204).end();

    } catch (error) {

        console.error(error);

        sendError(res, "Unable to delete data.", 500);
    }
});


/* =====================================
   12. MARK ALL NOTIFICATIONS AS READ
===================================== */

app.patch("/api/notifications/mark-all-read", (req, res) => {

    try {

        db.prepare(`
            UPDATE notifications
            SET is_read = 1
        `).run();

        sendSuccess(res, {
            message: "All notifications marked as read."
        });

    } catch (error) {

        console.error(error);

        sendError(res, "Unable to update notifications.", 500);
    }
});


/* =====================================
   13. CREATE ANNOUNCEMENT
===================================== */

app.post("/api/announcements", (req, res) => {

    try {

        const { title, message, created_by } = req.body;

        if (!title || !message || !validId(created_by)) {
            return sendError(
                res,
                "Title, message, and a valid roommate are required."
            );
        }

        if (!roommateExists(created_by)) {
            return sendError(res, "Selected roommate does not exist.");
        }

        const insertAnnouncement = db.prepare(`
            INSERT INTO announcements (
                title,
                message,
                created_by
            )
            VALUES (?, ?, ?)
        `);

        const insertNotification = db.prepare(`
            INSERT INTO notifications (
                title,
                message,
                category
            )
            VALUES (?, ?, 'general')
        `);

        const createBoth = db.transaction(() => {

            const announcement = insertAnnouncement.run(
                title,
                message,
                created_by
            );

            insertNotification.run(
                title,
                message
            );

            return announcement.lastInsertRowid;
        });

        const announcementId = createBoth();

        sendSuccess(res, {
            id: announcementId,
            title,
            message,
            created_by
        }, 201);

    } catch (error) {

        console.error(error);

        sendError(res, "Unable to publish announcement.", 500);
    }
});

/* =====================================
   15. HOMEPAGE ROUTE
===================================== */

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );
});


/* =====================================
   16. UNKNOWN API ROUTES
===================================== */

app.use("/api", (req, res) => {

    sendError(res, "API route not found.", 404);
});


/* =====================================
   17. GLOBAL ERROR HANDLER
===================================== */

app.use((error, req, res, next) => {

    console.error("Server error:", error);

    if (res.headersSent) {
        return next(error);
    }

    sendError(res, "An unexpected server error occurred.", 500);
});


/* =====================================
   18. START SERVER
===================================== */

app.listen(PORT, "0.0.0.0", () => {
    console.log("----------------------------------");
    console.log("       ROOMEASE SERVER STARTED");
    console.log("----------------------------------");
    console.log(`Website: http://localhost:${PORT}`);
    console.log("Database: roomease.db");
    console.log("----------------------------------");
});
