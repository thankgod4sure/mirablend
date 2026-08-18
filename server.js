 // ======================================================
// MIRA'S BLEND
// COMPLETE BACKEND SERVER
// ======================================================


// ======================================================
// IMPORT PACKAGES
// ======================================================

// Express creates our backend server.
const express = require("express");

// SQLite allows Node.js to communicate with our database.
const sqlite3 = require("sqlite3").verbose();

// dotenv loads information from our .env file.
require("dotenv").config();

// express-session keeps the admin logged in.
const session = require("express-session");


// ======================================================
// CREATE EXPRESS APP
// ======================================================

const app = express();


// ======================================================
// BASIC SETTINGS
// ======================================================

// Our website will run on port 3000.
const PORT = 3000;


// ======================================================
// MIDDLEWARE
// ======================================================

// Allows the server to receive JSON from JavaScript.
app.use(express.json());


// Allows the server to receive normal form data.
app.use(express.urlencoded({ extended: true }));


// ======================================================
// ADMIN LOGIN SESSION
// ======================================================

// This remembers that the administrator has logged in.
//
// Example:
//
// Admin logs in
//      ↓
// Server creates a session
//      ↓
// Admin can open the dashboard
//
app.use(
    session({
        secret: process.env.SESSION_SECRET,

        resave: false,

        saveUninitialized: false,

        cookie: {
            httpOnly: true,

            // For local development this is false.
            // When the website is deployed with HTTPS,
            // this should be changed to true.
            secure: false,

            maxAge: 1000 * 60 * 60 * 8
        }
    })
);


// ======================================================
// SERVE WEBSITE FILES
// ======================================================

// Everything inside "public" can be opened by the browser.
app.use(express.static("public"));


// ======================================================
// HOME PAGE
// ======================================================

// When somebody visits:
//
// http://localhost:3000
//
// show the Mira's Blend website.
//
// Your existing HTML file is called mirablend.html.
app.get("/", (req, res) => {

    res.sendFile(__dirname + "/public/mirablend.html");

});


// ======================================================
// SQLITE DATABASE
// ======================================================

// SQLite creates orders.db automatically if it doesn't exist.
//
// This file stores our business orders.
const db = new sqlite3.Database("./orders.db", (err) => {

    if (err) {

        console.error(
            "Database connection failed:",
            err.message
        );

    } else {

        console.log(
            "SQLite database connected successfully."
        );

    }

});


// ======================================================
// CREATE ORDERS TABLE
// ======================================================

// This creates the orders table if it doesn't exist.
//
// Think of it like an Excel spreadsheet:
//
// ID | Product | Quantity | Address | Phone | Status
//
db.run(`
    CREATE TABLE IF NOT EXISTS orders (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        product TEXT NOT NULL,

        quantity INTEGER NOT NULL,

        address TEXT NOT NULL,

        phone TEXT NOT NULL,

        status TEXT NOT NULL DEFAULT 'Pending',

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP

    )
`, (err) => {

    if (err) {

        console.error(
            "Could not create orders table:",
            err.message
        );

    } else {

        console.log("Orders table is ready.");

    }

});


// ======================================================
// DATABASE MIGRATION
// ======================================================

// If you created orders.db earlier,
// the old table may not have the "status" column.
//
// This checks whether status already exists.
//
// If it doesn't exist, we add it.
//
db.all(`PRAGMA table_info(orders)`, [], (err, columns) => {

    if (err) {

        console.error(
            "Could not inspect orders table:",
            err.message
        );

        return;
    }


    const hasStatusColumn = columns.some(
        column => column.name === "status"
    );


    if (!hasStatusColumn) {

        db.run(
            `ALTER TABLE orders
             ADD COLUMN status TEXT NOT NULL DEFAULT 'Pending'`,
            (alterErr) => {

                if (alterErr) {

                    console.error(
                        "Could not add status column:",
                        alterErr.message
                    );

                } else {

                    console.log(
                        "Status column added to orders table."
                    );

                }

            }
        );

    }

});


// ======================================================
// CUSTOMER CREATES ORDER
// ======================================================

