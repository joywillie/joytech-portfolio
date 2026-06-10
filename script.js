// --- 1. RESPONSIVE MOBILE MENU SELECTION CONTROLLER ---
const menuToggle = document.querySelector('.menu-toggle');
const navMenu = document.querySelector('nav');
const navLinks = document.querySelectorAll('nav a');

menuToggle.addEventListener('click', () => {
  menuToggle.classList.toggle('active');
  navMenu.classList.toggle('active');
});

navLinks.forEach(link => {
  link.addEventListener('click', () => {
    menuToggle.classList.remove('active');
    navMenu.classList.remove('active');
  });
});

// --- 2. SYSTEM SECURE LOGOUT ---
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('joytech_token'); // Clear the session token
    window.location.replace('/'); // Send back to login gateway
  });
}

// --- 3. SECURE FORMSPREE ASYNCHRONOUS SUBMISSION PIPELINE ---
const contactForm = document.getElementById('contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('[data-fs-submit-btn]');
    const successAlert = document.querySelector('[data-fs-success]');
    const errorAlert = document.querySelector('[data-fs-error]');
    
    successAlert.style.display = 'none';
    errorAlert.style.display = 'none';
    form.querySelectorAll('[data-fs-field]').forEach(field => field.removeAttribute('aria-invalid'));
    form.querySelectorAll('.field-error').forEach(err => err.textContent = '');

    submitBtn.disabled = true;
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';

    const formData = new FormData(form);

    try {
      const response = await fetch('https://formspree.io/f/xjgledbb', {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        successAlert.style.display = 'block';
        form.reset();
      } else {
        const data = await response.json();
        if (data.errors) {
          data.errors.forEach(err => {
            const fieldInput = form.querySelector(`[name="${err.field}"]`);
            const fieldErrorSpan = form.querySelector(`[data-fs-error="${err.field}"]`);
            
            if (fieldInput) fieldInput.setAttribute('aria-invalid', 'true');
            if (fieldErrorSpan) fieldErrorSpan.textContent = err.message;
          });
        }
        errorAlert.style.display = 'block';
      }
    } catch (error) {
      errorAlert.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });
}
