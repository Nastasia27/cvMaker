import { showToast } from "./utils.js";
import { escapeHTML } from "./utils.js";
import {auth} from "./firebase-init.js";

const WORKER_URL = "https://divine-feather-fff4.kop-anastasia27.workers.dev/";

const fillSkillsBtn = document.getElementById("fill-skills-btn");
const loaderOverlay = document.getElementById("loaderOverlay");
const fillAchievementsBtn = document.getElementById("fill-achievements-btn");
const generateCoverLBtn = document.getElementById("generate-cl-btn");
const copyCLBtn = document.getElementById("copyCLBtn");
const validateCLBtn = document.getElementById("validateCLBtn");
const validateCVBtn = document.getElementById("validateCVBtn");
const resumeBtn = document.getElementById('resume-btn');
resumeBtn.addEventListener('click', redirectToAppScript);


fillSkillsBtn.addEventListener('click', fillSkillsFromAI);
fillAchievementsBtn.addEventListener('click', autoFillAchievements);
generateCoverLBtn.addEventListener('click', generateCoverLetter);
copyCLBtn.addEventListener('click', copyCoverLetter);
validateCLBtn.addEventListener('click', validateCoverLetter);
validateCVBtn.addEventListener('click', validateCV);

// ======= main API request ========
async function callGAS(action, payload = {}) {
  
  try {
    const response = await fetch(`${WORKER_URL}?action=${action}`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Response not OK:", errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data;
  } catch (err) {
    console.error("GAS request error:", err);
    throw err;
  }
}

async function fillSkillsFromAI() {
  const jobDescription = document.getElementById("jobDescription").value.trim();
  const userProfile = window.userProfile || {};
  const skillsTextarea = document.getElementById("skills");

  if (!jobDescription) {
    showToast("Будь ласка, введіть опис вакансії спочатку", true);
    return;
  }

  try {
    if (loaderOverlay) loaderOverlay.style.display = "block";

    const data = await callGAS("getSkillsFromAI", {
      jobDescription,
      profile: userProfile,
    });

    if (data) {
      let skillsText = "";

      if (typeof data === "string") {
        skillsText = data.trim();
      } else if (Array.isArray(data)) {
        skillsText = data.join(", ");
      } else if (typeof data === "object") {
        skillsText = Object.values(data).join(", ");
      }

      if (skillsText) {
        skillsTextarea.value = skillsText;
      } else {
        alert("AI не зміг згенерувати скіли. Спробуйте інший опис вакансії.");
      }
    }

  } catch (error) {
    alert(`Помилка при зверненні до AI: ${error.message}`);
  } finally {
    if (loaderOverlay) loaderOverlay.style.display = "none";
  }
}

// ==== Автозаповнення досягнень ====
async function autoFillAchievements() {
  const jobDescription = document.getElementById("jobDescription").value.trim();
  const selectedJobs = getSelectedJobs();
  const userProfile = window.userProfile || {};

  if (selectedJobs.length === 0) {
    showToast("Виберіть місце роботи для заповнення досягнень.", true);
    return;
  }

  loaderOverlay.style.display = "block";

  try {
    const data = await callGAS("generateAchievementsAI", {
      jobDescription,
      companies: selectedJobs.map((j) => j.company),
      profile: userProfile,
    });

    selectedJobs.forEach((job) => {
      const achievementsTextarea = document.getElementById(
        `experienceAchievements${job.index}`
      );
      const aiAchievements = data[job.company];

      if (achievementsTextarea && aiAchievements?.length > 0) {
        achievementsTextarea.value = aiAchievements
          .map((achievement, i) => `${i + 1}. ${achievement}`)
          .join("\n");
      }
    });
  } catch (err) {
      showToast("Помилка при зверненні до AI.", true);
  } finally {
      loaderOverlay.style.display = "none";
  }
}


// ==== Генерування cover letter ====
async function generateCoverLetter() {
  const jobDescription = document.getElementById("jobDescription").value.trim();
  const jobTitle = document.getElementById("targetCompany").value.trim();
  const selectedLang = document.querySelector('input[name="coverLang"]:checked')?.value || 'English';

  if (!jobDescription && !jobTitle) {
    showToast("Будь ласка, введіть назву компанії та опис вакансії", true);
    return;
  }

  const resumeForm = document.getElementById('resumeForm');
  const selectedProfile = getSelectedProfileData(resumeForm, window.userProfile);

  loaderOverlay.style.display = "block";

  try {
    const result = await callGAS("generateCoverLetterAI", {
      jobDescription: jobDescription,
      jobTitle: jobTitle,
      profile: selectedProfile,
      selectedLang: selectedLang,
    });

    const coverLetter = document.getElementById("coverLetter");
    coverLetter.value = result;
    
  } catch (err) {
      showToast("Помилка при зверненні до AI.", true);
  } finally {
      loaderOverlay.style.display = "none";
  }
}

// === copy cover letter ======
async function copyCoverLetter() {
  const textarea = document.getElementById('coverLetter');
  const tooltip = document.getElementById('copyTooltip');

  const text = textarea.value.trim();
  if (!text) {
    showToast("Немає тексту для копіювання.", true);
    return;
  }

  try {
    await navigator.clipboard.writeText(textarea.value);

    if (tooltip) {
      tooltip.style.visibility = 'visible';
      setTimeout(() => {
        tooltip.style.visibility = 'hidden';
      }, 1000);
    }
    showToast("Текст успішно скопійовано!", false);
  } catch (err) {
    showToast("Не вдалося скопіювати текст. Спробуйте ще раз.", true);
  }
}


// ==== валідація cover letter ======
async function validateCoverLetter() {
  const jobDescription = document.getElementById('jobDescription')?.value.trim() || "";
  const jobTitle = document.getElementById("targetCompany")?.value.trim() || "";

  if (!jobDescription && !jobTitle) {
    showToast("Будь ласка, введіть назву компанії та опис вакансії", true);
    return;
  }

  const coverLetterText = document.getElementById('coverLetter')?.value.trim() || "";
  const coverChart = document.getElementById('cover-chart');
  const coverSuggestions = document.getElementById('cover-suggestions');
  if (coverChart) coverChart.replaceChildren();
  if (coverSuggestions) coverSuggestions.replaceChildren();

  loaderOverlay.style.display = 'block';

  try {
    const result = await callGAS("validateCoverLetterAI", {
      jobDescription,
      coverLetterText,
    });

    loaderOverlay.style.display = 'none';

    if (typeof result.coverMatch === "number" && Array.isArray(result.coverSuggestions)) {
      renderProgressCircle("cover-chart", result.coverMatch, "Cover Letter Match Chart");
      renderSuggestionsList("cover-suggestions", result.coverSuggestions);
    } else {
      showToast("Validation failed: unexpected response.", true);
    }
  } catch (err) {
    loaderOverlay.style.display = 'none';
    showToast("Validation error occurred.", true);
  }
}


async function validateCV() {
  const jobDescriptionInput = document.getElementById('jobDescription');
  const jobDescription = jobDescriptionInput.value.trim();

  if (!jobDescription) {
    showToast("Будь ласка, введіть опис вакансії", true);
    return;
  }

  const resumeForm = document.getElementById('resumeForm');
  const selectedProfile = getSelectedProfileData(resumeForm, window.userProfile);

  const chartContainer = document.getElementById('cover-chart');
  const suggestionsContainer = document.getElementById('cover-suggestions');

  chartContainer.textContent = "";
  suggestionsContainer.textContent = "";

  loaderOverlay.style.display = 'block';

  try {
    const result = await callGAS("validateResumeAI", {
      jobDescription: escapeHTML(jobDescription),
      profile: selectedProfile, 
    });

    loaderOverlay.style.display = 'none';

    if (typeof result.cvMatch === "number" && Array.isArray(result.cvSuggestions)) {
      renderProgressCircle('cv-chart', result.cvMatch, "CV Match Chart");
      renderSuggestionsList('cv-suggestions', result.cvSuggestions.map(s => escapeHTML(s)));
    } else {
      showToast("Validation failed: unexpected response.", true);
    }
  } catch (err) {
    loaderOverlay.style.display = 'none';
    showToast("Validation error occurred.", true);
  }
}

// ======= progress circle ====== 
function renderProgressCircle(containerId, percentage, titleText, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  createTitle({ titleText, containerId });

  const size = options.size || 80;
  const strokeWidth = options.strokeWidth || 8;
  const radius = (size / 2) - strokeWidth;
  const circumference = 2 * Math.PI * radius;

  const color =
    percentage >= 90 ? (options.colors?.good || '#4CAF50') :
    percentage >= 60 ? (options.colors?.medium || '#FFC107') :
                       (options.colors?.bad || '#F44336');
  container.textContent = "";

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);

  const bgCircle = document.createElementNS(svgNS, "circle");
  bgCircle.setAttribute("cx", size / 2);
  bgCircle.setAttribute("cy", size / 2);
  bgCircle.setAttribute("r", radius);
  bgCircle.setAttribute("stroke", "#e0e0e0");
  bgCircle.setAttribute("stroke-width", strokeWidth);
  bgCircle.setAttribute("fill", "none");

  const progressCircle = document.createElementNS(svgNS, "circle");
  progressCircle.setAttribute("cx", size / 2);
  progressCircle.setAttribute("cy", size / 2);
  progressCircle.setAttribute("r", radius);
  progressCircle.setAttribute("stroke", color);
  progressCircle.setAttribute("stroke-width", strokeWidth);
  progressCircle.setAttribute("fill", "none");
  progressCircle.setAttribute("stroke-dasharray", circumference);
  progressCircle.setAttribute("stroke-dashoffset", circumference * (1 - percentage / 100));
  progressCircle.setAttribute("transform", `rotate(-90 ${size / 2} ${size / 2})`);

  const text = document.createElementNS(svgNS, "text");
  text.setAttribute("x", "50%");
  text.setAttribute("y", "50%");
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dy", ".3em");
  text.setAttribute("font-size", "18");
  text.textContent = `${percentage}%`;

  svg.appendChild(bgCircle);
  svg.appendChild(progressCircle);
  svg.appendChild(text);
  container.appendChild(svg);
}