// The customer website sends an order here:
//
// POST /api/orders
//
// This route does NOT require admin login.
//
// Customers need to be able to place orders.
app.post("/api/orders", (req, res) => {

    // Get the customer's information.
    const {
        product,
        quantity,
        address,
        phone
    } = req.body;


    // ==================================================
    // VALIDATION
    // ==================================================

    // Make sure the customer supplied everything.
    if (
        !product ||
        !quantity ||
        !address ||
        !phone
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Please provide all order information."

        });

    }


    // ==================================================
    // SAVE ORDER
    // ==================================================

    const sql = `
        INSERT INTO orders
        (
            product,
            quantity,
            address,
            phone,
            status
        )

        VALUES (?, ?, ?, ?, 'Pending')
    `;


    const values = [
        product,
        quantity,
        address,
        phone
    ];


    db.run(sql, values, function (err) {

        if (err) {

            console.error(
                "Could not save order:",
                err.message
            );

            return res.status(500).json({

                success: false,

                message:
                    "Could not save order."

            });

        }


        // SQLite gives the new order a unique ID.
        console.log(
            "New order saved. ID:",
            this.lastID
        );


        // Tell the customer's browser that
        // the order was successfully saved.
        res.status(201).json({

            success: true,

            message:
                "Order saved successfully.",

            orderId:
                this.lastID

        });

    });

});


// ======================================================
// ADMIN LOGIN
// ======================================================

// The admin page sends:
//
// POST /api/admin/login
//
// with the password.
app.post("/api/admin/login", (req, res) => {

    const { password } = req.body;


    // Compare the entered password with
    // the password stored in .env.
    if (
        password === process.env.ADMIN_PASSWORD
    ) {

        // Login successful.
        req.session.isAdmin = true;


        return res.json({

            success: true,

            message: "Admin login successful."

        });

    }


    // Wrong password.
    res.status(401).json({

        success: false,

        message: "Incorrect password."

    });

});


// ======================================================
// CHECK ADMIN LOGIN
// ======================================================

// This protects our admin API.
//
// Only somebody who has logged in can access orders.
function requireAdmin(req, res, next) {

    if (req.session.isAdmin) {

        next();

    } else {

        res.status(401).json({

            success: false,

            message: "Admin login required."

        });

    }

}


// ======================================================
// CHECK CURRENT ADMIN SESSION
// ======================================================

// The admin page uses this to know whether
// the administrator is already logged in.
app.get(
    "/api/admin/me",
    (req, res) => {

        res.json({

            loggedIn:
                !!req.session.isAdmin

        });

    }
);


// ======================================================
// ADMIN LOGOUT
// ======================================================

app.post(
    "/api/admin/logout",
    requireAdmin,
    (req, res) => {

        req.session.destroy(() => {

            res.json({

                success: true,

                message:
                    "Logged out successfully."

            });

        });

    }
);


// ======================================================
// GET ALL ORDERS
// ======================================================

// Only the administrator can see customer orders.
app.get(
    "/api/orders",
    requireAdmin,
    (req, res) => {

        const sql = `
            SELECT *

            FROM orders

            ORDER BY id DESC
        `;


        db.all(sql, [], (err, rows) => {

            if (err) {

                console.error(
                    "Could not get orders:",
                    err.message
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Could not get orders."

                });

            }


            res.json({

                success: true,

                orders: rows

            });

        });

    }
);


// ======================================================
// UPDATE ORDER STATUS
// ======================================================

// The admin can change an order to:
//
// Pending
// Processing
// Completed
// Cancelled
//
app.patch(
    "/api/orders/:id/status",
    requireAdmin,
    (req, res) => {

        const orderId = req.params.id;

        const { status } = req.body;


        // Only these statuses are allowed.
        const allowedStatuses = [
            "Pending",
            "Processing",
            "Completed",
            "Cancelled"
        ];


        // Make sure the status is valid.
        if (!allowedStatuses.includes(status)) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid order status."

            });

        }


        const sql = `
            UPDATE orders

            SET status = ?

            WHERE id = ?
        `;


        db.run(
            sql,
            [status, orderId],
            function (err) {

                if (err) {

                    console.error(
                        "Could not update status:",
                        err.message
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            "Could not update order."

                    });

                }


                // If no row was changed,
                // the order ID doesn't exist.
                if (this.changes === 0) {

                    return res.status(404).json({

                        success: false,

                        message:
                            "Order not found."

                    });

                }


                res.json({

                    success: true,

                    message:
                        "Order status updated."

                });

            }
        );

    }
);


// ======================================================
// START SERVER
// ======================================================

app.listen(PORT, () => {

    console.log("----------------------------------");

    console.log(
        "Mira's Blend server is running."
    );

    console.log(
        `http://localhost:${PORT}`
    );

    console.log("----------------------------------");

});
 