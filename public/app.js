
/* =====================================
   ROOMEASE - MAIN JAVASCRIPT
===================================== */


/* =====================================
   1. API CONFIGURATION
===================================== */

const API_BASE = "/api";

const API = {
    roommates: `${API_BASE}/roommates`,
    chores: `${API_BASE}/chores`,
    expenses: `${API_BASE}/expenses`,
    groceries: `${API_BASE}/groceries`,
    inventory: `${API_BASE}/inventory`,
    bookings: `${API_BASE}/bookings`,
    notifications: `${API_BASE}/notifications`,
    announcements: `${API_BASE}/announcements`,
    rules: `${API_BASE}/rules`
};


/* =====================================
   2. GLOBAL DATA
===================================== */

let roommates = [];
let chores = [];
let expenses = [];
let groceries = [];
let inventory = [];
let bookings = [];
let notifications = [];
let rules = [];


/* =====================================
   3. HELPER FUNCTIONS
===================================== */

// Get an HTML element by its ID

function getElement(id) {
    return document.getElementById(id);
}


// Display a message

function showMessage(elementId, message, isError = false) {
    const element = getElement(elementId);

    if (!element) return;

    element.textContent = message;
    element.style.color = isError ? "#d64545" : "#35a879";
}


// Format currency

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(Number(amount) || 0);
}


// Format dates

function formatDate(date) {
    if (!date) return "Not specified";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return date;
    }

    return parsedDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}


// Create an HTML element safely

function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;
}


// Get a value from an input

function getValue(id) {
    const element = getElement(id);

    return element ? element.value.trim() : "";
}


// Make API requests

async function apiRequest(url, method = "GET", data = null) {

    const options = {
        method,
        headers: {
            "Content-Type": "application/json"
        }
    };

    if (data !== null) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        throw new Error(
            errorData.message || `Request failed: ${response.status}`
        );
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}


// Get an array from an API response

function getArray(response) {
    if (Array.isArray(response)) {
        return response;
    }

    return response?.data || [];
}


// Get a roommate's name using their ID

function getRoommateName(id) {
    const roommate = roommates.find(
        person => String(person.id) === String(id)
    );

    return roommate ? roommate.name : "Unknown roommate";
}


// Create a card for a list

function createCard(title, details = []) {

    const card = createElement("div", "roommate-card");

    const heading = createElement("h3", "", title);
    card.appendChild(heading);

    details.forEach(detail => {
        if (detail.value === null || detail.value === undefined || detail.value === "") {
            return;
        }

        const paragraph = createElement(
            "p",
            "",
            `${detail.label}: ${detail.value}`
        );

        card.appendChild(paragraph);
    });

    return card;
}


// Add a button to a card

function addCardButton(card, label, className, callback) {

    const button = createElement("button", className, label);

    button.type = "button";
    button.addEventListener("click", callback);

    card.appendChild(button);
}


// Show an empty-list message

function showEmptyMessage(container, message) {

    container.replaceChildren();

    const empty = createElement("p", "empty-message", message);

    container.appendChild(empty);
}


/* =====================================
   4. LOAD DATA FROM BACKEND
===================================== */

async function loadData() {

    try {

        const results = await Promise.all([
            apiRequest(API.roommates),
            apiRequest(API.chores),
            apiRequest(API.expenses),
            apiRequest(API.groceries),
            apiRequest(API.inventory),
            apiRequest(API.bookings),
            apiRequest(API.notifications),
            apiRequest(API.rules)
        ]);

        roommates = getArray(results[0]);
        chores = getArray(results[1]);
        expenses = getArray(results[2]);
        groceries = getArray(results[3]);
        inventory = getArray(results[4]);
        bookings = getArray(results[5]);
        notifications = getArray(results[6]);
        rules = getArray(results[7]);

        populateRoommateDropdowns();

        renderAllPages();

    } catch (error) {

        console.error("Unable to load RoomEase data:", error);

        showPageError(
            "Unable to connect to the RoomEase server. Make sure the backend is running."
        );
    }
}


// Display a server connection error

