/**
 * Business License Frontend JS
 * Uses window.EgovAuth (from auth.js) for authentication and API calls.
 */
(function () {
  function checkAuth() {
    var token = window.EgovAuth.getToken();
    if (!token) {
      window.location.href = 'pages/login.html?return=business-license.html';
      return false;
    }
    var user = window.EgovAuth.getStoredUser();
    if (!user) {
      window.location.href = 'pages/login.html?return=business-license.html';
      return false;
    }
    return true;
  }

  function showMessage(msg, isError) {
    var msgDiv = document.getElementById('message');
    msgDiv.textContent = msg;
    msgDiv.style.background = isError ? '#fee' : '#efe';
    msgDiv.style.color = isError ? '#c33' : '#3c3';
    msgDiv.style.display = 'block';
    setTimeout(function () { msgDiv.style.display = 'none'; }, 4000);
  }

  function validateForm() {
    var errors = [];
    if (!document.getElementById('ownerName').value.trim()) errors.push('Owner Name is required');
    if (!document.getElementById('businessName').value.trim()) errors.push('Business Name is required');
    if (!document.getElementById('nationalId').value.trim()) errors.push('National ID is required');
    if (!document.getElementById('businessType').value) errors.push('Business Type is required');
    return errors;
  }

  async function submitForm(e) {
    e.preventDefault();

    var errors = validateForm();
    if (errors.length > 0) {
      showMessage(errors.join('; '), true);
      return;
    }

    if (!checkAuth()) return;

    var submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    document.getElementById('btn-text').textContent = 'Submitting...';

    try {
      var response = await window.EgovAuth.apiFetch('/business-license', {
        method: 'POST',
        body: JSON.stringify({
          ownerName: document.getElementById('ownerName').value.trim(),
          businessName: document.getElementById('businessName').value.trim(),
          nationalId: document.getElementById('nationalId').value.trim(),
          businessType: document.getElementById('businessType').value,
        }),
      });

      var data = await response.json();

      if (!response.ok) {
        showMessage(data.message || 'Failed to submit business license application', true);
      } else {
        showMessage('Request submitted successfully — Status: PENDING');
        document.getElementById('business-license-form').reset();
        loadMyRequests();
      }
    } catch (error) {
      showMessage('Error: ' + error.message, true);
    } finally {
      submitBtn.disabled = false;
      document.getElementById('btn-text').textContent = 'Submit Application';
    }
  }

  async function loadMyRequests() {
    try {
      var response = await window.EgovAuth.apiFetch('/business-license/my-requests');

      if (!response.ok) {
        document.getElementById('requests-tbody').innerHTML =
          '<tr><td colspan="5" style="padding: 1rem; text-align: center; color: red;">Failed to load requests</td></tr>';
        return;
      }

      var requests = await response.json();
      var tbody = document.getElementById('requests-tbody');

      if (!requests || requests.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="5" style="padding: 1rem; text-align: center; color: #999;">No submissions yet</td></tr>';
        return;
      }

      tbody.innerHTML = requests
        .map(function (req) {
          var statusColor =
            req.status === 'PENDING'
              ? '#ff9800'
              : req.status === 'APPROVED'
                ? '#4caf50'
                : '#f44336';
          var date = new Date(req.createdAt).toLocaleDateString();
          return '<tr style="border-bottom: 1px solid #eee;">' +
            '<td style="padding: 0.75rem;">' + req.id.substring(0, 8) + '...</td>' +
            '<td style="padding: 0.75rem;">' + req.businessName + '</td>' +
            '<td style="padding: 0.75rem;">' + req.businessType + '</td>' +
            '<td style="padding: 0.75rem; color: white; background-color: ' + statusColor + '; border-radius: 4px; text-align: center; font-weight: bold;">' + req.status + '</td>' +
            '<td style="padding: 0.75rem;">' + date + '</td>' +
            '</tr>';
        })
        .join('');
    } catch (error) {
      document.getElementById('requests-tbody').innerHTML =
        '<tr><td colspan="5" style="padding: 1rem; text-align: center; color: red;">Error loading requests</td></tr>';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!checkAuth()) return;

    document.getElementById('logout-btn').addEventListener('click', function () {
      window.EgovAuth.logout();
      window.location.href = 'pages/login.html';
    });

    document
      .getElementById('business-license-form')
      .addEventListener('submit', submitForm);
    loadMyRequests();
  });
})();
