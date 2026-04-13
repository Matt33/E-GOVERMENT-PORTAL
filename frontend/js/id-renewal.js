/**
 * id-renewal.js — Uses window.EgovAuth (from auth.js) for authentication and API calls.
 */

var token = window.EgovAuth.getToken();

if (!token) {
  window.location.href = 'login.html?return=id-renewal.html';
}

var user = window.EgovAuth.getStoredUser();
var roles = user ? user.roles || [] : [];
var username = user ? user.username || 'User' : 'User';

document.getElementById('userInfo').innerText = 'Hello, ' + username;
document.getElementById('roleWelcome').innerText =
  'Logged in as: ' + roles.join(', ');

if (roles.includes('citizen')) {
  document.getElementById('citizenView').style.display = 'block';
}
if (roles.includes('supervisor') || roles.includes('admin')) {
  document.getElementById('staffView').style.display = 'block';
  loadTasks();
  loadAllRequests();
}
if (roles.includes('admin')) {
  document.getElementById('adminView').style.display = 'block';
}

function logout() {
  window.EgovAuth.logout();
  window.location.href = 'login.html';
}

document
  .getElementById('renewalForm')
  ?.addEventListener('submit', async function (e) {
    e.preventDefault();
    var body = {
      firstName: document.getElementById('fn').value,
      lastName: document.getElementById('ln').value,
      nationalId: document.getElementById('nid').value,
    };

    try {
      var res = await window.EgovAuth.apiFetch('/id-renewal', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      var data = await res.json();
      if (res.ok) {
        alert('Request submitted! ID: ' + data.id);
        document.getElementById('renewalForm').reset();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (err) {
      alert('Failed to submit request.');
    }
  });

async function trackRequest() {
  var id = document.getElementById('trackId').value;
  if (!id) return;
  try {
    var res = await window.EgovAuth.apiFetch('/id-renewal/' + id);
    var data = await res.json();
    var resultDiv = document.getElementById('trackResult');
    if (res.ok) {
      resultDiv.innerHTML =
        '<div class="badge ' + data.status.toLowerCase() + '">' + data.status + '</div>' +
        '<p style="margin-top:0.5rem;">Citizen: ' + data.firstName + ' ' + data.lastName + '</p>' +
        (data.rejectionReason ? '<p style="color:red;">Reason: ' + data.rejectionReason + '</p>' : '');
    } else {
      resultDiv.innerHTML = '<p style="color:red;">Request not found.</p>';
    }
  } catch (err) {
    alert('Tracking failed.');
  }
}

async function loadTasks() {
  try {
    var res = await window.EgovAuth.apiFetch('/id-renewal/supervisor/tasks');
    var tasks = await res.json();
    var body = document.getElementById('tasksBody');
    body.innerHTML = '';
    tasks.forEach(function (task) {
      var row =
        '<tr>' +
          '<td>' + task.id + '</td>' +
          '<td>' + (task.variables?.citizenName || 'N/A') + '</td>' +
          '<td>' + (task.variables?.nationalId || 'N/A') + '</td>' +
          '<td>' +
            '<button onclick="approveTask(\'' + task.id + '\', true)" class="btn btn-primary btn-sm">Approve</button> ' +
            '<button onclick="openRejectDialog(\'' + task.id + '\')" class="btn btn-outline btn-sm">Reject</button>' +
          '</td>' +
        '</tr>';
      body.innerHTML += row;
    });
  } catch (err) { /* ignore */ }
}

async function approveTask(taskId, approved, reason) {
  reason = reason || '';
  try {
    var res = await window.EgovAuth.apiFetch('/id-renewal/tasks/' + taskId + '/complete', {
      method: 'POST',
      body: JSON.stringify({ approved: approved, reason: reason }),
    });
    if (res.ok) {
      alert(approved ? 'Approved!' : 'Rejected!');
      loadTasks();
      loadAllRequests();
    } else {
      var err = await res.json();
      alert('Error: ' + err.message);
    }
  } catch (err) {
    alert('Action failed.');
  }
}

function openRejectDialog(taskId) {
  var reason = prompt('Enter rejection reason:');
  if (reason !== null) {
    approveTask(taskId, false, reason);
  }
}

async function loadAllRequests() {
  try {
    var res = await window.EgovAuth.apiFetch('/id-renewal');
    var items = await res.json();
    var body = document.getElementById('requestsBody');
    body.innerHTML = '';
    items.forEach(function (item) {
      body.innerHTML +=
        '<tr>' +
          '<td>' + item.id.substring(0, 8) + '...</td>' +
          '<td>' + item.firstName + ' ' + item.lastName + '</td>' +
          '<td><span class="badge ' + item.status.toLowerCase() + '">' + item.status + '</span></td>' +
        '</tr>';
    });
  } catch (err) { /* ignore */ }
}

async function deployBpmn() {
  try {
    var res = await window.EgovAuth.apiFetch('/id-renewal/deploy', {
      method: 'POST',
    });
    if (res.ok) {
      alert('BPMN Deployed Successfully!');
    } else {
      alert('Deployment failed.');
    }
  } catch (err) {
    alert('Server unreachable.');
  }
}