function showPageError(message) {

    const main = document.querySelector("main");

    if (!main) return;

    const error = createElement("p", "empty-message", message);

    main.prepend(error);
}


/* =====================================
   5. POPULATE ROOMMATE DROPDOWNS
===================================== */

function populateRoommateDropdowns() {

    const dropdownIds = [
        "chore-assignee",
        "expense-paid-by",
        "grocery-added-by",
        "inventory-owner",
        "booking-roommate",
        "announcement-by",
        "rule-created-by"
    ];

    dropdownIds.forEach(id => {

        const dropdown = getElement(id);

        if (!dropdown) return;

        const existingValue = dropdown.value;

        // Keep existing options such as "Shared" or "Other".
        const originalOptions = Array.from(dropdown.options).map(option => ({
            value: option.value,
            text: option.textContent
        }));

        dropdown.replaceChildren();

        originalOptions.forEach(optionData => {

            const option = document.createElement("option");

            option.value = optionData.value;
            option.textContent = optionData.text;

            dropdown.appendChild(option);
        });

        roommates.forEach(roommate => {

            const alreadyExists = Array.from(dropdown.options).some(
                option => option.value === String(roommate.id)
            );

            if (alreadyExists) return;

            const option = document.createElement("option");

            option.value = roommate.id;
            option.textContent = roommate.name;

            dropdown.appendChild(option);
        });

        if (
            Array.from(dropdown.options).some(
                option => option.value === existingValue
            )
        ) {
            dropdown.value = existingValue;
        }
    });
}


/* =====================================
   6. ROOMMATES PAGE
===================================== */

function renderRoommates() {

    const container = getElement("roommate-list");

    if (!container) return;

    container.replaceChildren();

    const count = getElement("roommate-count");

    if (count) {
        count.textContent = `${roommates.length} Roommates`;
    }

    if (roommates.length === 0) {
        showEmptyMessage(container, "No roommates added yet.");
        return;
    }

    roommates.forEach(roommate => {

        const card = createCard(roommate.name, [
            {
                label: "Email",
                value: roommate.email || "Not provided"
            }
        ]);

        addCardButton(
            card,
            "Delete",
            "delete-button",
            () => deleteItem(API.roommates, roommate.id, "roommate")
        );

        container.appendChild(card);
    });
}


async function addRoommate(event) {

    event.preventDefault();

    const name = getValue("roommate-name");
    const email = getValue("roommate-email");

    if (!name) {
        showMessage("form-message", "Please enter a roommate name.", true);
        return;
    }

    try {

        await apiRequest(API.roommates, "POST", {
            name,
            email
        });

        getElement("roommate-form").reset();

        showMessage("form-message", "Roommate added successfully!");

        await loadData();

    } catch (error) {

        showMessage("form-message", error.message, true);
    }
}


/* =====================================
   7. CHORES PAGE
===================================== */

function renderChores() {

    const container = getElement("chore-list");

    if (!container) return;

    container.replaceChildren();

    const completed = chores.filter(
        chore => chore.status === "completed"
    ).length;

    const pending = chores.length - completed;

    if (getElement("total-chores")) {
        getElement("total-chores").textContent = chores.length;
    }

    if (getElement("pending-chores")) {
        getElement("pending-chores").textContent = pending;
    }

    if (getElement("completed-chores")) {
        getElement("completed-chores").textContent = completed;
    }

    if (chores.length === 0) {
        showEmptyMessage(container, "No chores added yet.");
        return;
    }

    chores.forEach(chore => {

        const card = createCard(chore.name, [
            {
                label: "Assigned to",
                value: getRoommateName(chore.assignee_id)
            },
            {
                label: "Due date",
                value: formatDate(chore.due_date)
            },
            {
                label: "Status",
                value: chore.status || "pending"
            }
        ]);

        if (chore.status !== "completed") {

            addCardButton(
                card,
                "Mark Completed",
                "add-button",
                () => updateItem(
                    API.chores,
                    chore.id,
                    { status: "completed" },
                    "chore"
                )
            );

        } else {

            addCardButton(
                card,
                "Completed",
                "status-badge",
                () => {}
            );
        }

        addCardButton(
            card,
            "Delete",
            "delete-button",
            () => deleteItem(API.chores, chore.id, "chore")
        );

        container.appendChild(card);
    });
}


