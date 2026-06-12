// Backend API base URL
const API_BASE = "http://localhost:5000";
const token = localStorage.getItem("token");

// ✅ Debug helper
async function apiRequest(url, options = {}) {
  console.log("➡️ Request:", url, options);
  const res = await fetch(url, options);
  const text = await res.text(); // read raw text for debugging
  console.log("⬅️ Response:", res.status, text);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadEvents();

  const form = document.getElementById("eventForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const eventData = {
        name: document.getElementById("eventName").value,
        date: document.getElementById("eventDate").value,
        location: document.getElementById("eventLocation").value,
        type: document.getElementById("eventType").value,
        reminderDays: document.getElementById("reminderDays").value
      };

      const res = await apiRequest(`${API_BASE}/add-event`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(eventData)
      });

      if (res && res.insertedId) {
        showToast("Event added successfully!", "success");
        form.reset();
        loadEvents();
      } else {
        showToast("Failed to add event!", "error");
      }
    });
  }
});

// ✅ Toast function
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ✅ State for filtering/searching
let allEvents = [];
let currentFilter = "all";
let currentSearchQuery = "";

// ✅ Load events
async function loadEvents() {
  const events = await apiRequest(`${API_BASE}/events`);
  allEvents = Array.isArray(events) ? events : [];
  applyFiltersAndRender();
}

// ✅ Display events
function displayEvents(events) {
  const eventList = document.getElementById("eventList");
  if (!eventList) return;
  eventList.innerHTML = "";

  if (events.length === 0) {
    eventList.innerHTML = "<p>No events yet 🎉</p>";
    return;
  }

  events.forEach(event => {
    const id = event._id;
    const listItem = document.createElement("li");
    listItem.classList.add("event-card");

    listItem.innerHTML = `
      <div class="event-header">
        <h3>${event.name}</h3>
        <span class="badge ${event.type}">${event.type}</span>
      </div>
      <p class="event-date">📅 ${event.date}</p>
      <p class="event-location">📍 ${event.location}</p>
      ${event.reminderDays ? `<p class="reminder">Reminder: ${event.reminderDays} day(s) before</p>` : ""}
      <div class="event-actions">
        <button onclick="editEvent('${id}')">✏️ Edit</button>
        <button onclick="deleteEvent('${id}')">🗑 Delete</button>
      </div>
    `;

    eventList.appendChild(listItem);
  });
}

// ✅ Modal Edit
let currentEditId = null;

async function editEvent(id) {
  const events = await apiRequest(`${API_BASE}/events`);
  const event = Array.isArray(events) ? events.find(e => e._id.toString() === id) : null;
  if (!event) return showToast("Event not found!", "error");

  currentEditId = id;
  document.getElementById("editName").value = event.name;
  document.getElementById("editDate").value = event.date;
  document.getElementById("editLocation").value = event.location;
  document.getElementById("editType").value = event.type;
  document.getElementById("editReminderDays").value = event.reminderDays ?? 1;
  document.getElementById("editModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("editModal").style.display = "none";
}

// ✅ Filter + Search
function getActiveFilter() {
  const select = document.getElementById("eventFilter");
  return select ? select.value : "all";
}

function getActiveSearchQuery() {
  const input = document.getElementById("searchBar");
  return input ? input.value.trim() : "";
}

function filterEvents() {
  currentFilter = getActiveFilter();
  currentSearchQuery = getActiveSearchQuery();
  applyFiltersAndRender();
}

function searchEvents() {
  currentSearchQuery = getActiveSearchQuery();
  currentFilter = getActiveFilter();
  applyFiltersAndRender();
}

function applyFiltersAndRender() {
  const normalizedQuery = (currentSearchQuery || "").toLowerCase();

  let filtered = allEvents.slice();

  if (currentFilter && currentFilter !== "all") {
    filtered = filtered.filter(e => (e.type || "").toString() === currentFilter);
  }

  if (normalizedQuery) {
    filtered = filtered.filter(e => {
      const haystack = `${e.name || ""} ${e.location || ""} ${e.type || ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }

  displayEvents(filtered);
} 


async function saveEdit() {
  if (!currentEditId) return;
  const updatedEvent = {
    name: document.getElementById("editName").value,
    date: document.getElementById("editDate").value,
    location: document.getElementById("editLocation").value,
    type: document.getElementById("editType").value,
    reminderDays: document.getElementById("editReminderDays").value
  };

  const res = await apiRequest(`${API_BASE}/update-event/${currentEditId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(updatedEvent)
  });

  if (res && res.modifiedCount > 0) {
    showToast("Event updated!", "success");
    closeModal();
    loadEvents();
  } else {
    showToast("Failed to update!", "error");
  }
}

// ✅ Delete Event
async function deleteEvent(id) {
  const res = await apiRequest(`${API_BASE}/delete-event/${id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  });

  if (res && res.deletedCount > 0) {
    showToast("Event deleted!", "success");
    loadEvents();
  } else {
    showToast("Failed to delete!", "error");
  }
}