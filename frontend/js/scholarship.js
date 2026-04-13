/**
 * Business Scholarship — 4-step wizard, API integration, applications list,
 * draft resume, read-only detail view.
 * Uses window.EgovAuth.apiFetch() for authenticated requests.
 */
document.addEventListener('DOMContentLoaded', function () {
  /* ─── Auth guard ─── */
  var token = window.EgovAuth.getToken();
  if (!token) {
    window.location.href = './pages/login.html?return=scholarship.html';
    return;
  }

  /* ─── Logout button ─── */
  document.getElementById('logout-btn').addEventListener('click', function () {
    window.EgovAuth.logout();
    window.location.href = './pages/login.html';
  });

  /* ─── State ─── */
  var currentStep = 1;
  var draftId = null;
  var TOTAL_STEPS = 4;

  /* ─── DOM refs ─── */
  var stepIndicators = document.querySelectorAll('.wizard-step');
  var panels = {
    1: document.getElementById('step-1'),
    2: document.getElementById('step-2'),
    3: document.getElementById('step-3'),
    4: document.getElementById('step-4'),
  };
  var wizardStepsEl = document.getElementById('wizard-steps');
  var detailSection = document.getElementById('application-detail');
  var applicationsSection = document.getElementById('applications-section');
  var messageEl = document.getElementById('message');

  /* ─── Helpers ─── */
  function showMessage(text, type) {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className = 'alert alert-' + (type || 'error');
    messageEl.style.display = 'block';
    messageEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideMessage() {
    if (messageEl) messageEl.style.display = 'none';
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function numVal(id) {
    return parseFloat(val(id)) || 0;
  }

  function setVal(id, v) {
    var el = document.getElementById(id);
    if (el) el.value = v != null ? v : '';
  }

  function formatDate(d) {
    if (!d) return '\u2014';
    var date = new Date(d);
    return isNaN(date.getTime()) ? d : date.toLocaleDateString();
  }

  function setLoading(btn, loading, originalHtml) {
    if (!btn) return;
    btn.disabled = loading;
    if (loading) {
      btn.dataset.origHtml = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Please wait\u2026';
    } else {
      btn.innerHTML = originalHtml || btn.dataset.origHtml || 'Continue';
    }
  }

  var TIER_LABELS = { SMALL: 'Small', MEDIUM: 'Medium', ENTERPRISE: 'Enterprise' };
  var TYPE_LABELS = { EMPLOYEE_UPSKILLING: 'Employee Upskilling', RD_GRANT: 'R&D Grant', VOCATIONAL_TRAINING: 'Vocational Training' };
  var IND_LABELS = { TECH_AI: 'Tech / AI', HEALTHCARE: 'Healthcare', MANUFACTURING: 'Manufacturing', RETAIL: 'Retail', OTHER: 'Other' };

  function dlRow(label, value) {
    return '<dt>' + label + '</dt><dd>' + (value || '\u2014') + '</dd>';
  }

  function statusBadgeClass(status) {
    var map = { DRAFT: 'draft', PENDING: 'pending', UNDER_REVIEW: 'under_review', ACCEPTED: 'accepted', REJECTED: 'rejected' };
    return map[(status || '').toUpperCase()] || 'draft';
  }

  /* ─── Show/Hide wizard vs detail ─── */
  function showWizardView() {
    wizardStepsEl.style.display = '';
    for (var i = 1; i <= TOTAL_STEPS; i++) panels[i].style.display = 'none';
    panels[currentStep].style.display = 'block';
    detailSection.style.display = 'none';
    applicationsSection.style.display = '';
  }

  function showDetailView() {
    wizardStepsEl.style.display = 'none';
    for (var i = 1; i <= TOTAL_STEPS; i++) panels[i].style.display = 'none';
    detailSection.style.display = 'block';
    applicationsSection.style.display = 'none';
  }

  document.getElementById('btn-back-to-list').addEventListener('click', function () {
    detailSection.style.display = 'none';
    applicationsSection.style.display = '';
    wizardStepsEl.style.display = '';
    goToStep(1);
    draftId = null;
    resetForm();
    loadApplications();
  });

  /* ─── Wizard navigation ─── */
  function goToStep(step) {
    if (step < 1 || step > TOTAL_STEPS) return;
    hideMessage();
    currentStep = step;
    wizardStepsEl.style.display = '';
    for (var i = 1; i <= TOTAL_STEPS; i++) {
      panels[i].style.display = i === step ? 'block' : 'none';
    }
    detailSection.style.display = 'none';
    stepIndicators.forEach(function (el) {
      var s = parseInt(el.dataset.step, 10);
      el.classList.remove('active', 'completed');
      if (s < step) el.classList.add('completed');
      if (s === step) el.classList.add('active');
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ─── Step 1 validation ─── */
  function validateStep1() {
    var fields = [
      'businessName', 'businessLicenseId', 'businessTier',
      'industry', 'yearsActive', 'scholarshipType',
      'trainingTitle', 'trainingProvider',
    ];
    for (var i = 0; i < fields.length; i++) {
      if (!val(fields[i])) {
        showMessage('Please fill in all required fields in the Business & Training section.', 'error');
        document.getElementById(fields[i]).focus();
        return false;
      }
    }
    if (numVal('yearsActive') < 0) {
      showMessage('Years active must be a positive number.', 'error');
      return false;
    }
    return true;
  }

  /* ─── Step 1 → API: Create Draft (or update existing draft) ─── */
  async function createDraft() {
    var btn = document.getElementById('btn-next-1');
    setLoading(btn, true);
    try {
      if (draftId) {
        goToStep(2);
        return;
      }
      var res = await window.EgovAuth.apiFetch('/scholarship', {
        method: 'POST',
        body: JSON.stringify({
          businessName: val('businessName'),
          businessLicenseId: val('businessLicenseId'),
          businessTier: val('businessTier'),
          industry: val('industry'),
          yearsActive: parseInt(val('yearsActive'), 10),
          scholarshipType: val('scholarshipType'),
          trainingTitle: val('trainingTitle'),
          trainingProvider: val('trainingProvider'),
        }),
      });
      if (!res.ok) {
        var err = await res.json().catch(function () { return {}; });
        throw new Error(err.message || 'Could not create draft application.');
      }
      var data = await res.json();
      draftId = data.id;
      goToStep(2);
    } catch (e) {
      showMessage(e.message || 'Error creating draft.', 'error');
    } finally {
      setLoading(btn, false);
    }
  }

  /* ─── Beneficiary rows ─── */
  var beneficiaryIndex = 0;
  var tbody = document.getElementById('beneficiaries-tbody');

  function addBeneficiaryRow(data) {
    var idx = beneficiaryIndex++;
    var tr = document.createElement('tr');
    tr.dataset.idx = idx;
    tr.innerHTML =
      '<td><input type="text" class="form-control ben-name" placeholder="Full name" value="' + (data ? (data.employeeName || data.name || '') : '') + '" required /></td>' +
      '<td><input type="text" class="form-control ben-nid" placeholder="National ID" value="' + (data ? (data.employeeNationalId || data.nid || '') : '') + '" required /></td>' +
      '<td><input type="text" class="form-control ben-role" placeholder="Job role" value="' + (data ? (data.employeeRole || data.role || '') : '') + '" required /></td>' +
      '<td><input type="text" class="form-control ben-program" placeholder="Training program" value="' + (data ? (data.trainingProgram || data.program || '') : '') + '" required /></td>' +
      '<td><button type="button" class="btn btn-outline btn-remove-row" title="Remove"><i class="fas fa-trash"></i></button></td>';
    tbody.appendChild(tr);
    tr.querySelector('.btn-remove-row').addEventListener('click', function () {
      tr.remove();
    });
  }

  document.getElementById('btn-add-beneficiary').addEventListener('click', function () {
    addBeneficiaryRow();
  });

  addBeneficiaryRow();

  function collectBeneficiaries() {
    var rows = tbody.querySelectorAll('tr');
    var list = [];
    for (var i = 0; i < rows.length; i++) {
      var name = rows[i].querySelector('.ben-name').value.trim();
      var nid = rows[i].querySelector('.ben-nid').value.trim();
      var role = rows[i].querySelector('.ben-role').value.trim();
      var program = rows[i].querySelector('.ben-program').value.trim();
      if (!name || !nid || !role || !program) return null;
      list.push({
        employeeName: name,
        employeeNationalId: nid,
        employeeRole: role,
        trainingProgram: program,
      });
    }
    return list.length > 0 ? list : null;
  }

  /* ─── Step 2 → API: Add Beneficiaries ─── */
  async function saveBeneficiaries() {
    var beneficiaries = collectBeneficiaries();
    if (!beneficiaries) {
      showMessage('Please fill in all fields for each beneficiary. At least one employee is required.', 'error');
      return;
    }
    var btn = document.getElementById('btn-next-2');
    setLoading(btn, true);
    try {
      var res = await window.EgovAuth.apiFetch('/scholarship/' + draftId + '/beneficiaries', {
        method: 'PATCH',
        body: JSON.stringify({ beneficiaries: beneficiaries }),
      });
      if (!res.ok) {
        var err = await res.json().catch(function () { return {}; });
        throw new Error(err.message || 'Could not save beneficiaries.');
      }
      goToStep(3);
    } catch (e) {
      showMessage(e.message || 'Error saving beneficiaries.', 'error');
    } finally {
      setLoading(btn, false);
    }
  }

  /* ─── Cost auto-total ─── */
  function recalcTotal() {
    var total = numVal('tuitionFee') + numVal('materialsCost') + numVal('travelCost');
    var el = document.getElementById('totalCost');
    if (el) el.value = total.toFixed(2);
  }

  ['tuitionFee', 'materialsCost', 'travelCost'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', recalcTotal);
  });

  /* ─── Step 3 validation ─── */
  function validateStep3() {
    var fields = ['tuitionFee', 'materialsCost', 'travelCost', 'bankName', 'bankAccountNumber'];
    for (var i = 0; i < fields.length; i++) {
      if (!val(fields[i])) {
        showMessage('Please fill in all required financial fields.', 'error');
        document.getElementById(fields[i]).focus();
        return false;
      }
    }
    var total = numVal('tuitionFee') + numVal('materialsCost') + numVal('travelCost');
    if (total <= 0) {
      showMessage('Total cost must be greater than zero.', 'error');
      return false;
    }
    return true;
  }

  /* ─── Step 3 → API: Add Financials ─── */
  async function saveFinancials() {
    var btn = document.getElementById('btn-next-3');
    setLoading(btn, true);
    try {
      var res = await window.EgovAuth.apiFetch('/scholarship/' + draftId + '/financials', {
        method: 'PATCH',
        body: JSON.stringify({
          tuitionFee: numVal('tuitionFee'),
          materialsCost: numVal('materialsCost'),
          travelCost: numVal('travelCost'),
          bankName: val('bankName'),
          bankAccountNumber: val('bankAccountNumber'),
        }),
      });
      if (!res.ok) {
        var err = await res.json().catch(function () { return {}; });
        throw new Error(err.message || 'Could not save financial information.');
      }
      buildReview();
      goToStep(4);
    } catch (e) {
      showMessage(e.message || 'Error saving financials.', 'error');
    } finally {
      setLoading(btn, false);
    }
  }

  /* ─── Build review summary ─── */
  function buildReview() {
    var intentHtml =
      dlRow('Business Name', val('businessName')) +
      dlRow('License ID', val('businessLicenseId')) +
      dlRow('Business Tier', TIER_LABELS[val('businessTier')] || val('businessTier')) +
      dlRow('Industry', IND_LABELS[val('industry')] || val('industry')) +
      dlRow('Years Active', val('yearsActive')) +
      dlRow('Scholarship Type', TYPE_LABELS[val('scholarshipType')] || val('scholarshipType')) +
      dlRow('Training Title', val('trainingTitle')) +
      dlRow('Training Provider', val('trainingProvider'));
    document.getElementById('review-intent').innerHTML = intentHtml;

    var bens = collectBeneficiaries() || [];
    var benHtml = '';
    if (bens.length === 0) {
      benHtml = '<p class="text-muted">No beneficiaries added.</p>';
    } else {
      benHtml = '<table class="scholarship-table"><thead><tr><th>Name</th><th>National ID</th><th>Role</th><th>Program</th></tr></thead><tbody>';
      bens.forEach(function (b) {
        benHtml += '<tr><td>' + b.employeeName + '</td><td>' + b.employeeNationalId + '</td><td>' + b.employeeRole + '</td><td>' + b.trainingProgram + '</td></tr>';
      });
      benHtml += '</tbody></table>';
    }
    document.getElementById('review-beneficiaries').innerHTML = benHtml;

    var total = numVal('tuitionFee') + numVal('materialsCost') + numVal('travelCost');
    var finHtml =
      dlRow('Tuition Fee', numVal('tuitionFee').toLocaleString()) +
      dlRow('Materials Cost', numVal('materialsCost').toLocaleString()) +
      dlRow('Travel & Accommodation', numVal('travelCost').toLocaleString()) +
      dlRow('Total Cost', '<strong>' + total.toLocaleString() + '</strong>') +
      dlRow('Bank Name', val('bankName')) +
      dlRow('IBAN / Account', val('bankAccountNumber'));
    document.getElementById('review-financials').innerHTML = finHtml;
  }

  /* ─── Step 4 → API: Submit ─── */
  async function submitApplication() {
    var btn = document.getElementById('btn-submit');
    setLoading(btn, true);
    try {
      var res = await window.EgovAuth.apiFetch('/scholarship/' + draftId + '/submit', {
        method: 'POST',
      });
      if (!res.ok) {
        var err = await res.json().catch(function () { return {}; });
        throw new Error(err.message || 'Submission failed.');
      }
      var data = await res.json();
      var msg = 'Application submitted successfully! Status: PENDING. An admin will review it shortly.';
      if (data.recommendedCoveragePercent) {
        msg += ' Recommended coverage: ' + data.recommendedCoveragePercent + '%.';
      }
      showMessage(msg, 'success');

      draftId = null;
      currentStep = 1;
      resetForm();
      loadApplications();
    } catch (e) {
      showMessage(e.message || 'Could not submit application.', 'error');
    } finally {
      setLoading(btn, false);
    }
  }

  function resetForm() {
    ['businessName', 'businessLicenseId', 'yearsActive', 'trainingTitle', 'trainingProvider',
     'tuitionFee', 'materialsCost', 'travelCost', 'bankName', 'bankAccountNumber'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
    ['businessTier', 'industry', 'scholarshipType'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.selectedIndex = 0;
    });
    var tc = document.getElementById('totalCost');
    if (tc) tc.value = '0.00';
    tbody.innerHTML = '';
    beneficiaryIndex = 0;
    addBeneficiaryRow();
    goToStep(1);
  }

  /* ─── Wire wizard buttons ─── */
  document.getElementById('btn-next-1').addEventListener('click', function () {
    if (validateStep1()) createDraft();
  });

  document.getElementById('btn-prev-2').addEventListener('click', function () {
    goToStep(1);
  });
  document.getElementById('btn-next-2').addEventListener('click', function () {
    saveBeneficiaries();
  });

  document.getElementById('btn-prev-3').addEventListener('click', function () {
    goToStep(2);
  });
  document.getElementById('btn-next-3').addEventListener('click', function () {
    if (validateStep3()) saveFinancials();
  });

  document.getElementById('btn-prev-4').addEventListener('click', function () {
    goToStep(3);
  });
  document.getElementById('btn-submit').addEventListener('click', function () {
    submitApplication();
  });

  /* ─── View Application (draft resume or read-only detail) ─── */
  window.viewScholarshipApplication = async function (id) {
    hideMessage();
    try {
      var res = await window.EgovAuth.apiFetch('/scholarship/' + id);
      if (!res.ok) throw new Error('Could not load application');
      var app = await res.json();

      if (app.status === 'DRAFT') {
        resumeDraft(app);
      } else {
        showReadOnlyDetail(app);
      }
    } catch (e) {
      showMessage(e.message || 'Error loading application.', 'error');
    }
  };

  function resumeDraft(app) {
    draftId = app.id;
    setVal('businessName', app.businessName);
    setVal('businessLicenseId', app.businessLicenseId);
    setVal('businessTier', app.businessTier);
    setVal('industry', app.industry);
    setVal('yearsActive', app.yearsActive);
    setVal('scholarshipType', app.scholarshipType);
    setVal('trainingTitle', app.trainingTitle);
    setVal('trainingProvider', app.trainingProvider);

    tbody.innerHTML = '';
    beneficiaryIndex = 0;
    if (app.beneficiaries && app.beneficiaries.length > 0) {
      app.beneficiaries.forEach(function (b) { addBeneficiaryRow(b); });
    } else {
      addBeneficiaryRow();
    }

    if (app.financial) {
      setVal('tuitionFee', app.financial.tuitionFee);
      setVal('materialsCost', app.financial.materialsCost);
      setVal('travelCost', app.financial.travelCost);
      setVal('bankName', app.financial.bankName);
      setVal('bankAccountNumber', app.financial.bankAccountNumber);
      recalcTotal();
    }

    var furthestStep = 1;
    if (app.beneficiaries && app.beneficiaries.length > 0) furthestStep = 2;
    if (app.financial) furthestStep = 3;
    goToStep(furthestStep);
    showMessage('Resumed draft application. Continue from where you left off.', 'success');
  }

  function showReadOnlyDetail(app) {
    showDetailView();

    var badge = document.getElementById('detail-status-badge');
    badge.textContent = app.status;
    badge.className = 'status-badge ' + statusBadgeClass(app.status);

    document.getElementById('detail-intent').innerHTML =
      dlRow('Application ID', app.id) +
      dlRow('Business Name', app.businessName) +
      dlRow('License ID', app.businessLicenseId) +
      dlRow('License Status', app.licenseStatus) +
      dlRow('Business Tier', TIER_LABELS[app.businessTier] || app.businessTier) +
      dlRow('Industry', IND_LABELS[app.industry] || app.industry) +
      dlRow('Years Active', app.yearsActive) +
      dlRow('Scholarship Type', TYPE_LABELS[app.scholarshipType] || app.scholarshipType) +
      dlRow('Training Title', app.trainingTitle) +
      dlRow('Training Provider', app.trainingProvider) +
      dlRow('Submitted', formatDate(app.createdAt));

    var bens = app.beneficiaries || [];
    if (bens.length === 0) {
      document.getElementById('detail-beneficiaries').innerHTML = '<p class="text-muted">No beneficiaries.</p>';
    } else {
      var bHtml = '<table class="scholarship-table"><thead><tr><th>Name</th><th>National ID</th><th>Role</th><th>Program</th></tr></thead><tbody>';
      bens.forEach(function (b) {
        bHtml += '<tr><td>' + b.employeeName + '</td><td>' + b.employeeNationalId + '</td><td>' + b.employeeRole + '</td><td>' + b.trainingProgram + '</td></tr>';
      });
      bHtml += '</tbody></table>';
      document.getElementById('detail-beneficiaries').innerHTML = bHtml;
    }

    var fin = app.financial;
    if (fin) {
      document.getElementById('detail-financials').innerHTML =
        dlRow('Tuition Fee', Number(fin.tuitionFee).toLocaleString()) +
        dlRow('Materials Cost', Number(fin.materialsCost).toLocaleString()) +
        dlRow('Travel & Accommodation', Number(fin.travelCost).toLocaleString()) +
        dlRow('Total Cost', '<strong>' + Number(fin.totalCost).toLocaleString() + '</strong>') +
        dlRow('Bank Name', fin.bankName) +
        dlRow('IBAN / Account', fin.bankAccountNumber);
    } else {
      document.getElementById('detail-financials').innerHTML = '<p class="text-muted">No financial data.</p>';
    }

    document.getElementById('detail-rules').innerHTML =
      dlRow('Eligible', app.eligible === true ? 'Yes' : app.eligible === false ? 'No' : '\u2014') +
      dlRow('Eligibility Details', app.eligibilityReason) +
      dlRow('Quota Allowed', app.quotaAllowed) +
      dlRow('Quota Used', app.quotaUsed) +
      dlRow('Recommended Coverage', app.recommendedCoveragePercent != null ? app.recommendedCoveragePercent + '%' : '\u2014') +
      dlRow('Recommended Amount', app.recommendedCoverageAmount != null ? Number(app.recommendedCoverageAmount).toLocaleString() + ' EGP' : '\u2014');

    var adminSection = document.getElementById('detail-admin-section');
    if (app.status === 'ACCEPTED' || app.status === 'REJECTED' || app.reviewedBy) {
      adminSection.style.display = '';
      document.getElementById('detail-admin').innerHTML =
        dlRow('Decision', app.status) +
        dlRow('Final Coverage', app.governmentCoveragePercent != null ? app.governmentCoveragePercent + '%' : '\u2014') +
        dlRow('Final Amount', app.governmentCoverageAmount != null ? Number(app.governmentCoverageAmount).toLocaleString() + ' EGP' : '\u2014') +
        dlRow('Admin Notes', app.adminNotes) +
        dlRow('Reviewed By', app.reviewedBy) +
        dlRow('Reviewed At', formatDate(app.reviewedAt));
    } else {
      adminSection.style.display = 'none';
    }
  }

  /* ─── Load applications list ─── */
  async function loadApplications() {
    var loadingEl = document.getElementById('applications-loading');
    var emptyEl = document.getElementById('applications-empty');
    var tableWrap = document.getElementById('applications-table-wrap');
    var appTbody = document.getElementById('applications-tbody');

    if (loadingEl) loadingEl.style.display = 'block';
    if (emptyEl) emptyEl.style.display = 'none';
    if (tableWrap) tableWrap.style.display = 'none';
    if (appTbody) appTbody.innerHTML = '';

    try {
      var res = await window.EgovAuth.apiFetch('/scholarship/my-requests');
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          if (loadingEl) loadingEl.style.display = 'none';
          if (emptyEl) {
            emptyEl.textContent = 'Please sign in to view your applications.';
            emptyEl.style.display = 'block';
          }
          return;
        }
        throw new Error('Failed to load applications');
      }

      var list = await res.json();
      if (loadingEl) loadingEl.style.display = 'none';

      if (!list || list.length === 0) {
        if (emptyEl) {
          emptyEl.textContent = 'No applications yet. Submit one above.';
          emptyEl.style.display = 'block';
        }
        return;
      }

      if (tableWrap) tableWrap.style.display = 'block';

      list.forEach(function (app) {
        var tr = document.createElement('tr');
        var coverageText = app.governmentCoveragePercent
          ? app.governmentCoveragePercent + '%'
          : app.recommendedCoveragePercent
            ? app.recommendedCoveragePercent + '% (rec.)'
            : '\u2014';

        tr.innerHTML =
          '<td><a href="#" class="app-link" data-id="' + app.id + '" title="' + app.id + '">' + app.id.substring(0, 8) + '\u2026</a></td>' +
          '<td>' + (app.businessName || '\u2014') + '</td>' +
          '<td>' + (TYPE_LABELS[app.scholarshipType] || app.scholarshipType || '\u2014') + '</td>' +
          '<td>' + coverageText + '</td>' +
          '<td><span class="status-badge ' + statusBadgeClass(app.status) + '">' + (app.status || 'DRAFT') + '</span></td>' +
          '<td>' + formatDate(app.createdAt) + '</td>';
        appTbody.appendChild(tr);
      });

      appTbody.addEventListener('click', function (e) {
        var link = e.target.closest('.app-link');
        if (link) {
          e.preventDefault();
          window.viewScholarshipApplication(link.dataset.id);
        }
      });
    } catch (e) {
      if (loadingEl) loadingEl.style.display = 'none';
      if (emptyEl) {
        emptyEl.textContent = 'Error loading applications. Please try again.';
        emptyEl.style.display = 'block';
      }
    }
  }

  /* ─── Init ─── */
  goToStep(1);
  loadApplications();
});