async function addChore(event) {

    event.preventDefault();

    const name = getValue("chore-name");
    const assigneeId = getValue("chore-assignee");
    const dueDate = getValue("chore-due-date");

    if (!name || !assigneeId) {
        showMessage(
            "chore-message",
            "Enter a chore name and select a roommate.",
            true
        );
        return;
    }

    try {

        await apiRequest(API.chores, "POST", {
            name,
            assignee_id: Number(assigneeId),
            due_date: dueDate,
            status: "pending"
        });

        getElement("chore-form").reset();

        showMessage("chore-message", "Chore added successfully!");

        await loadData();

    } catch (error) {

        showMessage("chore-message", error.message, true);
    }
}


/* =====================================
   8. EXPENSES PAGE
===================================== */

function renderExpenses() {

    const container = getElement("expense-list");

    if (!container) return;

    container.replaceChildren();

    const total = expenses.reduce(
        (sum, expense) => sum + Number(expense.amount || 0),
        0
    );

    const average = expenses.length ? total / expenses.length : 0;

    if (getElement("total-expenses")) {
        getElement("total-expenses").textContent = formatCurrency(total);
    }

    if (getElement("total-transactions")) {
        getElement("total-transactions").textContent = expenses.length;
    }

    if (getElement("average-expense")) {
        getElement("average-expense").textContent = formatCurrency(average);
    }

    if (expenses.length === 0) {
        showEmptyMessage(container, "No expenses recorded yet.");
    } else {

        expenses.forEach(expense => {

            const card = createCard(expense.title, [
                {
                    label: "Amount",
                    value: formatCurrency(expense.amount)
                },
                {
                    label: "Category",
                    value: expense.category
                },
                {
                    label: "Paid by",
                    value: getRoommateName(expense.paid_by)
                },
                {
                    label: "Date",
                    value: formatDate(expense.date)
                },
                {
                    label: "Notes",
                    value: expense.notes
                }
            ]);

            addCardButton(
                card,
                "Delete",
                "delete-button",
                () => deleteItem(API.expenses, expense.id, "expense")
            );

            container.appendChild(card);
        });
    }

    renderExpenseSummary();
}


function renderExpenseSummary() {

    const container = getElement("expense-summary");

    if (!container) return;

    container.replaceChildren();

    const heading = createElement("h3", "", "Expense Summary");
    container.appendChild(heading);

    if (expenses.length === 0) {

        container.appendChild(
            createElement("p", "", "No expense information available.")
        );

        return;
    }

    const total = expenses.reduce(
        (sum, expense) => sum + Number(expense.amount || 0),
        0
    );

    container.appendChild(
        createElement("p", "", `Total household expenses: ${formatCurrency(total)}`)
    );
}


async function addExpense(event) {

    event.preventDefault();

    const title = getValue("expense-title");
    const category = getValue("expense-category");
    const amount = Number(getValue("expense-amount"));
    const paidBy = getValue("expense-paid-by");
    const date = getValue("expense-date");
    const notes = getValue("expense-notes");

    if (!title || !category || !amount || amount <= 0 || !paidBy) {
        showMessage(
            "expense-message",
            "Please fill in the required expense details.",
            true
        );
        return;
    }

    try {

        await apiRequest(API.expenses, "POST", {
            title,
            category,
            amount,
            paid_by: Number(paidBy),
            date,
            notes
        });

        getElement("expense-form").reset();

        showMessage("expense-message", "Expense recorded successfully!");

        await loadData();

    } catch (error) {

        showMessage("expense-message", error.message, true);
    }
}


/* =====================================
   9. GROCERIES PAGE
===================================== */

