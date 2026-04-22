/**
 * E-Government Portal JavaScript
 * Handles Navigation, Scroll animations, Number Counters, and Form Validation
 */

document.addEventListener('DOMContentLoaded', () => {
  // Sync Nav UI
  updateNavUI();

  // === 1. Sticky Navigation & Mobile Menu ===
  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');

  // Add solid class if not on homepage (where hero image is)
  const isHomePage = document.querySelector('.hero') !== null;
  if (!isHomePage) {
    navbar.classList.add('solid');
  }

  // Scroll effect for navbar
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  // Mobile menu toggle
  if (navToggle) {
    navToggle.addEventListener('click', () => {
      const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', !isExpanded);
      navMenu.classList.toggle('active');
      
      const icon = navToggle.querySelector('i');
      if (!isExpanded) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
      } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
      }
    });
  }

  // === 2. Scroll Reveal Animations ===
  const reveals = document.querySelectorAll('.reveal');

  function reveal() {
    const windowHeight = window.innerHeight;
    const elementVisible = 100;

    reveals.forEach((revealElement) => {
      const elementTop = revealElement.getBoundingClientRect().top;
      if (elementTop < windowHeight - elementVisible) {
        revealElement.classList.add('active');
      }
    });
  }

  // Initial check
  reveal();
  window.addEventListener('scroll', reveal);

  // === 3. Animated Number Counters ===
  const counters = document.querySelectorAll('.stat-number');
  let hasCounted = false;

  function startCounting() {
    if (hasCounted || counters.length === 0) return;

    const statsSection = document.getElementById('statistics');
    if (!statsSection) return;

    const sectionTop = statsSection.getBoundingClientRect().top;

    // Start counting when section is visible
    if (sectionTop < window.innerHeight - 100) {
      hasCounted = true;

      counters.forEach((counter) => {
        const target = parseInt(counter.getAttribute('data-target'));
        const duration = 2000; // 2 seconds
        const increment = target / (duration / 16); // 60fps

        let current = 0;
        const updateCounter = () => {
          current += increment;
          if (current < target) {
            counter.innerText = Math.ceil(current).toLocaleString();
            requestAnimationFrame(updateCounter);
          } else {
            counter.innerText = target.toLocaleString();
          }
        };

        updateCounter();
      });
    }
  }

  window.addEventListener('scroll', startCounting);
  startCounting(); // Check on load

  // === 4. Form Validation (Login/Contact) ===

  // Password Toggle
  const togglePassword = document.querySelector('.password-toggle');
  const passwordInput = document.getElementById('password');

  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function () {
      const type =
        passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      this.classList.toggle('fa-eye');
      this.classList.toggle('fa-eye-slash');
    });
  }

  // Login Form Validation is handled locally in login.html to support service-specific redirects.

  // Contact Form Validation
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      let isValid =
        validateInput('fullName', 'Name is required') &
        validateEmail('email', 'Valid email is required') &
        validateInput('subject', 'Please select a subject.') &
        validateInput('message', 'Message field cannot be empty.');

      if (isValid) {
        const btn = contactForm.querySelector('.btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Processing...';
        btn.disabled = true;

        setTimeout(() => {
          const alertRegion = document.getElementById('contact-alert');
          if (alertRegion) alertRegion.style.display = 'flex';
          contactForm.reset();
          btn.innerHTML = originalText;
          btn.disabled = false;
        }, 1500);
      }
    });
  }

  function validateInput(id, errorMsg) {
    const input = document.getElementById(id);
    if (!input) return true;

    if (input.value.trim() === '') {
      setError(input, errorMsg);
      return false;
    } else {
      removeError(input);
      return true;
    }
  }

  function validateEmail(id, errorMsg) {
    const input = document.getElementById(id);
    if (!input) return true;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.value.trim())) {
      setError(input, errorMsg);
      return false;
    } else {
      removeError(input);
      return true;
    }
  }

  function setError(input, message) {
    const inputGroup = input.parentElement;
    inputGroup.classList.add('error');
    input.setAttribute('aria-invalid', 'true');
    const errorElement = inputGroup.querySelector('.error-message');
    if (errorElement) errorElement.innerText = message;
  }

  function removeError(input) {
    const inputGroup = input.parentElement;
    inputGroup.classList.remove('error');
    input.setAttribute('aria-invalid', 'false');
  }

  function updateNavUI() {
    const token = localStorage.getItem('egov_token');
    const navMenu = document.getElementById('nav-menu');
    if (!navMenu) return;

    let loginBtn = navMenu.querySelector('.btn-primary, .btn-outline');
    // If we can't find it by class, look for "Login" text
    if (!loginBtn) {
      const links = navMenu.querySelectorAll('.nav-link, .btn');
      links.forEach((l) => {
        if (l.innerText.includes('Login')) loginBtn = l;
      });
    }

    if (token && loginBtn) {
      // User is logged in
      const userRaw = localStorage.getItem('egov_user');
      let userName = 'Dashboard';
      let isSupervisorOrAdmin = false;
      try {
        const u = JSON.parse(userRaw);
        if (u && u.username) userName = u.username;
        if (u && Array.isArray(u.roles)) {
          isSupervisorOrAdmin =
            u.roles.includes('supervisor') || u.roles.includes('admin');
        }
      } catch (e) {}

      // Change Login button to Dashboard link
      loginBtn.innerHTML = `<i class="fas fa-user-circle" aria-hidden="true"></i> Dashboard (${userName})`;
      loginBtn.className = 'btn btn-primary';
      loginBtn.id = 'nav-dashboard-btn';

      // Determine correct path and dashboard type based on page depth and role
      const isSubPage = window.location.pathname.includes('/pages/');
      const dashboardPath = isSupervisorOrAdmin
        ? (isSubPage ? '../supervisor-dashboard.html' : './supervisor-dashboard.html')
        : (isSubPage ? '../dashboard.html' : './dashboard.html');
      loginBtn.href = dashboardPath;

      // Add Logout button if not present
      if (!document.getElementById('nav-logout')) {
        const logoutBtn = document.createElement('a');
        logoutBtn.id = 'nav-logout';
        logoutBtn.href = '#';
        logoutBtn.className = 'btn btn-outline';
        logoutBtn.style.marginLeft = '0.5rem';
        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt" aria-hidden="true"></i> Logout';
        logoutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          localStorage.removeItem('egov_token');
          localStorage.removeItem('egov_user');
          window.location.href = isSubPage ? '../index.html' : './index.html';
        });
        navMenu.appendChild(logoutBtn);
      }
    }
  }
});