// ===== suggestions =======
function renderSuggestionsList(containerId, suggestions, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  if (!suggestions || suggestions.length === 0) {
    if (options.showEmptyMessage !== false) {
      const p = document.createElement("p");
      p.textContent = "No suggestions, looks good!";
      container.appendChild(p);
    }
    return;
  }

  const ul = document.createElement("ul");
  suggestions.forEach(suggestion => {
    const li = document.createElement("li");
    li.textContent = suggestion; 
    ul.appendChild(li);
  });

  container.appendChild(ul);
}


// ===== create title for validation section =====
function createTitle({ titleText, containerId, className = "chart-title" }) {
  const chartContainer = document.getElementById(containerId);
  if (!chartContainer) return null;

  const parent = chartContainer.closest(".validation-block");
  if (!parent) return null;

  const oldTitle = parent.querySelector(`.${className}`);
  if (oldTitle) oldTitle.remove();

  const title = document.createElement("h4");
  title.textContent = titleText;
  title.classList.add(className);

  parent.prepend(title);
  return title;
}


function getSelectedProfileData(formElement, fullProfile = {}) {
  const formData = new FormData(formElement);
  const currentFormData = {};
  
  formData.forEach((value, key) => {
    if (!key.endsWith('[]') && !key.includes('_include')) {
      currentFormData[key] = value;
    }
  });
  
  const selectedExperience = {
    professional: collectSelectedItems('experience', fullProfile.professionalExperience || []),
    teaching: collectSelectedItems('teaching', fullProfile.teachingExperience || []),
    education: collectSelectedItems('education', fullProfile.education || [])
  };
  
  const selectedProfile = {
    jobLink: currentFormData.jobLink || fullProfile.jobLink || '',
    targetCompany: currentFormData.targetCompany || fullProfile.targetCompany || '',
    jobDescription: currentFormData.jobDescription || fullProfile.jobDescription || '',
    nameSurname: currentFormData.nameSurname || fullProfile.nameSurname || '',
    jobTitle: currentFormData.jobTitle || fullProfile.jobTitle || '',
    experienceYears: currentFormData.experienceYears || fullProfile.experienceYears || '',
    industries: currentFormData.industries || fullProfile.industries || '',
    skillsSummary: currentFormData.skillsSummary || fullProfile.skillsSummary || '',
    achievement: currentFormData.achievement || fullProfile.achievement || '',
    result: currentFormData.result || fullProfile.result || '',
    goal: currentFormData.goal || fullProfile.goal || '',
    strength: currentFormData.strength || fullProfile.strength || '',
    skills: currentFormData.skills || fullProfile.skills || '',
    experience: selectedExperience,
  };

  return selectedProfile;
}

