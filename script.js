// MENU
const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector("nav");

menuToggle?.addEventListener("click", () => {
  nav.classList.toggle("active");
  menuToggle.classList.toggle("active");
});

// LOGOUT
document.getElementById("logoutBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.removeItem("joytech_token");
  window.location.href = "/";
});

// CONTACT FORM
const form = document.getElementById("contact-form");

form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const popup = document.getElementById("successPopup");

  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.value,
        email: form.email.value,
        service: form.service.value,
        message: form.message.value
      })
    });

    if (res.ok) {
      form.reset();

      // ✅ SHOW POPUP (FIXED ISSUE YOU HAD)
      popup.style.display = "block";

      setTimeout(() => {
        popup.style.display = "none";
      }, 4000);
    } else {
      alert("Failed to send message");
    }
  } catch (err) {
    alert("Network error");
  }
});
