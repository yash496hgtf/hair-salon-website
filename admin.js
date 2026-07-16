const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const loginForm = document.getElementById('login-form');
const loginStatus = document.getElementById('login-status');
const logoutBtn = document.getElementById('logout-btn');
const bookingsList = document.getElementById('bookings-list');
const dashboardStatus = document.getElementById('dashboard-status');

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(timeStr) {
  const [hour, minute] = timeStr.split(':').map(Number);
  const d = new Date(2000, 0, 1, hour, minute);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function renderBookings(bookings) {
  if (!bookings.length) {
    bookingsList.innerHTML = '<p>No booking requests yet.</p>';
    return;
  }

  bookingsList.innerHTML = bookings
    .map(function (b) {
      const actions =
        b.status === 'pending'
          ? '<div class="booking-actions">' +
            '<button class="btn" data-id="' + b.id + '" data-action="confirm">Confirm</button>' +
            '<button class="btn-secondary" data-id="' + b.id + '" data-action="decline">Decline</button>' +
            '</div>'
          : '';

      return (
        '<div class="booking-card status-' + escapeHtml(b.status) + '">' +
        '<div class="booking-info">' +
        '<p class="booking-name">' + escapeHtml(b.name) + ' &mdash; <span class="booking-email">' + escapeHtml(b.email) + '</span></p>' +
        '<p class="booking-time">' + escapeHtml(formatDate(b.appointment_date)) + ' at ' + escapeHtml(formatTime(b.appointment_time)) + '</p>' +
        '<p class="booking-message">' + escapeHtml(b.message) + '</p>' +
        '<span class="status-badge">' + escapeHtml(b.status) + '</span>' +
        '</div>' +
        actions +
        '</div>'
      );
    })
    .join('');
}

async function loadBookings() {
  dashboardStatus.textContent = 'Loading...';
  dashboardStatus.className = 'status';
  try {
    const res = await fetch('/api/bookings');
    if (res.status === 401) {
      showLogin();
      return;
    }
    const data = await res.json();
    renderBookings(data.bookings || []);
    dashboardStatus.textContent = '';
  } catch (err) {
    dashboardStatus.textContent = 'Failed to load bookings.';
    dashboardStatus.className = 'status error';
  }
}

function showDashboard() {
  loginView.style.display = 'none';
  dashboardView.style.display = 'block';
  loadBookings();
}

function showLogin() {
  loginView.style.display = 'block';
  dashboardView.style.display = 'none';
}

bookingsList.addEventListener('click', async function (e) {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;

  const id = btn.dataset.id;
  const action = btn.dataset.action;
  btn.disabled = true;

  try {
    const res = await fetch('/api/bookings/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: action }),
    });
    const data = await res.json();

    if (!res.ok) {
      dashboardStatus.textContent = data.error || 'Failed to update booking.';
      dashboardStatus.className = 'status error';
      btn.disabled = false;
      return;
    }

    dashboardStatus.textContent = '';
    loadBookings();
  } catch (err) {
    dashboardStatus.textContent = 'Failed to update booking.';
    dashboardStatus.className = 'status error';
    btn.disabled = false;
  }
});

loginForm.addEventListener('submit', async function (e) {
  e.preventDefault();
  loginStatus.textContent = 'Logging in...';
  loginStatus.className = 'status';

  const password = document.getElementById('password').value;

  try {
    const res = await fetch('/api/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password }),
    });

    if (res.ok) {
      loginStatus.textContent = '';
      loginForm.reset();
      showDashboard();
    } else {
      loginStatus.textContent = 'Incorrect password.';
      loginStatus.className = 'status error';
    }
  } catch (err) {
    loginStatus.textContent = 'Something went wrong.';
    loginStatus.className = 'status error';
  }
});

logoutBtn.addEventListener('click', async function () {
  await fetch('/api/admin-logout', { method: 'POST' });
  showLogin();
});

(async function init() {
  try {
    const res = await fetch('/api/bookings');
    if (res.ok) {
      const data = await res.json();
      loginView.style.display = 'none';
      dashboardView.style.display = 'block';
      renderBookings(data.bookings || []);
    }
  } catch (err) {
    // stay on login view
  }
})();
