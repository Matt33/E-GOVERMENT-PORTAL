/**
 * Supervisor / Admin Dashboard JS — Uses window.EgovAuth for authentication and API calls.
 * Supports both supervisor and admin roles. Admin users see scholarship applications
 * with coverage override and approve/reject functionality.
 */
(function () {
  function checkAuth() {
    var token = window.EgovAuth.getToken();
    if (!token) {
      window.location.href = './pages/login.html';
      return false;
    }
    var user = window.EgovAuth.getStoredUser();
    if (!user || !user.roles) {
      window.location.href = './pages/login.html';
      return false;
    }
    var hasRole = user.roles.includes('supervisor') || user.roles.includes('admin');
    if (!hasRole) {
      window.location.href = './pages/login.html';
      return false;
    }
    return true;
  }

  function showToast(msg, isError) {
    var toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.style.background = isError ? '#f44336' : '#4caf50';
    toast.style.display = 'block';
    setTimeout(function () { toast.style.display = 'none'; }, 4000);
  }

  async function completeTask(service, requestId, taskId, action, element) {
    if (!checkAuth()) return;

    if (service === 'scholarship') {
      return completeScholarshipTask(requestId, taskId, action, element);
    }

    var endpoint = '/' + service + '/' + requestId + '/complete';

    try {
      var response = await window.EgovAuth.apiFetch(endpoint, {
        method: 'PATCH',
        body: JSON.stringify({ action: action, taskId: taskId }),
      });

      if (!response.ok) {
        var data = await response.json().catch(function () { return {}; });
        showToast(data.message || 'Failed to complete task', true);
        return;
      }

      showToast('Task completed successfully');
      element.style.opacity = '0.5';
      element.style.pointerEvents = 'none';
    } catch (error) {
      showToast('Error: ' + error.message, true);
    }
  }

  async function completeScholarshipTask(applicationId, taskId, action, element) {
    var coverageInput = element.querySelector('.coverage-input');
    var reasonInput = element.querySelector('.rejection-reason');

    if (action === 'ACCEPTED' && coverageInput) {
      var coverage = parseFloat(coverageInput.value);
      if (isNaN(coverage) || coverage < 0 || coverage > 100) {
        showToast('Please set a valid coverage percentage (0-100) before approving.', true);
        coverageInput.focus();
        return;
      }
    }

    if (action === 'REJECTED' && reasonInput) {
      if (!reasonInput.value.trim()) {
        showToast('A rejection reason is required.', true);
        reasonInput.focus();
        return;
      }
    }

    var body = {
      action: action,
      taskId: taskId || undefined,
    };

    if (action === 'ACCEPTED' && coverageInput) {
      body.finalCoveragePercent = parseFloat(coverageInput.value);
    }
    if (action === 'REJECTED' && reasonInput) {
      body.reason = reasonInput.value.trim();
    }

    var notesInput = element.querySelector('.admin-notes');
    if (notesInput && notesInput.value.trim()) {
      body.adminNotes = notesInput.value.trim();
    }

    try {
      var response = await window.EgovAuth.apiFetch(
        '/scholarship/admin/' + applicationId + '/decide',
        {
          method: 'PATCH',
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        var data = await response.json().catch(function () { return {}; });
        showToast(data.message || 'Failed to complete task', true);
        return;
      }

      showToast('Scholarship application ' + action.toLowerCase() + ' successfully');
      element.style.opacity = '0.5';
      element.style.pointerEvents = 'none';
    } catch (error) {
      showToast('Error: ' + error.message, true);
    }
  }

  function createTaskCard(service, request, task) {
    var details = '';

    if (service === 'id-renewal') {
      details =
        '<p><strong>Name:</strong> ' + request.firstName + ' ' + request.lastName + '</p>' +
        '<p><strong>National ID:</strong> ' + request.nationalId + '</p>';
    } else if (service === 'business-license') {
      details =
        '<p><strong>Business:</strong> ' + request.businessName + '</p>' +
        '<p><strong>Type:</strong> ' + request.businessType + '</p>';
    }

    return '<div style="border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; background: #f9f9f9;">' +
      '<h3 style="margin-top: 0;">' + service.replace(/-/g, ' ').toUpperCase() + '</h3>' +
      details +
      '<p><strong>Submitted:</strong> ' + new Date(request.createdAt).toLocaleDateString() + '</p>' +
      '<div style="display: flex; gap: 0.5rem; margin-top: 1rem;">' +
        '<button class="btn btn-small" style="background: #4caf50; color: white; border: none; cursor: pointer; flex: 1;" onclick="window._approveTask(\'' + service + '\', \'' + request.id + '\', \'' + task.id + '\', this.parentElement.parentElement)">' +
          'Approve' +
        '</button>' +
        '<button class="btn btn-small" style="background: #f44336; color: white; border: none; cursor: pointer; flex: 1;" onclick="window._rejectTask(\'' + service + '\', \'' + request.id + '\', \'' + task.id + '\', this.parentElement.parentElement)">' +
          'Reject' +
        '</button>' +
      '</div>' +
    '</div>';
  }

  function createScholarshipReviewCard(app, task) {
    var recCoverage = app.recommendedCoveragePercent != null ? app.recommendedCoveragePercent : '\u2014';
    var eligibleText = app.eligible === true ? 'Yes' : app.eligible === false ? 'No' : '\u2014';

    return '<div style="border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; background: #f9f9f9; margin-bottom: 1rem;">' +
      '<h3 style="margin-top: 0;">SCHOLARSHIP APPLICATION</h3>' +
      '<p><strong>Business:</strong> ' + (app.businessName || '\u2014') + '</p>' +
      '<p><strong>Tier:</strong> ' + (app.businessTier || '\u2014') + ' &nbsp; <strong>Industry:</strong> ' + (app.industry || '\u2014') + '</p>' +
      '<p><strong>Training:</strong> ' + (app.trainingTitle || '\u2014') + '</p>' +
      '<p><strong>Training Cost:</strong> ' + (app.trainingCost ? Number(app.trainingCost).toLocaleString() + ' EGP' : '\u2014') + '</p>' +
      '<hr style="margin: 0.75rem 0; border: none; border-top: 1px solid #ddd;" />' +
      '<p><strong>Eligible:</strong> ' + eligibleText + '</p>' +
      '<p><strong>Eligibility Details:</strong> ' + (app.eligibilityReason || '\u2014') + '</p>' +
      '<p><strong>Quota:</strong> ' + (app.quotaUsed != null ? app.quotaUsed + '/' + app.quotaAllowed + ' used' : '\u2014') + '</p>' +
      '<p><strong>GoRules Recommended Coverage:</strong> <span style="font-size: 1.1em; font-weight: bold; color: #1976d2;">' + recCoverage + '%</span></p>' +
      '<hr style="margin: 0.75rem 0; border: none; border-top: 1px solid #ddd;" />' +
      '<div style="margin-bottom: 0.5rem;">' +
        '<label style="display: block; font-weight: 600; margin-bottom: 0.25rem;">Final Coverage % (override):</label>' +
        '<input type="number" class="coverage-input" min="0" max="100" step="1" value="' + (app.recommendedCoveragePercent || '') + '" style="padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; width: 120px;" />' +
      '</div>' +
      '<div style="margin-bottom: 0.5rem;">' +
        '<label style="display: block; font-weight: 600; margin-bottom: 0.25rem;">Rejection Reason (required if rejecting):</label>' +
        '<textarea class="rejection-reason" rows="2" style="padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; width: 100%; box-sizing: border-box;" placeholder="Enter reason for rejection..."></textarea>' +
      '</div>' +
      '<div style="margin-bottom: 0.75rem;">' +
        '<label style="display: block; font-weight: 600; margin-bottom: 0.25rem;">Admin Notes (optional):</label>' +
        '<textarea class="admin-notes" rows="2" style="padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; width: 100%; box-sizing: border-box;" placeholder="Optional notes..."></textarea>' +
      '</div>' +
      '<div style="display: flex; gap: 0.5rem;">' +
        '<button class="btn btn-small" style="background: #4caf50; color: white; border: none; cursor: pointer; flex: 1; padding: 0.6rem;" onclick="window._approveTask(\'scholarship\', \'' + app.id + '\', \'' + (task ? task.id : '') + '\', this.closest(\'[style]\')">' +
          '<i class="fas fa-check"></i> Approve' +
        '</button>' +
        '<button class="btn btn-small" style="background: #f44336; color: white; border: none; cursor: pointer; flex: 1; padding: 0.6rem;" onclick="window._rejectTask(\'scholarship\', \'' + app.id + '\', \'' + (task ? task.id : '') + '\', this.closest(\'[style]\')">' +
          '<i class="fas fa-times"></i> Reject' +
        '</button>' +
      '</div>' +
    '</div>';
  }

  window._approveTask = function (service, requestId, taskId, element) {
    var action = service === 'scholarship' ? 'ACCEPTED' : 'APPROVED';
    completeTask(service, requestId, taskId, action, element);
  };

  window._rejectTask = function (service, requestId, taskId, element) {
    completeTask(service, requestId, taskId, 'REJECTED', element);
  };

  async function loadIdRenewalTasks() {
    try {
      var response = await window.EgovAuth.apiFetch('/id-renewal/supervisor/tasks');
      if (!response.ok) return;

      var tasks = await response.json();
      var container = document.getElementById('id-renewal-tasks');

      if (!tasks || tasks.length === 0) {
        container.innerHTML = '<p>No pending tasks</p>';
        return;
      }

      container.innerHTML = tasks
        .map(function (task) {
          var request = {
            id: task.variables?.requestId || 'unknown',
            firstName: task.variables?.firstName || '',
            lastName: task.variables?.lastName || '',
            nationalId: task.variables?.nationalId || '',
            createdAt: task.created,
          };
          return createTaskCard('id-renewal', request, task);
        })
        .join('');
    } catch (error) {
      document.getElementById('id-renewal-tasks').innerHTML =
        '<p>Error loading tasks</p>';
    }
  }

  async function loadScholarshipTasks() {
    var container = document.getElementById('scholarship-tasks');
    try {
      var response = await window.EgovAuth.apiFetch('/scholarship/admin/pending');
      if (!response.ok) {
        container.innerHTML = '<p>No pending tasks</p>';
        return;
      }

      var applications = await response.json();

      if (!applications || applications.length === 0) {
        container.innerHTML = '<p>No pending scholarship applications</p>';
        return;
      }

      container.innerHTML = applications
        .map(function (app) {
          return createScholarshipReviewCard(app, null);
        })
        .join('');
    } catch (error) {
      container.innerHTML = '<p>Error loading scholarship tasks</p>';
    }
  }

  async function loadBusinessLicenseTasks() {
    try {
      var response = await window.EgovAuth.apiFetch('/business-license/supervisor/tasks');
      if (!response.ok) return;

      var tasks = await response.json();
      var container = document.getElementById('business-license-tasks');

      if (!tasks || tasks.length === 0) {
        container.innerHTML = '<p>No pending tasks</p>';
        return;
      }

      container.innerHTML = tasks
        .map(function (task) {
          var request = {
            id: task.variables?.licenseId || 'unknown',
            businessName: task.variables?.businessName || '',
            businessType: task.variables?.businessType || '',
            createdAt: task.created,
          };
          return createTaskCard('business-license', request, task);
        })
        .join('');
    } catch (error) {
      document.getElementById('business-license-tasks').innerHTML =
        '<p>Error loading tasks</p>';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!checkAuth()) return;

    document.getElementById('logout-btn').addEventListener('click', function () {
      window.EgovAuth.logout();
      window.location.href = './pages/login.html';
    });

    loadIdRenewalTasks();
    loadScholarshipTasks();
    loadBusinessLicenseTasks();
  });
})();