function renderGroceries() {

    const pendingContainer = getElement("grocery-list");
    const purchasedContainer = getElement("purchased-grocery-list");

    if (!pendingContainer || !purchasedContainer) return;

    pendingContainer.replaceChildren();
    purchasedContainer.replaceChildren();

    const pending = groceries.filter(
        item => item.status !== "purchased"
    );

    const purchased = groceries.filter(
        item => item.status === "purchased"
    );

    if (getElement("total-groceries")) {
        getElement("total-groceries").textContent = groceries.length;
    }

    if (getElement("pending-groceries")) {
        getElement("pending-groceries").textContent = pending.length;
    }

    if (getElement("purchased-groceries")) {
        getElement("purchased-groceries").textContent = purchased.length;
    }

    if (pending.length === 0) {
        showEmptyMessage(pendingContainer, "No pending grocery items.");
    }

    if (purchased.length === 0) {
        showEmptyMessage(purchasedContainer, "No purchased items yet.");
    }

    pending.forEach(item => {

        const card = createCard(item.name, [
            {
                label: "Category",
                value: item.category
            },
            {
                label: "Quantity",
                value: `${item.quantity || 1} ${item.unit || ""}`
            },
            {
                label: "Added by",
                value: getRoommateName(item.added_by)
            }
        ]);

        addCardButton(
            card,
            "Mark Purchased",
            "add-button",
            () => updateItem(
                API.groceries,
                item.id,
                { status: "purchased" },
                "grocery"
            )
        );

        addCardButton(
            card,
            "Delete",
            "delete-button",
            () => deleteItem(API.groceries, item.id, "grocery")
        );

        pendingContainer.appendChild(card);
    });

    purchased.forEach(item => {

        const card = createCard(item.name, [
            {
                label: "Quantity",
                value: `${item.quantity || 1} ${item.unit || ""}`
            },
            {
                label: "Status",
                value: "Purchased"
            }
        ]);

        addCardButton(
            card,
            "Delete",
            "delete-button",
            () => deleteItem(API.groceries, item.id, "grocery")
        );

        purchasedContainer.appendChild(card);
    });
}


async function addGrocery(event) {

    event.preventDefault();

    const name = getValue("grocery-name");
    const category = getValue("grocery-category");
    const quantity = Number(getValue("grocery-quantity")) || 1;
    const unit = getValue("grocery-unit");
    const addedBy = getValue("grocery-added-by");

    if (!name || !addedBy) {
        showMessage(
            "grocery-message",
            "Please enter an item name and select who added it.",
            true
        );
        return;
    }

    try {

        await apiRequest(API.groceries, "POST", {
            name,
            category,
            quantity,
            unit,
            added_by: Number(addedBy),
            status: "pending"
        });

        getElement("grocery-form").reset();

        showMessage("grocery-message", "Grocery item added!");

        await loadData();

    } catch (error) {

        showMessage("grocery-message", error.message, true);
    }
}


/* =====================================
   10. INVENTORY PAGE
===================================== */

function renderInventory() {

    const container = getElement("inventory-list");

    if (!container) return;

    container.replaceChildren();

    const available = inventory.filter(
        item => item.condition === "Available"
    ).length;

    const damaged = inventory.filter(
        item => item.condition === "Damaged" ||
                item.condition === "Needs Repair"
    ).length;

    if (getElement("total-inventory")) {
        getElement("total-inventory").textContent = inventory.length;
    }

    if (getElement("available-inventory")) {
        getElement("available-inventory").textContent = available;
    }

    if (getElement("damaged-inventory")) {
        getElement("damaged-inventory").textContent = damaged;
    }

    if (inventory.length === 0) {
        showEmptyMessage(container, "No inventory items added yet.");
        return;
    }

    inventory.forEach(item => {

        const owner = item.owner === "Shared"
            ? "Shared"
            : getRoommateName(item.owner);

        const card = createCard(item.name, [
            {
                label: "Category",
                value: item.category
            },
            {
                label: "Quantity",
                value: item.quantity
            },
            {
                label: "Owner",
                value: owner
            },
            {
                label: "Condition",
                value: item.condition
            },
            {
                label: "Notes",
                value: item.notes
            }
        ]);

        addCardButton(
            card,
            "Delete",
            "delete-button",
            () => deleteItem(API.inventory, item.id, "inventory item")
        );

        container.appendChild(card);
    });
}


