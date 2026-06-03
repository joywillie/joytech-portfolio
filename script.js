// --- 1. RESPONSIVE MOBILE MENU SELECTION CONTROLLER ---
const menuToggle = document.querySelector('.menu-toggle');
const navMenu = document.querySelector('nav');
const navLinks = document.querySelectorAll('nav a');

// Open/Close menu overlay when clicking the hamburger switch button
menuToggle.addEventListener('click', () => {
  menuToggle.classList.toggle('active');
  navMenu.classList.toggle('active');
});

// Auto-retract mobile panel drawer if a user targets an anchor location link
navLinks.forEach(link => {
  link.addEventListener('click', () => {
    menuToggle.classList.remove('active');
    navMenu.classList.remove('active');
  });
});


// --- 2. SECURE FORMSPREE ASYNCHRONOUS SUBMISSION PIPELINE ---
document.getElementById('contact-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const form = e.target;
  const submitBtn = form.querySelector('[data-fs-submit-btn]');
  const successAlert = document.querySelector('[data-fs-success]');
  const errorAlert = document.querySelector('[data-fs-error]');
  
  // Wipe cleanly any lingering structural alert logs and inline warning targets
  successAlert.style.display = 'none';
  errorAlert.style.display = 'none';
  form.querySelectorAll('[data-fs-field]').forEach(field => field.removeAttribute('aria-invalid'));
  form.querySelectorAll('.field-error').forEach(err => err.textContent = '');

  // Establish submission waiting state block mechanisms
  submitBtn.disabled = true;
  const originalBtnText = submitBtn.textContent;
  submitBtn.textContent = 'Sending...';

  const formData = new FormData(form);

  try {
    const response = await fetch('https://formspree.io/f/xjgledbb', {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      // Clear values upon valid status response execution match
      successAlert.style.display = 'block';
      form.reset();
    } else {
      const data = await response.json();
      if (data.errors) {
        // Parse individual field parameters passed down by Formspree API engine
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
    // Fallback for offline environments or connection failure drops
    errorAlert.style.display = 'block';
  } finally {
    // Re-enable input button controls
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
  }
});
