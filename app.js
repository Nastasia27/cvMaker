import {auth, db, loginWithGoogle, logout } from "./firebase-init.js";
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js'
import { doc, addDoc, collection, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const loginBtn   = document.getElementById("loginBtn");
const logoutBtn  = document.getElementById("logoutBtn");
const authSection = document.getElementById("auth-section");
const userInfo = document.getElementById("user-nav");
const profileSection = document.getElementById("profile-section");
const userEmail = document.getElementById("userEmail");
const resumeForm = document.getElementById("resumeForm");

const blockConfigs = {
  experience: {
    fields: ["company", "industry", "title", "location", "dates"],
    withAchievements: true,
  },
  teaching: {
    fields: ["company", "industry", "title", "location", "dates"],
    withAchievements: false,
  },
  education: {
    fields: ["school", "sphere", "location", "dates"],
    withAchievements: false,
  },
};

let currentUser = null;

let counters = {
  experience: 0,
  education: 0,
  teaching: 0,
};

// LogIn
loginBtn.addEventListener("click", async () => {
  try {
    await loginWithGoogle();
  } catch (err) {
    showToast("Помилка входу: " + (err?.message || err));
  } 
});


// LogOut
logoutBtn.addEventListener("click", async () => {
  try {
    await logout();
  } catch (e) {
    showToast("Помилка виходу: " + (e?.message || e));
  }
});

//toggle на досвід
document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.matches('input[type="checkbox"][data-exp-toggle]')) {
    const index = Number(el.getAttribute("data-index"));
    const type  = el.getAttribute("data-type");
    toggleDetails(index, type);
  }
});

//add button
document.querySelectorAll(".add-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.getAttribute("data-target");
    const type = btn.getAttribute("data-type");
    addBlock(targetId, type);
  });
});

//save btn
document.querySelectorAll(".saveBtn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const section = e.target.closest("section");
    saveSection(section, currentUser.uid);
  });
});


// ======== Authorization ============
onAuthStateChanged(auth, async(user) => {
  if (user) {
    currentUser = user;
    console.log(user)
    authSection.style.display = "none";
    profileSection.style.display = "block";
    userInfo.style.display = "block";
    userEmail.textContent = user.email;

    await loadUserProfile(user.uid);

  } else {
        currentUser = null;
        authSection.style.display = "flex";
        profileSection.style.display = "none";
        userEmail.textContent = "";
  }
});

// ====== Завантаження даних профілю ======
async function loadUserProfile(uid) {
  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    console.log(snap);

    if (snap.exists()) {
        const data = snap.data();
        fillFormFromData(resumeForm, snap.data());
        renderBlocks("experienceSection", data.professionalExperience || [], "experience");
        renderBlocks("teachingSection", data.teachingExperience || [], "teaching");
        renderBlocks("educationSection", data.education || [], "education");
        console.log("Profile loaded:", snap.data());
    } else {
        renderBlocks("teachingSection", [], "teaching", false);
        renderBlocks("experienceSection", [], "experience");
        renderBlocks("educationSection", [], "education");
        console.log("No profile data found.");
    }
  } catch (err) {
        console.error("Error loading profile:", err);
  }
}

// ====== Заповнення форми з об'єкта ======
function fillFormFromData(form, data) {
    if (!form || !data) return;
    Object.keys(data).forEach((key) => {
        const field = form.elements[key];
        if (!field) return;

        if (field.type === "checkbox") {
            field.checked = !!data[key];
        } else if (field.type === "radio") {
            const radioToCheck = form.querySelector(`[name="${key}"][value="${data[key]}"]`);
            if (radioToCheck) radioToCheck.checked = true;
        } else {
            field.value = data[key];
        }
    });
}

//create new block with inputs depends on the type
function createBlock(item, index, type, fields, withAchievements = false) {
  const wrapper = document.createElement("div");
  wrapper.classList.add("exp-card");
  wrapper.setAttribute("data-exp-index", index);

  const id = `${type}Checkbox${index}`;

  const fieldsHtml = fields.map(field => `
    <input 
      type="text" 
      name="${type}${capitalize(field)}[]" 
      data-field="${field}" 
      value="${item[field] || ""}" 
      placeholder="${capitalize(field)}"
    />
  `).join("");

  wrapper.innerHTML = `
    <div class="exp-header">
      <label class="exp-label">
        <input type="checkbox" id="${id}" name="${type}_include[]" value="1" 
          data-exp-toggle data-index="${index}" data-type="${type}" />
        <span>
          ${item[fields[0]] || capitalize(fields[0])} — ${item[fields[1]] || capitalize(fields[1])} (${item.dates || "Dates"})
        </span>
      </label>
      <button type="button" class="remove-btn">✖</button>
    </div>

    <div id="${type}Details${index}" class="exp-details-wrapper">
      <div class="exp-details">
        ${fieldsHtml}
      </div>
      ${
        withAchievements
          ? `<label for="${type}Achievements${index}" class="input-label">Achievements:</label>
             <textarea id="${type}Achievements${index}" name="${type}Achievements[]" 
               data-field="achievements" rows="6">${item.achievements || ""}</textarea>`
          : ""
      }
    </div>
  `;

  wrapper.querySelector(".remove-btn").addEventListener("click", () => wrapper.remove());
  return wrapper;
}