async function addInventoryItem(event) {

    event.preventDefault();

    const name = getValue("inventory-name");
    const category = getValue("inventory-category");
    const quantity = Number(getValue("inventory-quantity")) || 1;
    const owner = getValue("inventory-owner");
    const condition = getValue("inventory-condition");
    const notes = getValue("inventory-notes");

    if (!name || !owner || !condition) {
        showMessage(
            "inventory-message",
            "Please fill in the required inventory details.",
            true
        );
        return;
    }

    try {

        await apiRequest(API.inventory, "POST", {
            name,
            category,
            quantity,
            owner: owner === "Shared" ? "Shared" : Number(owner),
            condition,
            notes
        });

        getElement("inventory-form").reset();

        showMessage("inventory-message", "Inventory item added!");

        await loadData();

    } catch (error) {

        showMessage("inventory-message", error.message, true);
    }
}


/* =====================================
   11. BOOKINGS PAGE
===================================== */

function renderBookings() {

    const container = getElement("booking-list");

    if (!container) return;

    container.replaceChildren();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = bookings.filter(booking => {
        const bookingDate = new Date(booking.date);
        return bookingDate >= today;
    });

    const completed = bookings.length - upcoming.length;

    if (getElement("total-bookings")) {
        getElement("total-bookings").textContent = bookings.length;
    }

    if (getElement("upcoming-bookings")) {
        getElement("upcoming-bookings").textContent = upcoming.length;
    }

    if (getElement("completed-bookings")) {
        getElement("completed-bookings").textContent = completed;
    }

    if (bookings.length === 0) {
        showEmptyMessage(container, "No bookings created yet.");
        return;
    }

    bookings.forEach(booking => {

        const card = createCard(booking.resource, [
            {
                label: "Booked by",
                value: getRoommateName(booking.roommate_id)
            },
            {
                label: "Date",
                value: formatDate(booking.date)
            },
            {
                label: "Start time",
                value: booking.start_time
            },
            {
                label: "End time",
                value: booking.end_time
            },
            {
                label: "Notes",
                value: booking.notes
            }
        ]);

        addCardButton(
            card,
            "Delete",
            "delete-button",
            () => deleteItem(API.bookings, booking.id, "booking")
        );

        container.appendChild(card);
    });
}


async function addBooking(event) {

    event.preventDefault();

    const resource = getValue("booking-resource");
    const otherResource = getValue("booking-other-resource");
    const roommateId = getValue("booking-roommate");
    const date = getValue("booking-date");
    const startTime = getValue("booking-start");
    const endTime = getValue("booking-end");
    const notes = getValue("booking-notes");

    const finalResource = resource === "Other"
        ? otherResource
        : resource;

    if (
        !finalResource ||
        !roommateId ||
        !date ||
        !startTime ||
        !endTime
    ) {
        showMessage(
            "booking-message",
            "Please complete all required booking details.",
            true
        );
        return;
    }

    if (startTime >= endTime) {
        showMessage(
            "booking-message",
            "End time must be later than start time.",
            true
        );
        return;
    }

    try {

        await apiRequest(API.bookings, "POST", {
            resource: finalResource,
            roommate_id: Number(roommateId),
            date,
            start_time: startTime,
            end_time: endTime,
            notes
        });

        getElement("booking-form").reset();

        showMessage("booking-message", "Booking created successfully!");

        await loadData();

    } catch (error) {

        showMessage("booking-message", error.message, true);
    }
}


/* =====================================
   12. NOTIFICATIONS PAGE
===================================== */

