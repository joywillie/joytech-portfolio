/* =========================================================
   1. MOBILE MENU TOGGLE (SAFE + FIXED)
========================================================= */

const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector("nav");

if (menuToggle && nav) {
  menuToggle.addEventListener("click", () => {
    nav.classList.toggle("active");
    menuToggle.classList.toggle("active");
  });

  document.querySelectorAll("nav a").forEach(link => {
    link.addEventListener("click", () => {
      nav.classList.remove("active");
      menuToggle.classList.remove("active");
    });
  });
}


/* =========================================================
   2. LOGOUT SYSTEM (SAFE GUARD)
========================================================= */

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();

    localStorage.removeItem("joytech_token");

    // redirect to auth page
    window.location.href = "/auth";
  });
}


/* =========================================================
   3. CONTACT FORM SUBMISSION (FIXED + POPUPS WORKING)
========================================================= */

const form = document.getElementById("contact-form");
const successPopup = document.getElementById("successPopup");
const errorPopup = document.getElementById("errorPopup");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // hide old messages
    if (successPopup) successPopup.style.display = "none";
    if (errorPopup) errorPopup.style.display = "none";

    const formData = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      service: form.service.value,
      message: form.message.value.trim()
    };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        // SUCCESS
        if (successPopup) successPopup.style.display = "block";
        if (errorPopup) errorPopup.style.display = "none";

        form.reset();
      } else {
        // SERVER ERROR
        if (errorPopup) {
          errorPopup.style.display = "block";
          errorPopup.textContent = result.error || "Failed to send message.";
        }
      }
    } catch (error) {
      // NETWORK ERROR
      if (errorPopup) {
        errorPopup.style.display = "block";
        errorPopup.textContent = "Network error. Try again.";
      }
    }
  });
}
