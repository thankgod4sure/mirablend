 // ======================================================
// MIRA'S BLEND ADMIN JAVASCRIPT
// ======================================================


// ======================================================
// GET HTML ELEMENTS
// ======================================================

const loginScreen =
    document.getElementById("loginScreen");

const dashboard =
    document.getElementById("dashboard");

const loginForm =
    document.getElementById("loginForm");

const adminPassword =
    document.getElementById("adminPassword");

const loginMessage =
    document.getElementById("loginMessage");

const logoutButton =
    document.getElementById("logoutButton");

const refreshButton =
    document.getElementById("refreshButton");

const ordersContainer =
    document.getElementById("ordersContainer");


// ======================================================
// STATISTICS ELEMENTS
// ======================================================

const totalOrders =
    document.getElementById("totalOrders");

const pendingOrders =
    document.getElementById("pendingOrders");

const processingOrders =
    document.getElementById("processingOrders");

const completedOrders =
    document.getElementById("completedOrders");

const cancelledOrders =
    document.getElementById("cancelledOrders");


// ======================================================
// CHECK IF ADMIN IS ALREADY LOGGED IN
// ======================================================

async function checkLogin() {

    try {

        const response =
            await fetch("/api/admin/me");

        const data =
            await response.json();


        if (data.loggedIn) {

            showDashboard();

        } else {

            showLogin();

        }

    } catch (error) {

        console.error(
            "Could not check login:",
            error
        );

    }

}


// ======================================================
// SHOW LOGIN
// ======================================================

function showLogin() {

    loginScreen.classList.remove("hidden");

    dashboard.classList.add("hidden");

}


// ======================================================
// SHOW DASHBOARD
// ======================================================

function showDashboard() {

    loginScreen.classList.add("hidden");

    dashboard.classList.remove("hidden");

    loadOrders();

}


// ======================================================
// ADMIN LOGIN
// ======================================================

loginForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const password =
            adminPassword.value;


        loginMessage.textContent =
            "Signing in...";


        try {

            const response =
                await fetch(
                    "/api/admin/login",
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            password: password
                        })

                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                loginMessage.textContent =
                    data.message ||
                    "Login failed.";

                return;

            }


            loginMessage.textContent = "";

            adminPassword.value = "";

            showDashboard();


        } catch (error) {

            console.error(error);

            loginMessage.textContent =
                "Could not connect to server.";

        }

    }
);


// ======================================================
// LOAD ORDERS
// ======================================================

async function loadOrders() {

    ordersContainer.innerHTML = `
        <div class="empty-orders">
            Loading orders...
        </div>
    `;


    try {

        const response =
            await fetch("/api/orders");


        // If admin session expired.
        if (response.status === 401) {

            showLogin();

            return;

        }


        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                data.message
            );

        }


        displayOrders(data.orders);

        updateStatistics(data.orders);


    } catch (error) {

        console.error(
            "Could not load orders:",
            error
        );


        ordersContainer.innerHTML = `
            <div class="empty-orders">
                Could not load orders.
            </div>
        `;

    }

}


// ======================================================
// DISPLAY ORDERS
// ======================================================

function displayOrders(orders) {


    // If there are no orders.
    if (orders.length === 0) {

        ordersContainer.innerHTML = `
            <div class="empty-orders">

                <h3>No orders yet.</h3>

                <p>
                    Customer orders will appear here.
                </p>

            </div>
        `;

        return;

    }


    // Create HTML for every order.
    ordersContainer.innerHTML =
        orders.map(order => {


            // Format the date.
            const date =
                new Date(
                    order.created_at
                ).toLocaleString();


            return `

                <article class="order-card">

                    <div class="order-top">

                        <span class="order-number">
                            Order #${order.id}
                        </span>

                        <span class="order-date">
                            ${date}
                        </span>

                    </div>


                    <div class="order-details">


                        <div class="detail">

                            <span>
                                Product
                            </span>

                            <strong>
                                ${escapeHTML(
                                    order.product
                                )}
                            </strong>

                        </div>


                        <div class="detail">

                            <span>
                                Quantity
                            </span>

                            <strong>
                                ${order.quantity}
                            </strong>

                        </div>


                        <div class="detail">

                            <span>
                                Phone
                            </span>

                            <strong>
                                ${escapeHTML(
                                    order.phone
                                )}
                            </strong>

                        </div>


                        <div class="detail">

                            <span>
                                Delivery Address
                            </span>

                            <strong>
                                ${escapeHTML(
                                    order.address
                                )}
                            </strong>

                        </div>


                    </div>


                    <div class="status-area">


                        <span
                            class="
                                status-badge
                                status-${order.status}
                            "
                        >

                            ${order.status}

                        </span>


                        <select
                            class="status-select"
                            onchange="
                                updateStatus(
                                    ${order.id},
                                    this.value
                                )
                            "
                        >

                            <option
                                value="Pending"
                                ${order.status === "Pending"
                                    ? "selected"
                                    : ""}
                            >
                                Pending
                            </option>


                            <option
                                value="Processing"
                                ${order.status === "Processing"
                                    ? "selected"
                                    : ""}
                            >
                                Processing
                            </option>


                            <option
                                value="Completed"
                                ${order.status === "Completed"
                                    ? "selected"
                                    : ""}
                            >
                                Completed
                            </option>


                            <option
                                value="Cancelled"
                                ${order.status === "Cancelled"
                                    ? "selected"
                                    : ""}
                            >
                                Cancelled
                            </option>

                        </select>


                    </div>

                </article>

            `;

        }).join("");

}


// ======================================================
// UPDATE ORDER STATUS
// ======================================================

async function updateStatus(
    orderId,
    newStatus
) {

    try {

        const response =
            await fetch(
                `/api/orders/${orderId}/status`,
                {

                    method: "PATCH",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        status: newStatus
                    })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.message ||
                "Could not update order."
            );

            return;

        }


        // Reload the orders so the
        // dashboard immediately shows
        // the new status.
        loadOrders();


    } catch (error) {

        console.error(error);

        alert(
            "Could not connect to server."
        );

    }

}


// ======================================================
// UPDATE DASHBOARD NUMBERS
// ======================================================

function updateStatistics(orders) {

    totalOrders.textContent =
        orders.length;


    pendingOrders.textContent =
        orders.filter(
            order =>
                order.status === "Pending"
        ).length;


    processingOrders.textContent =
        orders.filter(
            order =>
                order.status === "Processing"
        ).length;


    completedOrders.textContent =
        orders.filter(
            order =>
                order.status === "Completed"
        ).length;


    cancelledOrders.textContent =
        orders.filter(
            order =>
                order.status === "Cancelled"
        ).length;

}


// ======================================================
// REFRESH BUTTON
// ======================================================

refreshButton.addEventListener(
    "click",
    loadOrders
);


// ======================================================
// LOGOUT
// ======================================================

logoutButton.addEventListener(
    "click",
    async function () {

        try {

            await fetch(
                "/api/admin/logout",
                {
                    method: "POST"
                }
            );


            showLogin();


        } catch (error) {

            console.error(error);

        }

    }
);


// ======================================================
// BASIC HTML SAFETY
// ======================================================

// This prevents customer-entered text from
// being interpreted as HTML inside the admin page.
function escapeHTML(value) {

    return String(value)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

}


// ======================================================
// START ADMIN PAGE
// ======================================================

checkLogin();