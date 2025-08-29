import {auth, db, loginWithGoogle, logout } from "./firebase-init.js";
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js'
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { showToast } from "./utils.js";

window.userProfile = {};

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
    console.log('snap', snap);

    if (snap.exists()) {
        const data = snap.data();
        window.userProfile = data;
        fillFormFromData(resumeForm, snap.data());
        console.log('resumeForm', resumeForm);
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


// ====== створення блоку досвіду ======
function createBlock(item, index, type, fields, withAchievements = false) {
  const wrapper = document.createElement("div");
  wrapper.classList.add("exp-card");
  wrapper.dataset.expIndex = index;

  const header = document.createElement("div");
  header.classList.add("exp-header");

  const label = document.createElement("label");
  label.classList.add("exp-label");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = `${type}Checkbox${index}`;
  checkbox.name = `${type}_include[]`;
  checkbox.value = "1";
  checkbox.dataset.expToggle = "";
  checkbox.dataset.index = index;
  checkbox.dataset.type = type;

  const span = document.createElement("span");
  span.textContent = `${item[fields[0]] || capitalize(fields[0])} — ${item[fields[1]] || capitalize(fields[1])} (${item.dates || "Dates"})`;

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.classList.add("remove-btn");
  removeBtn.textContent = "✖";
  removeBtn.addEventListener("click", () => wrapper.remove());

  label.appendChild(checkbox);
  label.appendChild(span);

  header.appendChild(label);
  header.appendChild(removeBtn);

  const detailsWrapper = document.createElement("div");
  detailsWrapper.id = `${type}Details${index}`;
  detailsWrapper.classList.add("exp-details-wrapper");

  const details = document.createElement("div");
  details.classList.add("exp-details");

  fields.forEach(field => {
    const input = document.createElement("input");
    input.type = "text";
    input.name = `${type}${capitalize(field)}[]`;
    input.dataset.field = field;
    input.value = item[field] || "";
    input.placeholder = capitalize(field);
    details.appendChild(input);
  });

  detailsWrapper.appendChild(details);

  if (withAchievements) {
    const achLabel = document.createElement("label");
    achLabel.setAttribute("for", `${type}Achievements${index}`);
    achLabel.classList.add("input-label");
    achLabel.textContent = "Achievements:";

    const textarea = document.createElement("textarea");
    textarea.id = `${type}Achievements${index}`;
    textarea.name = `${type}Achievements[]`;
    textarea.dataset.field = "achievements";
    textarea.rows = 6;
    textarea.value = item.achievements || "";

    detailsWrapper.appendChild(achLabel);
    detailsWrapper.appendChild(textarea);
  }

  wrapper.appendChild(header);
  wrapper.appendChild(detailsWrapper);

  return wrapper;
}


function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ========= render blocks ==========
function renderBlocks(containerId, data, type) {
  const container = document.getElementById(containerId);
  if (!container) return;

  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  const config = blockConfigs[type];
  if (!config) return;

  const { fields, withAchievements } = config;

  (Array.isArray(data) ? data : []).forEach((item, index) => {
    const safeBlock = createBlock(item || {}, index, type, fields, withAchievements);

    if (safeBlock instanceof HTMLElement) {
      container.appendChild(safeBlock);
    } else {
      console.warn("createBlock did not return an element", safeBlock);
    }
  });

  counters[type] = Array.isArray(data) ? data.length : 0;
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
    await setDoc(doc(db, "users", currentUser.uid), saveData, { merge: true });
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

    if (!window.userProfile) window.userProfile = {};
    window.userProfile[blockName] = blockData;

    showToast("✅ Збережено!");
    console.log("Updated global userProfile:", window.userProfile);
  } catch (err) {
    showToast("❌ Помилка", true);
    console.error(`Error saving ${blockName}:`, err);
  }
}