function collectSelectedItems(type, allItems = []) {
  const selectedItems = [];
  
  const checkboxes = document.querySelectorAll(`input[type="checkbox"][data-type="${type}"]`);
  
  checkboxes.forEach((checkbox) => {
    const index = parseInt(checkbox.dataset.index, 10);
    
    if (!isNaN(index) && allItems[index]) {
      const item = { ...allItems[index] };
      
      item.isSelected = checkbox.checked;
      item.originalIndex = index;
      
      if (checkbox.checked) {
        selectedItems.push(item);
      }
    }
  });
  
  return selectedItems;
}

//===== формуємо array з обраними даними ===========
function getSelectedJobs() {
  const selectedJobs = [];
  
  document.querySelectorAll('input[type="checkbox"][data-type="experience"]').forEach((checkbox) => {
    if (checkbox.checked) {
      const index = parseInt(checkbox.dataset.index, 10);
      
      const companyInput = document.querySelector(
        `#experienceDetails${index} input[data-field="company"]`
      );
      
      const titleInput = document.querySelector(
        `#experienceDetails${index} input[data-field="title"]`
      );
      
      if (companyInput) {
        selectedJobs.push({
          index: index,
          company: companyInput.value.trim(),
          title: titleInput ? titleInput.value.trim() : '',
          achievementsId: `experienceAchievements${index}`
        });
      }
    }
  });
  
  return selectedJobs;
}

// ====== redirect to app script and send userId ===== 
function redirectToAppScript() {
  const appScriptUrl = "https://script.google.com/macros/s/AKfycbwa7S6ehhC-v7PrJ_i9gXNGdy3_omXSoFWvb79nKqbBDnTznQD6af2WaA3bhHB9kxhg3w/exec";
  loaderOverlay.style.display = 'block';

  try {
    const user = auth.currentUser;
    if (!user) {
      showToast("User not signed in!", true);
      loaderOverlay.style.display = 'none';
      return;
    }

    const userId = user.uid; 
    const targetUrl = `${appScriptUrl}?userId=${encodeURIComponent(userId)}`;

    window.open(targetUrl, '_blank');
  } catch (error) {
    showToast("Error occurred while processing your request.", true);
  } finally {
    loaderOverlay.style.display = 'none';
  }
}
