// ======================================================
// 1. MOBILE MENU CONTROLLER (SAFE + RESPONSIVE)
// ======================================================
const menuToggle = document.querySelector('.menu-toggle');
const navMenu = document.querySelector('nav');
const navLinks = document.querySelectorAll('nav a');

if (menuToggle && navMenu) {
  menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('active');
    navMenu.classList.toggle('active');
  });
}

navLinks.forEach(link => {
  link.addEventListener('click', () => {
    menuToggle?.classList.remove('active');
    navMenu?.classList.remove('active');
  });
});


// ======================================================
// 2. LOGOUT SYSTEM (SECURE SESSION CLEAR)
// ======================================================
const logoutBtn = document.getElementById('logoutBtn');

if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();

    localStorage.removeItem('joytech_token');
    window.location.replace('/auth');
  });
}


// ======================================================
// 3. CONTACT FORM (FORMSPREE + BACKEND SAFE PIPELINE)
// ======================================================
const contactForm = document.getElementById('contact-form');

if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = contactForm.querySelector('[data-fs-submit-btn]');
    const successAlert = document.querySelector('[data-fs-success]');
    const errorAlert = document.querySelector('[data-fs-error]');

    if (successAlert) successAlert.style.display = 'none';
    if (errorAlert) errorAlert.style.display = 'none';

    contactForm.querySelectorAll('[data-fs-field]')
      .forEach(f => f.removeAttribute('aria-invalid'));

    contactForm.querySelectorAll('.field-error')
      .forEach(el => el.textContent = '');

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
    }

    const formData = new FormData(contactForm);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      });

      const data = await response.json();

      if (response.ok) {
        if (successAlert) successAlert.style.display = 'block';
        contactForm.reset();
      } else {
        throw new Error(data.error || 'Submission failed');
      }

    } catch (error) {
      if (errorAlert) {
        errorAlert.style.display = 'block';
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message';
      }
    }
  });
}
