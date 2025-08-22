const WORKER_URL = "https://divine-feather-fff4.kop-anastasia27.workers.dev/";

const fillSkillsBtn = document.getElementById("fill-skills-btn");
const loaderOverlay = document.getElementById("loaderOverlay");
const fillAchievementsBtn = document.getElementById("fill-achievements-btn");
const generateCoverLBtn = document.getElementById("generate-cl-btn");
const copyCLBtn = document.getElementById("copyCLBtn");
const validateCLBtn = document.getElementById("validateCLBtn");
const validateCVBtn = document.getElementById("validateCVBtn");
const resumeForm = document.getElementById("resumeForm");


fillSkillsBtn.addEventListener('click', fillSkillsFromAI);
fillAchievementsBtn.addEventListener('click', autoFillAchievements);
generateCoverLBtn.addEventListener('click', generateCoverLetter);
copyCLBtn.addEventListener('click', copyCoverLetter);
validateCLBtn.addEventListener('click', validateCoverLetter);
validateCVBtn.addEventListener('click', validateCV);

// ======= main API request ========
async function callGAS(action, payload = {}) {
  console.log(`Calling GAS action: ${action}`, payload);
  
  try {
    const response = await fetch(`${WORKER_URL}?action=${action}`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload),
    });

    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Response not OK:", errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("GAS response:", data);
    
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
  console.log('fillSkillsFromAI run');
  const jobDescription = document.getElementById("jobDescription").value.trim();
  const userProfile = window.userProfile || {};
  const skillsTextarea = document.getElementById("skills");

  if (!jobDescription) {
    alert("Будь ласка, введіть опис вакансії спочатку");
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

// // ======= функція зберігання вібраніх робіт ====== 
// function getSelectedJobs () {
//   const selectedJobs = [];
//   document
//     .querySelectorAll('input[type="checkbox"][id^="experienceCheckbox"]')
//     .forEach((checkbox, index) => {
//       if (checkbox.checked) {
//         const companyInput = document.querySelector(
//           `#experienceDetails${index} input[data-field="company"]`
//         );
//         if (companyInput) {
//           selectedJobs.push({ index, company: companyInput.value });
//         }
//       }
//     });
//     console.log('selectedJobs', selectedJobs);
//   return selectedJobs;
// }

// ==== Автозаповнення досягнень ====
async function autoFillAchievements() {
  console.log("autoFillAchievements run");
  const jobDescription = document.getElementById("jobDescription").value.trim();
  const selectedJobs = getSelectedJobs();
  const userProfile = window.userProfile || {};

  if (selectedJobs.length === 0) {
    alert("Виберіть місце роботи для заповнення досягнень.");
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
      console.log("aiAchievements", aiAchievements);

      if (achievementsTextarea && aiAchievements?.length > 0) {
        achievementsTextarea.value = aiAchievements
          .map((achievement, i) => `${i + 1}. ${achievement}`)
          .join("\n");
      }
    });
  } catch (err) {
      console.error('AI error:', err);
      alert("Помилка при зверненні до AI.");
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
    alert("Будь ласка, введіть назву компанії та опис вакансії");
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

    console.log("Cover Letter:", result);

    const coverLetter = document.getElementById("coverLetter");
    coverLetter.rows = 25;
    coverLetter.value = result;
    
  } catch (err) {
      console.error('AI error:', err);
      alert("Помилка при зверненні до AI.");
  } finally {
      loaderOverlay.style.display = "none";
  }
}

// === copy cover letter ======
async function copyCoverLetter() {
  const textarea = document.getElementById('coverLetter');
  const tooltip = document.getElementById('copyTooltip');

  if (!textarea) return;

  try {
    await navigator.clipboard.writeText(textarea.value);

    if (tooltip) {
      tooltip.style.visibility = 'visible';
      setTimeout(() => {
        tooltip.style.visibility = 'hidden';
      }, 1000);
    }
  } catch (err) {
    console.error('Failed to copy:', err);
    alert('Не вдалося скопіювати текст. Спробуйте ще раз.');
  }
}


