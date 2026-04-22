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

  function readErrorMessage(response, fallback) {
    return response
      .json()
      .then(function (data) {
        return data && data.message ? data.message : fallback;
      })
      .catch(function () {
        return fallback;
      });
  }

  function setContainerMessage(containerId, message) {
    var container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '<p>' + message + '</p>';
    }
  }

  async function refreshAllTasks() {
    await Promise.all([
      loadIdRenewalTasks(),
      loadScholarshipTasks(),
      loadBusinessLicenseTasks(),
    ]);
  }

  async function completeTask(service, requestId, taskId, action, element) {
    if (!checkAuth()) return;

    if (service === 'scholarship') {
      return completeScholarshipTask(requestId, taskId, action, element);
    }

    try {
      var response;
      if (service === 'id-renewal') {
        var idRenewalBody = {
          action: action,
          taskId: taskId || undefined,
        };
        if (action === 'REJECTED') {
          var idRejectReason = window.prompt('Enter rejection reason (optional):', '');
          if (idRejectReason && idRejectReason.trim()) {
            idRenewalBody.reason = idRejectReason.trim();
          }
        }
        response = await window.EgovAuth.apiFetch('/id-renewal/' + requestId + '/complete', {
          method: 'PATCH',
          body: JSON.stringify(idRenewalBody),
        });
      } else {
        var commonBody = { action: action, taskId: taskId || undefined };
        if (action === 'REJECTED') {
          var rejectReason = window.prompt('Enter rejection reason (optional):', '');
          if (rejectReason && rejectReason.trim()) {
            commonBody.reason = rejectReason.trim();
          }
        }
        response = await window.EgovAuth.apiFetch('/' + service + '/' + requestId + '/complete', {
          method: 'PATCH',
          body: JSON.stringify(commonBody),
        });
      }

      if (!response.ok) {
        var message = await readErrorMessage(response, 'Failed to complete task');
        showToast(message, true);
        return;
      }

      showToast('Task completed successfully');
      await refreshAllTasks();
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
        var message = await readErrorMessage(response, 'Failed to complete task');
        showToast(message, true);
        return;
      }

      showToast('Scholarship application ' + action.toLowerCase() + ' successfully');
      await refreshAllTasks();
    } catch (error) {
      showToast('Error: ' + error.message, true);
    }
  }

  function createTaskCard(service, request, task) {
    var details = '';
    var taskId = task && task.id ? task.id : '';

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
      '<p><strong>Submitted:</strong> ' + (request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '\u2014') + '</p>' +
      '<div style="display: flex; gap: 0.5rem; margin-top: 1rem;">' +
        '<button class="btn btn-small" style="background: #4caf50; color: white; border: none; cursor: pointer; flex: 1;" onclick="window._approveTask(\'' + service + '\', \'' + request.id + '\', \'' + taskId + '\', this.parentElement.parentElement)">' +
          'Approve' +
        '</button>' +
        '<button class="btn btn-small" style="background: #f44336; color: white; border: none; cursor: pointer; flex: 1;" onclick="window._rejectTask(\'' + service + '\', \'' + request.id + '\', \'' + taskId + '\', this.parentElement.parentElement)">' +
          'Reject' +
        '</button>' +
      '</div>' +
    '</div>';
  }

  async function loadIdRenewalPendingFallback() {
    var response = await window.EgovAuth.apiFetch('/id-renewal/supervisor/pending');
    if (!response.ok) {
      return [];
    }
    return response.json();
  }

  async function loadBusinessPendingFallback() {
    var response = await window.EgovAuth.apiFetch('/business-license/supervisor/pending');
    if (!response.ok) {
      return [];
    }
    return response.json();
  }

  function createScholarshipReviewCard(app, task) {
    var recCoverage = app.recommendedCoveragePercent != null ? app.recommendedCoveragePercent : '\u2014';
    var eligibleText = app.eligible === true ? 'Yes' : app.eligible === false ? 'No' : '\u2014';

    return '<div class="scholarship-review-card" style="border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; background: #f9f9f9; margin-bottom: 1rem;">' +
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
        '<button class="btn btn-small" style="background: #4caf50; color: white; border: none; cursor: pointer; flex: 1; padding: 0.6rem;" onclick="window._approveTask(\'scholarship\', \'' + app.id + '\', \'' + (task ? task.id : '') + '\', this.closest(\'.scholarship-review-card\'))">' +
          '<i class="fas fa-check"></i> Approve with Coverage' +
        '</button>' +
        '<button class="btn btn-small" style="background: #f44336; color: white; border: none; cursor: pointer; flex: 1; padding: 0.6rem;" onclick="window._rejectTask(\'scholarship\', \'' + app.id + '\', \'' + (task ? task.id : '') + '\', this.closest(\'.scholarship-review-card\'))">' +
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
      if (!response.ok) {
        var message = await readErrorMessage(response, 'Failed to load ID renewal tasks');
        setContainerMessage('id-renewal-tasks', message);
        return;
      }

      var tasks = await response.json();
      var container = document.getElementById('id-renewal-tasks');

      if (!tasks || tasks.length === 0) {
        var pendingRequests = await loadIdRenewalPendingFallback();
        if (!pendingRequests || pendingRequests.length === 0) {
          container.innerHTML = '<p>No pending tasks</p>';
          return;
        }
        container.innerHTML = pendingRequests
          .map(function (request) {
            return createTaskCard(
              'id-renewal',
              {
                id: request.id,
                firstName: request.firstName,
                lastName: request.lastName,
                nationalId: request.nationalId,
                createdAt: request.submittedAt,
              },
              null,
            );
          })
          .join('');
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
      setContainerMessage('id-renewal-tasks', 'Error loading tasks: ' + error.message);
    }
  }

  async function loadScholarshipTasks() {
    var container = document.getElementById('scholarship-tasks');
    try {
      var response = await window.EgovAuth.apiFetch('/scholarship/admin/pending');
      if (!response.ok) {
        var message = await readErrorMessage(response, 'Failed to load scholarship tasks');
        container.innerHTML = '<p>' + message + '</p>';
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
      container.innerHTML = '<p>Error loading scholarship tasks: ' + error.message + '</p>';
    }
  }

  async function loadBusinessLicenseTasks() {
    try {
      var response = await window.EgovAuth.apiFetch('/business-license/supervisor/tasks');
      if (!response.ok) {
        var message = await readErrorMessage(response, 'Failed to load business license tasks');
        setContainerMessage('business-license-tasks', message);
        return;
      }

      var tasks = await response.json();
      var container = document.getElementById('business-license-tasks');

      if (!tasks || tasks.length === 0) {
        var pendingRequests = await loadBusinessPendingFallback();
        if (!pendingRequests || pendingRequests.length === 0) {
          container.innerHTML = '<p>No pending tasks</p>';
          return;
        }
        container.innerHTML = pendingRequests
          .map(function (request) {
            return createTaskCard(
              'business-license',
              {
                id: request.id,
                businessName: request.businessName,
                businessType: request.businessType,
                createdAt: request.createdAt,
              },
              null,
            );
          })
          .join('');
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
      setContainerMessage(
        'business-license-tasks',
        'Error loading tasks: ' + error.message,
      );
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!checkAuth()) return;

    document.getElementById('logout-btn').addEventListener('click', function () {
      window.EgovAuth.logout();
      window.location.href = './pages/login.html';
    });

    refreshAllTasks();
  });
})();