function renderNotifications() {

    const container = getElement("notification-list");

    if (!container) return;

    container.replaceChildren();

    const unread = notifications.filter(
        notification => !notification.is_read
    ).length;

    const read = notifications.length - unread;

    if (getElement("total-notifications")) {
        getElement("total-notifications").textContent = notifications.length;
    }

    if (getElement("unread-notifications")) {
        getElement("unread-notifications").textContent = unread;
    }

    if (getElement("read-notifications")) {
        getElement("read-notifications").textContent = read;
    }

    const filter = getValue("notification-filter") || "all";

    let filtered = notifications;

    if (filter === "unread") {
        filtered = notifications.filter(item => !item.is_read);
    } else if (filter === "read") {
        filtered = notifications.filter(item => item.is_read);
    } else if (
        !["all", "unread", "read"].includes(filter)
    ) {
        filtered = notifications.filter(
            item => item.category === filter
        );
    }

    if (filtered.length === 0) {
        showEmptyMessage(container, "No notifications to display.");
        return;
    }

    filtered.forEach(notification => {

        const card = createCard(notification.title, [
            {
                label: "Message",
                value: notification.message
            },
            {
                label: "Category",
                value: notification.category || "general"
            },
            {
                label: "Status",
                value: notification.is_read ? "Read" : "Unread"
            },
            {
                label: "Date",
                value: formatDate(notification.created_at)
            }
        ]);

        if (!notification.is_read) {

            addCardButton(
                card,
                "Mark as Read",
                "add-button",
                () => updateItem(
                    API.notifications,
                    notification.id,
                    { is_read: true },
                    "notification"
                )
            );
        }

        container.appendChild(card);
    });
}


async function addAnnouncement(event) {

    event.preventDefault();

    const title = getValue("announcement-title");
    const message = getValue("announcement-message");
    const createdBy = getValue("announcement-by");

    if (!title || !message || !createdBy) {
        showMessage(
            "announcement-message-status",
            "Please complete all announcement fields.",
            true
        );
        return;
    }

    try {

        await apiRequest(API.announcements, "POST", {
            title,
            message,
            created_by: Number(createdBy)
        });

        getElement("announcement-form").reset();

        showMessage(
            "announcement-message-status",
            "Announcement published successfully!"
        );

        await loadData();

    } catch (error) {

        showMessage(
            "announcement-message-status",
            error.message,
            true
        );
    }
}


async function markAllNotificationsRead() {

    try {

        await apiRequest(
            `${API.notifications}/mark-all-read`,
            "PATCH"
        );

        await loadData();

    } catch (error) {

        console.error("Unable to mark notifications as read:", error);
        alert(error.message);
    }
}


/* =====================================
   13. HOUSE RULES PAGE
===================================== */

function renderRules() {

    const container = getElement("rule-list");

    if (!container) return;

    container.replaceChildren();

    const active = rules.filter(
        rule => rule.is_active !== false
    ).length;

    const inactive = rules.length - active;

    if (getElement("total-rules")) {
        getElement("total-rules").textContent = rules.length;
    }

    if (getElement("active-rules")) {
        getElement("active-rules").textContent = active;
    }

    if (getElement("inactive-rules")) {
        getElement("inactive-rules").textContent = inactive;
    }

    if (rules.length === 0) {
        showEmptyMessage(container, "No house rules added yet.");
        return;
    }

    rules.forEach(rule => {

        const card = createCard(rule.title, [
            {
                label: "Category",
                value: rule.category
            },
            {
                label: "Description",
                value: rule.description
            },
            {
                label: "Created by",
                value: getRoommateName(rule.created_by)
            },
            {
                label: "Status",
                value: rule.is_active === false ? "Inactive" : "Active"
            }
        ]);

        addCardButton(
            card,
            rule.is_active === false ? "Activate" : "Deactivate",
            "add-button",
            () => updateItem(
                API.rules,
                rule.id,
                { is_active: rule.is_active === false },
                "rule"
            )
        );

        addCardButton(
            card,
            "Delete",
            "delete-button",
            () => deleteItem(API.rules, rule.id, "rule")
        );

        container.appendChild(card);
    });
}


async function addRule(event) {

    event.preventDefault();

    const title = getValue("rule-title");
    const category = getValue("rule-category");
    const description = getValue("rule-description");
    const createdBy = getValue("rule-created-by");

    if (!title || !category || !description || !createdBy) {
        showMessage(
            "rule-message",
            "Please complete all required rule details.",
            true
        );
        return;
    }

    try {

        await apiRequest(API.rules, "POST", {
            title,
            category,
            description,
            created_by: Number(createdBy),
            is_active: true
        });

        getElement("rule-form").reset();

        showMessage("rule-message", "House rule added successfully!");

        await loadData();

    } catch (error) {

        showMessage("rule-message", error.message, true);
    }
}