// ==== валідація cover letter ======
async function validateCoverLetter() {
  const jobDescription = document.getElementById('jobDescription').value.trim();
  const coverLetterText = document.getElementById('coverLetter').value.trim();

  if (!jobDescription && !jobTitle) {
    alert("Будь ласка, введіть назву компанії та опис вакансії");
    return;
  }

  document.getElementById('cover-chart').innerHTML = '';
  document.getElementById('cover-suggestions').innerHTML = '';
  loaderOverlay.style.display = 'block';

  try {
    const result = await callGAS("validateCoverLetterAI", {
      jobDescription,
      coverLetterText,
    });

    loaderOverlay.style.display = 'none';
    console.log('validateCoverLetter', result);

    if (typeof result.coverMatch === "number" && Array.isArray(result.coverSuggestions)) {
      renderProgressCircle("cover-chart", result.coverMatch, 'Cover Letter Match Chart');
      renderSuggestionsList("cover-suggestions", result.coverSuggestions);
    } else {
      console.warn("Unexpected GAS response:", result);
      alert("Validation failed: unexpected response.");
    }
  } catch (err) {
    loaderOverlay.style.display = 'none';
    console.error("Validation error:", err);
    alert("Validation failed. Please try again.");
  }
}


async function validateCV() {
  const jobDescription = document.getElementById('jobDescription').value;
  console.log(JSON.stringify(userProfile, null, 2));

  if (!jobDescription) {
    alert("Будь ласка, введіть опис вакансії");
    return;
  }

  const resumeForm = document.getElementById('resumeForm');
  const selectedProfile = getSelectedProfileData(resumeForm, window.userProfile);

  document.getElementById('cover-chart').innerHTML = '';
  document.getElementById('cover-suggestions').innerHTML = '';
  loaderOverlay.style.display = 'block';

  try {
    const result = await callGAS("validateResumeAI", {
      jobDescription: jobDescription,
      profile: selectedProfile,
    });

    loaderOverlay.style.display = 'none';

    if (result.cvMatch !== undefined && Array.isArray(result.cvSuggestions)) {
      renderProgressCircle('cv-chart', result.cvMatch);
      renderSuggestionsList('cv-suggestions', result.cvSuggestions);
    } else {
      console.warn("Unexpected response format:", result);
      alert("Validation failed: unexpected response.");
    }
  } catch (err) {
    loaderOverlay.style.display = 'none';
    console.error("Validation error:", err);
    alert("Validation failed.");
  }
}

// ======= progress circle ====== 
function renderProgressCircle(containerId, percentage, titleText, options = {}) {
  const container = document.getElementById(containerId);
  const cvTitle = document.getElementById('cv-title');

  if (!container) return;

  createTitle({titleText, container});

  const size = options.size || 80;
  const strokeWidth = options.strokeWidth || 8;
  const radius = (size / 2) - strokeWidth;
  const circumference = 2 * Math.PI * radius;

  const color =
    percentage >= 90 ? (options.colors?.good || '#4CAF50') :
    percentage >= 60 ? (options.colors?.medium || '#FFC107') :
                       (options.colors?.bad || '#F44336');

  container.innerHTML = `
    <svg width="${size}" height="${size}">
      <circle cx="${size/2}" cy="${size/2}" r="${radius}"
              stroke="#e0e0e0" stroke-width="${strokeWidth}" fill="none" />
      <circle cx="${size/2}" cy="${size/2}" r="${radius}"
              stroke="${color}" stroke-width="${strokeWidth}" fill="none"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${circumference * (1 - percentage / 100)}"
              transform="rotate(-90 ${size/2} ${size/2})" />
      <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="18">${percentage}%</text>
    </svg>`;
}