function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ========= render blocks ==========
function renderBlocks(containerId, data, type) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  const { fields, withAchievements } = blockConfigs[type];

  data.forEach((item, index) => {
    container.appendChild(createBlock(item || {}, index, type, fields, withAchievements));
  });

  counters[type] = data.length;
}

// ======== add new block ===========
function addBlock(targetId, type) {
  const container = document.getElementById(targetId);
  if (!container) return;
  const index = counters[type];
  const { fields, withAchievements } = blockConfigs[type];

  const newBlock = createBlock({}, index, type, fields, withAchievements);
  container.appendChild(newBlock);
  counters[type]++;
}

function collectBlocks(formData, type) {
  const { fields, withAchievements } = blockConfigs[type];

  return formData[`${type}${capitalize(fields[0])}`]?.map((_, i) => {
    const obj = {};
    fields.forEach(field => {
        obj[field] = formData[`${type}${capitalize(field)}`][i] || "";
    });
    if (withAchievements) {
      obj.achievements = formData[`${type}Achievements`][i] || "";
    }
    return obj;
  }) || [];
}


// функція для показу/приховування деталей
function toggleDetails(index, type) {
    const checkbox = document.getElementById(`${type}Checkbox${index}`);
    const details = document.getElementById(`${type}Details${index}`);
    if (!checkbox || !details) return;
    details.style.display =  checkbox.checked ? "block" : 'none';
}


// ====== Сабміт та збереження даних ======
resumeForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return showToast("Please log in first");

  const formData = {};
  new FormData(resumeForm).forEach((value, key) => {
    // Якщо масив (company[], industry[], etc.)
    if (key.endsWith("[]")) {
      const cleanKey = key.replace("[]", "");
      if (!formData[cleanKey]) formData[cleanKey] = [];
      formData[cleanKey].push(value);
    } else {
      formData[key] = value;
    }
  });

    const professionalExperience = collectBlocks(formData, "experience");
    const teachingExperience = collectBlocks(formData, "teaching");
    const education = collectBlocks(formData, "education");

    const saveData = {
        ...formData,
        professionalExperience,
        teachingExperience,
        education,
    };


  try {
    await setDoc(doc(db, "users", currentUser.uid), saveData);
    showToast("Profile saved!");
  } catch (err) {
    console.error("Error saving profile:", err);
    showToast("Save failed: " + err.message);
  }
});

// ======== save data only from one section =========
async function saveSection(sectionEl, uid) {
  const blockName = sectionEl.dataset.block;
  const inputs = sectionEl.querySelectorAll("input, textarea, select");
  const statusEl = sectionEl.querySelector(".status");

  // збираємо дані
  const blockData = {};
  inputs.forEach((el) => {
    blockData[el.name] = el.value;
  });

  try {
    await setDoc(
      doc(db, "users", uid),
      { [blockName]: blockData },
      { merge: true }
    );
    showToast("✅ Збережено!");
  } catch (err) {
    showToast("❌ Помилка");
    console.error(`Error saving ${blockName}:`, err);
  }
}

// ===== show messages and errors ======
function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.style.background = isError ? "#e74c3c" : "#2ecc71"; 
  toast.className = "show";

  setTimeout(() => {
    toast.className = toast.className.replace("show", "");
  }, 3000);
}



// const userBox    = document.getElementById("userBox");
// const userPhoto  = document.getElementById("userPhoto");

// const statusEl   = document.getElementById("status");
// const checkInit  = document.getElementById("checkInit");
// const checkAuth  = document.getElementById("checkAuthObs");
// const checkUser  = document.getElementById("checkUser");

// function setCheck(el, ok) {
//   el.textContent = ok ? "OK" : "ERR";
//   el.className = ok ? "good" : "bad";
// }

// function renderSignedOut() {
//   statusEl.textContent = "Не авторизовано.";
//   userBox.classList.add("hidden");
//   loginBtn.classList.remove("hidden");
//   setCheck(checkUser, false);
// }

// function renderSignedIn(user) {
//   statusEl.textContent = `Авторизовано як: ${user.displayName || user.email}`;
//   userEmail.textContent = user.email || "";
//   userPhoto.src = user.photoURL || "";
//   userPhoto.alt = user.displayName || "user";
//   userBox.classList.remove("hidden");
//   loginBtn.classList.add("hidden");
//   setCheck(checkUser, true);
// }



// Ініціалізація/спостерігач
// (function init() {
//   setCheck(checkInit, !!window.__fb?.app);
//   setCheck(checkAuth, true);
//   watchAuth((user) => {
//     if (user) renderSignedIn(user);
//     else renderSignedOut();
//   });
// })();