/* =====================================
   14. UPDATE AND DELETE FUNCTIONS
===================================== */

async function updateItem(apiUrl, id, data, itemName) {

    try {

        await apiRequest(
            `${apiUrl}/${id}`,
            "PATCH",
            data
        );

        await loadData();

    } catch (error) {

        console.error(`Unable to update ${itemName}:`, error);
        alert(error.message);
    }
}


async function deleteItem(apiUrl, id, itemName) {

    const confirmed = confirm(
        `Are you sure you want to delete this ${itemName}?`
    );

    if (!confirmed) return;

    try {

        await apiRequest(
            `${apiUrl}/${id}`,
            "DELETE"
        );

        await loadData();

    } catch (error) {

        console.error(`Unable to delete ${itemName}:`, error);
        alert(error.message);
    }
}


/* =====================================
   15. HOMEPAGE DASHBOARD
===================================== */

function renderDashboard() {

    if (getElement("total-roommates")) {
        getElement("total-roommates").textContent = roommates.length;
    }

    if (getElement("pending-chores")) {

        const pending = chores.filter(
            chore => chore.status !== "completed"
        ).length;

        getElement("pending-chores").textContent = pending;
    }

    if (getElement("completed-chores")) {

        const completed = chores.filter(
            chore => chore.status === "completed"
        ).length;

        getElement("completed-chores").textContent = completed;
    }

    if (getElement("shopping-items")) {

        const pendingGroceries = groceries.filter(
            item => item.status !== "purchased"
        ).length;

        getElement("shopping-items").textContent = pendingGroceries;
    }

    renderRecentActivity();
}


function renderRecentActivity() {

    const container = getElement("recent-activity");

    if (!container) return;

    container.replaceChildren();

    const activities = [];

    chores.forEach(chore => {

        activities.push({
            title: `Chore: ${chore.name}`,
            date: chore.created_at || chore.due_date
        });
    });

    expenses.forEach(expense => {

        activities.push({
            title: `Expense added: ${expense.title}`,
            date: expense.created_at || expense.date
        });
    });

    groceries.forEach(item => {

        activities.push({
            title: `Grocery added: ${item.name}`,
            date: item.created_at
        });
    });

    if (activities.length === 0) {

        container.appendChild(
            createElement("p", "", "No recent activity yet.")
        );

        return;
    }

    activities.sort((a, b) => {
        return new Date(b.date || 0) - new Date(a.date || 0);
    });

    activities.slice(0, 5).forEach(activity => {

        const paragraph = createElement(
            "p",
            "",
            `${activity.title} — ${formatDate(activity.date)}`
        );

        container.appendChild(paragraph);
    });
}


/* =====================================
   16. RENDER ALL PAGES
===================================== */

function renderAllPages() {

    renderRoommates();
    renderChores();
    renderExpenses();
    renderGroceries();
    renderInventory();
    renderBookings();
    renderNotifications();
    renderRules();
    renderDashboard();
}


/* =====================================
   17. CONNECT HTML FORMS
===================================== */

function connectForms() {

    const forms = [
        ["roommate-form", addRoommate],
        ["chore-form", addChore],
        ["expense-form", addExpense],
        ["grocery-form", addGrocery],
        ["inventory-form", addInventoryItem],
        ["booking-form", addBooking],
        ["announcement-form", addAnnouncement],
        ["rule-form", addRule]
    ];

    forms.forEach(([formId, handler]) => {

        const form = getElement(formId);

        if (form) {
            form.addEventListener("submit", handler);
        }
    });
}


/* =====================================
   18. CONNECT NOTIFICATION CONTROLS
===================================== */

function connectNotificationControls() {

    const filter = getElement("notification-filter");

    if (filter) {
        filter.addEventListener("change", renderNotifications);
    }

    const markAllButton = getElement("mark-all-read");

    if (markAllButton) {
        markAllButton.addEventListener(
            "click",
            markAllNotificationsRead
        );
    }
}


/* =====================================
   19. START ROOMEASE
===================================== */

document.addEventListener("DOMContentLoaded", () => {

    connectForms();

    connectNotificationControls();

    loadData();

});