// ===== suggestions =======
function renderSuggestionsList(containerId, suggestions, options = {}) {
  const container = document.getElementById(`${containerId}`);
  if (!container) return;

  container.innerHTML = "";

  if (!suggestions || suggestions.length === 0) {
    if (options.showEmptyMessage !== false) {
      container.innerHTML = '<p>No suggestions, looks good!</p>';
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


function createTitle({ text, container, className = "chart-title" }) {
  const oldTitle = container.querySelector(`.${className}`);
  if (oldTitle) oldTitle.remove();

  const title = document.createElement("h4");
  title.textContent = text;
  title.classList.add(className);
  console.log('title', text, container, title);

  container.prepend(title);

  return title;
}


function getSelectedProfileData(formElement, fullProfile = {}) {
  console.log("🔍 Full profile structure:", fullProfile);
  
  // 1. Get current form values (basic profile info)
  const formData = new FormData(formElement);
  const currentFormData = {};
  
  // Collect non-array form fields
  formData.forEach((value, key) => {
    if (!key.endsWith('[]') && !key.includes('_include')) {
      currentFormData[key] = value;
    }
  });
  
  // 2. Collect selected experience items based on checkboxes
  const selectedExperience = {
    professional: collectSelectedItems('experience', fullProfile.professionalExperience || []),
    teaching: collectSelectedItems('teaching', fullProfile.teachingExperience || []),
    education: collectSelectedItems('education', fullProfile.education || [])
  };
  
  // 3. Build the complete selected profile
  const selectedProfile = {
    // Basic info from current form
    jobTitle: currentFormData.jobTitle || fullProfile.jobTitle || '',
    experienceYears: currentFormData.experienceYears || fullProfile.experienceYears || '',
    industries: currentFormData.industries || fullProfile.industries || '',
    skillsSummary: currentFormData.skillsSummary || fullProfile.skillsSummary || '',
    achievement: currentFormData.achievement || fullProfile.achievement || '',
    result: currentFormData.result || fullProfile.result || '',
    goal: currentFormData.goal || fullProfile.goal || '',
    strength: currentFormData.strength || fullProfile.strength || '',
    skills: currentFormData.skills || fullProfile.skills || '',
    
    // Selected experience items
    experience: selectedExperience,
  };
  
  console.log("✅ Selected profile data:", selectedProfile);
  return selectedProfile;
}

function collectSelectedItems(type, allItems = []) {
  const selectedItems = [];
  
  // Find all checkboxes for this type
  const checkboxes = document.querySelectorAll(`input[type="checkbox"][data-type="${type}"]`);
  
  console.log(`🔍 Found ${checkboxes.length} checkboxes for type: ${type}`);
  
  checkboxes.forEach((checkbox) => {
    const index = parseInt(checkbox.dataset.index, 10);
    
    if (!isNaN(index) && allItems[index]) {
      const item = { ...allItems[index] };
      
      // Add checkbox status
      item.isSelected = checkbox.checked;
      item.originalIndex = index;
      
      // If checked, add to selected items
      if (checkbox.checked) {
        selectedItems.push(item);
      }
    }
  });
  
  console.log(`✅ Selected ${selectedItems.length} items for ${type}:`, selectedItems);
  return selectedItems;
}

//===== формуємо тз обраними даними обєкт ===========
function getSelectedJobs() {
  const selectedJobs = [];
  
  // Look for experience checkboxes that are checked
  document.querySelectorAll('input[type="checkbox"][data-type="experience"]').forEach((checkbox) => {
    if (checkbox.checked) {
      const index = parseInt(checkbox.dataset.index, 10);
      
      // Get company name from the corresponding input field
      const companyInput = document.querySelector(
        `#experienceDetails${index} input[data-field="company"]`
      );
      
      // Get job title input as well
      const titleInput = document.querySelector(
        `#experienceDetails${index} input[data-field="title"]`
      );
      
      if (companyInput) {
        selectedJobs.push({
          index: index,
          company: companyInput.value.trim(),
          title: titleInput ? titleInput.value.trim() : '',
          // Add achievements textarea reference for later use
          achievementsId: `experienceAchievements${index}`
        });
      }
    }
  });
  
  console.log('Selected jobs for achievements:', selectedJobs);
  return selectedJobs;
}
