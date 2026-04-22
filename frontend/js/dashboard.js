/**
 * Dashboard JS — Uses window.EgovAuth (from auth.js) for authentication and API calls.
 */
(function () {
  window.copyRequestId = function (id) {
    if (!id) return;
    navigator.clipboard.writeText(id).catch(function () {});
  };

  function checkAuth() {
    var token = window.EgovAuth.getToken();
    if (!token) {
      window.location.href = './pages/login.html?return=dashboard.html';
      return false;
    }
    var user = window.EgovAuth.getStoredUser();
    if (!user) {
      window.location.href = './pages/login.html?return=dashboard.html';
      return false;
    }
    return true;
  }

  function getStatusColor(status) {
    if (status === 'PENDING' || status === 'DRAFT') return '#ff9800';
    if (status === 'APPROVED' || status === 'ACCEPTED') return '#4caf50';
    if (status === 'REJECTED') return '#f44336';
    if (status === 'UNDER_REVIEW' || status === 'SUBMITTED') return '#2196f3';
    return '#999';
  }

  function formatDate(dateStr) {
    if (!dateStr) return '\u2014';
    return new Date(dateStr).toLocaleDateString();
  }

  async function loadIdRenewalRequests() {
    try {
      var response = await window.EgovAuth.apiFetch('/id-renewal/my-requests');

      if (!response.ok) {
        document.getElementById('id-renewal-error').textContent =
          'Failed to load ID Renewal requests';
        document.getElementById('id-renewal-error').style.display = 'block';
        return;
      }

      var requests = await response.json();
      var tbody = document.getElementById('id-renewal-tbody');

      if (!requests || requests.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="4" style="padding: 1rem; text-align: center; color: #999;">No submissions yet</td></tr>';
        return;
      }

      tbody.innerHTML = requests
        .map(function (req) {
          return '<tr style="border-bottom: 1px solid #eee;">' +
            '<td style="padding: 0.75rem;">' + req.id.substring(0, 8) + '...</td>' +
            '<td style="padding: 0.75rem;">' + req.firstName + ' ' + req.lastName + '</td>' +
            '<td style="padding: 0.75rem; color: white; background-color: ' + getStatusColor(req.status) + '; border-radius: 4px; text-align: center; font-weight: bold;">' + req.status + '</td>' +
            '<td style="padding: 0.75rem;">' + formatDate(req.submittedAt) + '</td>' +
            '</tr>';
        })
        .join('');
    } catch (error) {
      document.getElementById('id-renewal-error').textContent =
        'Error: ' + error.message;
      document.getElementById('id-renewal-error').style.display = 'block';
    }
  }

  async function loadScholarshipRequests() {
    try {
      var response = await window.EgovAuth.apiFetch('/scholarship/my-requests');

      if (!response.ok) {
        document.getElementById('scholarship-error').textContent =
          'Failed to load Scholarship requests';
        document.getElementById('scholarship-error').style.display = 'block';
        return;
      }

      var requests = await response.json();
      var tbody = document.getElementById('scholarship-tbody');

      if (!requests || requests.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="5" style="padding: 1rem; text-align: center; color: #999;">No submissions yet</td></tr>';
        return;
      }

      var typeLabels = {
        EMPLOYEE_UPSKILLING: 'Upskilling',
        RD_GRANT: 'R&D Grant',
        VOCATIONAL_TRAINING: 'Vocational',
      };

      tbody.innerHTML = requests
        .map(function (req) {
          return '<tr style="border-bottom: 1px solid #eee;">' +
            '<td style="padding: 0.75rem;"><a href="./scholarship.html" onclick="localStorage.setItem(\'viewAppId\',\'' + req.id + '\')" title="' + req.id + '">' + req.id.substring(0, 8) + '...</a></td>' +
            '<td style="padding: 0.75rem;">' + (req.businessName || '\u2014') + '</td>' +
            '<td style="padding: 0.75rem;">' + (typeLabels[req.scholarshipType] || req.scholarshipType || '\u2014') + '</td>' +
            '<td style="padding: 0.75rem; color: white; background-color: ' + getStatusColor(req.status) + '; border-radius: 4px; text-align: center; font-weight: bold;">' + req.status + '</td>' +
            '<td style="padding: 0.75rem;">' + formatDate(req.createdAt) + '</td>' +
            '</tr>';
        })
        .join('');
    } catch (error) {
      document.getElementById('scholarship-error').textContent =
        'Error: ' + error.message;
      document.getElementById('scholarship-error').style.display = 'block';
    }
  }

  async function loadBusinessLicenseRequests() {
    try {
      var response = await window.EgovAuth.apiFetch('/business-license/my-requests');

      if (!response.ok) {
        document.getElementById('business-license-error').textContent =
          'Failed to load Business License requests';
        document.getElementById('business-license-error').style.display =
          'block';
        return;
      }

      var requests = await response.json();
      var tbody = document.getElementById('business-license-tbody');

      if (!requests || requests.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="5" style="padding: 1rem; text-align: center; color: #999;">No submissions yet</td></tr>';
        return;
      }

      tbody.innerHTML = requests
        .map(function (req) {
          var fullId = req.id || '';
          return '<tr style="border-bottom: 1px solid #eee;">' +
            '<td style="padding: 0.75rem;">' +
              '<code style="font-size: 0.8rem;">' + fullId + '</code> ' +
              '<button type="button" class="btn btn-small btn-outline" style="margin-left: 0.4rem;" onclick="window.copyRequestId(\'' + fullId + '\')">Copy</button>' +
            '</td>' +
            '<td style="padding: 0.75rem;">' + req.businessName + '</td>' +
            '<td style="padding: 0.75rem;">' + req.businessType + '</td>' +
            '<td style="padding: 0.75rem; color: white; background-color: ' + getStatusColor(req.status) + '; border-radius: 4px; text-align: center; font-weight: bold;">' + req.status + '</td>' +
            '<td style="padding: 0.75rem;">' + formatDate(req.createdAt) + '</td>' +
            '</tr>';
        })
        .join('');
    } catch (error) {
      document.getElementById('business-license-error').textContent =
        'Error: ' + error.message;
      document.getElementById('business-license-error').style.display = 'block';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!checkAuth()) return;

    var user = window.EgovAuth.getStoredUser();
    if (user) {
      document.getElementById('user-name').textContent =
        user.username || user.sub || 'User';
    }

    document.getElementById('logout-btn').addEventListener('click', function () {
      window.EgovAuth.logout();
      window.location.href = './pages/login.html';
    });

    loadIdRenewalRequests();
    loadScholarshipRequests();
    loadBusinessLicenseRequests();
  });
})();
