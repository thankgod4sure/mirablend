// ======================================================
// MIRA'S BLEND
// POSTGRESQL BACKEND SERVER
// ======================================================

const express = require("express");
const { Pool } = require("pg");
require("dotenv").config();
const session = require("express-session");


// ======================================================
// CREATE EXPRESS APP
// ======================================================

const app = express();
app.set("trust proxy", 1);

// ======================================================
// PORT
// ======================================================

// Render provides its own PORT.
// Locally we use 3000.
const PORT = process.env.PORT || 3000;


// ======================================================
// MIDDLEWARE
// ======================================================

app.use(express.json());

app.use(express.urlencoded({ extended: true }));


// ======================================================
// ADMIN LOGIN SESSION
// ======================================================
 app.use(
    session({
        secret: process.env.SESSION_SECRET,

        resave: false,

        saveUninitialized: false,

        cookie: {
            httpOnly: true,

            secure: true,

            sameSite: "lax",

            maxAge: 1000 * 60 * 60 * 8
        }
    })
);

// ======================================================
// SERVE WEBSITE
// ======================================================

app.use(express.static("public"));


// ======================================================
// HOME PAGE
// ======================================================

app.get("/", (req, res) => {

    res.sendFile(__dirname + "/public/index.html");

});


// ======================================================
// POSTGRESQL DATABASE
// ======================================================
 
const pool = new Pool({

    connectionString: process.env.DATABASE_URL,

    ssl: { rejectUnauthorized: false }

});

// ======================================================
// DATABASE CONNECTION TEST
// ======================================================

pool.connect()
    .then(client => {

        console.log(
            "PostgreSQL database connected successfully."
        );

        client.release();

    })
    .catch(error => {

        console.error(
            "Database connection failed:",
            error.message
        );

    });


// ======================================================
// CREATE ORDERS TABLE
// ======================================================

async function createOrdersTable() {

    try {

        await pool.query(`

            CREATE TABLE IF NOT EXISTS orders (

                id SERIAL PRIMARY KEY,

                product TEXT NOT NULL,

                quantity INTEGER NOT NULL,

                address TEXT NOT NULL,

                phone TEXT NOT NULL,

                status TEXT NOT NULL DEFAULT 'Pending',

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

            )

        `);

        console.log("Orders table is ready.");

    } catch (error) {

        console.error(
            "Could not create orders table:",
            error.message
        );

    }

}

createOrdersTable();


// ======================================================
// CUSTOMER CREATES ORDER
// ======================================================

app.post("/api/orders", async (req, res) => {

    const {
        product,
        quantity,
        address,
        phone
    } = req.body;


    // ==================================================
    // VALIDATION
    // ==================================================

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

    try {

        const result = await pool.query(

            `
            INSERT INTO orders
            (
                product,
                quantity,
                address,
                phone,
                status
            )

            VALUES ($1, $2, $3, $4, 'Pending')

            RETURNING id
            `,

            [
                product,
                quantity,
                address,
                phone
            ]

        );


        const orderId = result.rows[0].id;


        console.log(
            "New order saved. ID:",
            orderId
        );


        res.status(201).json({

            success: true,

            message:
                "Order saved successfully.",

            orderId:
                orderId

        });


    } catch (error) {

        console.error(
            "Could not save order:",
            error.message
        );


        res.status(500).json({

            success: false,

            message:
                "Could not save order."

        });

    }

});


// ======================================================
// ADMIN LOGIN
// ======================================================

app.post("/api/admin/login", (req, res) => {

    const { password } = req.body;


    if (
        password === process.env.ADMIN_PASSWORD
    ) {

        req.session.isAdmin = true;


        return res.json({

            success: true,

            message:
                "Admin login successful."

        });

    }


    res.status(401).json({

        success: false,

        message:
            "Incorrect password."

    });

});


// ======================================================
// CHECK ADMIN LOGIN
// ======================================================

function requireAdmin(req, res, next) {

    if (req.session.isAdmin) {

        next();

    } else {

        res.status(401).json({

            success: false,

            message:
                "Admin login required."

        });

    }

}


// ======================================================
// CHECK CURRENT ADMIN SESSION
// ======================================================

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

app.get(
    "/api/orders",
    requireAdmin,
    async (req, res) => {

        try {

            const result = await pool.query(`

                SELECT *

                FROM orders

                ORDER BY id DESC

            `);


            res.json({

                success: true,

                orders: result.rows

            });


        } catch (error) {

            console.error(
                "Could not get orders:",
                error.message
            );


            res.status(500).json({

                success: false,

                message:
                    "Could not get orders."

            });

        }

    }
);


// ======================================================
// UPDATE ORDER STATUS
// ======================================================

app.patch(
    "/api/orders/:id/status",
    requireAdmin,
    async (req, res) => {

        const orderId = req.params.id;

        const { status } = req.body;


        // ==================================================
        // ALLOWED STATUSES
        // ==================================================

        const allowedStatuses = [

            "Pending",

            "Processing",

            "Completed",

            "Cancelled"

        ];


        if (
            !allowedStatuses.includes(status)
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid order status."

            });

        }


        try {

            const result = await pool.query(

                `
                UPDATE orders

                SET status = $1

                WHERE id = $2

                RETURNING id
                `,

                [
                    status,
                    orderId
                ]

            );


            if (result.rowCount === 0) {

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


        } catch (error) {

            console.error(
                "Could not update status:",
                error.message
            );


            res.status(500).json({

                success: false,

                message:
                    "Could not update order."

            });

        }

    }
);


// ======================================================
// START SERVER
// ======================================================

app.listen(PORT, () => {

    console.log(
        "----------------------------------"
    );

    console.log(
        "Mira's Blend server is running."
    );

    console.log(
        `Port: ${PORT}`
    );

    console.log(
        "----------------------------------"
    );

});
 