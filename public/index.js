// const menuToggle = document.querySelector(".menu-toggle");
// const navLinks = document.querySelector(".nav-links");

// menuToggle.addEventListener("click", () => {
//     navLinks.classList.toggle("active");
// });
const menuToggle = document.querySelector(".menu-toggle");
const menuCancel = document.querySelector(".menu-cancel");
const navLinks = document.querySelector(".nav-links");

menuToggle.addEventListener("click", () => {
    navLinks.classList.add("active");
    menuToggle.classList.add("hide");
    menuCancel.classList.add("active");
});

menuCancel.addEventListener("click", () => {
    navLinks.classList.remove("active");
    menuToggle.classList.remove("hide");
    menuCancel.classList.remove("active");
});

//  window.addEventListener("load", function () {

//     const loader = document.querySelector(".loader");

//     setTimeout(function () {

//         loader.classList.add("hide");

//     }, 7000);

// });
const loader = document.querySelector(".loader");
const hero = document.querySelector("#hero");

window.addEventListener("load", () => {
    setTimeout(() => {
        loader.classList.add("hide");
        hero.classList.add("animate");
    }, 3000);
});
const orderBtns = document.querySelectorAll(".order-btn");
const ordersBtns = document.getElementById(".orders-btn");
const modal = document.getElementById("orderModal");

const closeModal = document.querySelector(".close-modal");

const productInput = document.getElementById("productName");

const orderForm = document.getElementById("orderForm");

const phoneNumber = "2348146967737"; // YOUR NUMBER

orderBtns.forEach(button=>{

button.addEventListener("click",function(e){

e.preventDefault();

modal.style.display="flex";

productInput.value=this.dataset.product;

});

});

closeModal.addEventListener("click",()=>{

modal.style.display="none";

});

window.addEventListener("click",(e)=>{

if(e.target===modal){

modal.style.display="none";

}

});
 // ======================================================
// SEND CUSTOMER ORDER
// ======================================================

orderForm.addEventListener("submit", async function(e) {

    // Stop the browser from refreshing the page.
    e.preventDefault();


    // Get the customer's order information.
    const product =
        productInput.value;

    const quantity =
        document.getElementById("quantity").value;

    const address =
        document.getElementById("address").value;

    const phone =
        document.getElementById("phone").value;


    // ==================================================
    // SAVE ORDER TO DATABASE
    // ==================================================

    try {

        // Send the order to Express.
        const response = await fetch(
            "/api/orders",
            {

                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    product: product,

                    quantity: quantity,

                    address: address,

                    phone: phone

                })

            }
        );


        // Get the server response.
        const data =
            await response.json();


        // If the server rejected the order...
        if (!data.success) {

            alert(
                data.message ||
                "Could not save order."
            );

            return;

        }


        // ==================================================
        // AFTER DATABASE SAVES SUCCESSFULLY
        // OPEN WHATSAPP
        // ==================================================

        const message =
`Hello Mira's Blend! 👋

I would like to place an order.

Product: ${product}

Quantity: ${quantity}

Delivery Address:
${address}

Phone Number:
${phone}

Order ID:
#${data.orderId}

Thank you.`;


        const url =
            `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;


        // Open WhatsApp.
        window.open(
            url,
            "_blank"
        );


        // Close the order modal.
        modal.style.display = "none";


        // Clear the form.
        orderForm.reset();


        // Tell the customer the order was saved.
        alert(
            "Order received successfully!"
        );


    } catch (error) {

        // Show error in console.
        console.error(
            "Order error:",
            error
        );


        alert(
            "Something went wrong. Please try again."
        );

    }

});