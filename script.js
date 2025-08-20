const BACKEND_URL =
  "https://frosty-haze-1d98.tshch92.workers.dev/";
  
const GAS_URL = 'https://frosty-haze-1d98.tshch92.workers.dev/'; // Change this to your Web App URL
    


function parseJobLink(url) {
  document.getElementById('loaderOverlay').style.display = 'block';

  fetch(`${BACKEND_URL}?url=${encodeURIComponent(url)}&action=parseJobLink`)
    .then(async (response) => {
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        return json;
      } catch (e) {
        console.error("Expected JSON, but got:", text);
        throw new Error("Server did not return valid JSON");
      }
    })
    .then(result => {
      document.getElementById('loaderOverlay').style.display = 'none';

      if (result.company) {
        document.getElementById('targetCompany').value = result.company;
      }
      if (result.description) {
        document.getElementById('jobDescription').value = result.description;
      }
      if (result.jobTitle) {
        const suggestionDiv = document.getElementById('jobTitleSuggestion');
        suggestionDiv.innerHTML = `Recommended: <a href="#" id="applyJobTitle" style="color: #007bff; text-decoration: underline;">${result.jobTitle}</a>`;

        document.getElementById('applyJobTitle').onclick = function(e) {
          e.preventDefault();
          document.getElementById('jobTitle').value = result.jobTitle;
          suggestionDiv.innerHTML = '';
        };
      } else {
        document.getElementById('jobTitleSuggestion').innerHTML = '';
      }
    })
    .catch(err => {
      document.getElementById('loaderOverlay').style.display = 'none';
      console.error(err);
      alert('Помилка при парсингу вакансії');
    });
}

function generateCoverLetter() {
  const jobDescription = document.getElementById('jobDescription').value;
  const selectedLang = document.querySelector('input[name="coverLang"]:checked').value;

  if (!jobDescription.trim()) {
    alert("Please paste the Job Description first.");
    return;
  }

  const achievements = [];
  document.querySelectorAll('textarea[data-field="achievements"]').forEach(textarea => {
    if (textarea.offsetParent !== null && textarea.value.trim() !== '') {
      achievements.push(...textarea.value.split('\n').map(a => a.trim()).filter(a => a.length > 0));
    }
  });

  document.getElementById('loaderOverlay').style.display = 'block';

  fetch(`${BACKEND_URL}?action=generateCoverLetterAI`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jobDescription: jobDescription,
      achievements: achievements,
      selectedLang: selectedLang
    })
  })
  .then(response => response.json())
  .then(result => {
    document.getElementById('loaderOverlay').style.display = 'none';

    if (result && result.coverLetter) {
      const coverTextarea = document.getElementById('coverLetter');
      coverTextarea.value = result.coverLetter;

      // Авто-розтягування textarea
      coverTextarea.style.height = 'auto';
      coverTextarea.style.height = Math.min(coverTextarea.scrollHeight, 700) + 'px';
    } else {
      alert("AI could not generate a cover letter.");
    }
  })
  .catch(err => {
    document.getElementById('loaderOverlay').style.display = 'none';
    console.error(err);
    alert("Error while contacting AI.");
  });
}

function copyCoverLetter() {
    const textarea = document.getElementById('coverLetter');
    const tooltip = document.getElementById('copyTooltip');
    
    textarea.select();
    textarea.setSelectionRange(0, 99999); // for mobile
    document.execCommand('copy');
    
    tooltip.style.visibility = 'visible';
    setTimeout(() => {
      tooltip.style.visibility = 'hidden';
    }, 1000);
}

function validateCV() {
  const jobDescription = document.getElementById('jobDescription').value;
  const resumeText = collectResumeText(); // Твоя функція яка збирає текст з форми

  document.getElementById('CVchart').innerHTML = '';
  document.querySelector('.CVsuggestions').innerHTML = '';
  document.getElementById('loaderOverlay').style.display = 'block';

  fetch(`${BACKEND_URL}?action=validateResumeAI`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jobDescription: jobDescription,
      resumeText: resumeText
    })
  })
  .then(response => response.json())
  .then(result => {
    document.getElementById('loaderOverlay').style.display = 'none';
    if (result.cvMatch !== undefined && Array.isArray(result.cvSuggestions)) {
      renderValidationChart('CVchart', result.cvMatch);
      renderSuggestions('CVsuggestions', result.cvSuggestions);
    } else {
      alert("Validation failed.");
    }
  })
  .catch(err => {
    document.getElementById('loaderOverlay').style.display = 'none';
    console.error(err);
    alert("Validation failed.");
  });
}

function validateCoverLetter() {
  const jobDescription = document.getElementById('jobDescription').value;
  const coverLetterText = document.getElementById('coverLetter').value;

  document.getElementById('coverChart').innerHTML = '';
  document.querySelector('.CoverSuggestions').innerHTML = '';
  document.getElementById('loaderOverlay').style.display = 'block';

  fetch(`${BACKEND_URL}?action=validateCoverLetterAI`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jobDescription: jobDescription,
      coverLetterText: coverLetterText
    })
  })
  .then(response => response.json())
  .then(result => {
    document.getElementById('loaderOverlay').style.display = 'none';
    if (result.coverMatch !== undefined && Array.isArray(result.coverSuggestions)) {
      renderValidationChart('coverChart', result.coverMatch);
      renderSuggestions('CoverSuggestions', result.coverSuggestions);
    } else {
      alert("Validation failed.");
    }
  })
  .catch(err => {
    document.getElementById('loaderOverlay').style.display = 'none';
    console.error(err);
    alert("Validation failed.");
  });
}

function renderValidationChart(containerId, percentage) {
    const container = document.getElementById(containerId);
    const color = percentage >= 90 ? '#4CAF50' : (percentage >= 60 ? '#FFC107' : '#F44336');
    const chartHTML = `
      <svg width="80" height="80">
        <circle cx="40" cy="40" r="36" stroke="#e0e0e0" stroke-width="8" fill="none" />
        <circle cx="40" cy="40" r="36" stroke="${color}" stroke-width="8" fill="none" stroke-dasharray="${2 * Math.PI * 36}" stroke-dashoffset="${2 * Math.PI * 36 * (1 - percentage / 100)}" transform="rotate(-90 40 40)" />
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="18">${percentage}%</text>
      </svg>`;
    container.innerHTML = chartHTML;
}

function renderSuggestions(containerClass, suggestions) {
    const container = document.querySelector(`.${containerClass}`);
    if (suggestions.length === 0) {
      container.innerHTML = '<p>No suggestions, looks good!</p>';
    } else {
      const ul = document.createElement('ul');
      suggestions.forEach(s => {
        const li = document.createElement('li');
        li.innerText = s;
        ul.appendChild(li);
      });
      container.appendChild(ul);
    }
}

// Прив'язуємо кнопки
document.querySelector('#CVvalidation button').addEventListener('click', validateCV);
document.querySelector('#coverValidation button').addEventListener('click', validateCoverLetter);

function collectResumeText() {
    let text = '';
    text += document.getElementById('skills').value + '\n';
    document.querySelectorAll('textarea[data-field="achievements"]').forEach(textarea => {
      if (textarea.offsetParent !== null && textarea.value.trim() !== '') {
        text += textarea.value + '\n';
      }
    });
    return text;
}

function fillSkillsFromAI() {
  const jobDescription = document.getElementById("jobDescription").value;

  document.getElementById("loaderOverlay").style.display = "block";

  fetch(BACKEND_URL + "?action=getSkillsFromAI", {
    method: "POST",
    body: JSON.stringify({ jobDescription }),
    headers: { "Content-Type": "application/json" },
  })
    .then((response) => response.json())
    .then((data) => {
      document.getElementById("loaderOverlay").style.display = "none";
      console.log('AI returned skills:', data.skills); // 🐞
      if (data.skills) {
        document.getElementById("skills").value = data.skills;
      } else {
        alert("AI не знайшов відповідні скіли.");
      }
    })
    .catch((err) => {
      console.error(err);
      document.getElementById("loaderOverlay").style.display = "none";
      alert("Помилка при зверненні до AI.");
    });
}

function autoFillAchievements() {
  const jobDescription = document.getElementById("jobDescription").value;

  const selectedJobs = [];
  document
    .querySelectorAll('input[type="checkbox"][id^="expCheckbox"]')
    .forEach((checkbox, index) => {
      if (checkbox.checked) {
        const company = document.querySelector(
          `#expDetails${index} input[data-field="company"]`
        ).value;
        selectedJobs.push({ index, company });
      }
    });

  if (selectedJobs.length === 0) {
    alert("Виберіть місце роботи для заповнення досягнень.");
    return;
  }

  document.getElementById("loaderOverlay").style.display = "block";

  fetch(BACKEND_URL + "?action=generateAchievementsAI", {
    method: "POST",
    body: JSON.stringify({
      jobDescription,
      companies: selectedJobs.map((j) => j.company),
    }),
    headers: { "Content-Type": "application/json" },
  })
    .then((response) => response.json())
    .then((data) => {
      document.getElementById("loaderOverlay").style.display = "none";
      selectedJobs.forEach((job) => {
        const achievementsTextarea = document.getElementById(
          `achievements${job.index}`
        );
        const aiAchievements = data[job.company];
        if (aiAchievements && aiAchievements.length > 0) {
          achievementsTextarea.value = aiAchievements.join("\n");
        }
      });
    })
    .catch((err) => {
      console.error(err);
      document.getElementById("loaderOverlay").style.display = "none";
      alert("Помилка при зверненні до AI.");
    });
}

const EXPERIENCE_DATA = [
                {
                  "company": "Capti",
                  "industry": "EdTech",
                  "location": "remote",
                  "dates": "Dec 2024 - now",
                  "title": "Product Design Lead"
                },
                {
                  "company": "Semiotics Labs",
                  "industry": "MilTech",
                  "location": "remote",
                  "dates": "Feb 2024 - May 2024",
                  "title": "Product Designer (consultant)"
                },
                {
                  "company": "Xenoss",
                  "industry": "Marketing automation B2B SaaS",
                  "location": "remote",
                  "dates": "Apr 2022 - now",
                  "title": "Product Design Lead"
                },
                {
                  "company": "Esportal",
                  "industry": "E-sports (CS:GO tournaments)",
                  "location": "remote",
                  "dates": "Apr 2022 - May 2023",
                  "title": "UI/UX/Marketing Designer"
                },
                {
                  "company": "PIXO Internet Technologies",
                  "industry": "Construction audits B2B SaaS",
                  "location": "remote",
                  "dates": "May 2021 - Jan 2022",
                  "title": "Senior UI/UX Designer"
                },
                {
                  "company": "Quartz-stone.od",
                  "industry": "furniture production",
                  "location": "Odesa, Ukraine",
                  "dates": "May 2021 - Nov 2021",
                  "title": "Web designer"
                },
                {
                  "company": "BMBY",
                  "industry": "Real Estate CRM, 3D showcase",
                  "location": "Odesa, Ukraine",
                  "dates": "May 2020 - Apr 2021",
                  "title": "Senior UI/UX Designer"
                },
                {
                  "company": "Akkerman (ex-BIIR)",
                  "industry": "Engineering consultancy",
                  "location": "Odesa, Ukraine",
                  "dates": "Sep 2018 - Apr 2020",
                  "title": "UI/UX/Graphic Designer"
                },
                {
                  "company": "misc. Ukrainian companies",
                  "industry": "Production, Education, Healthcare, Events",
                  "location": "Odesa, Ukraine",
                  "dates": "2014 - 2018",
                  "title": "Freelance UI/UX/Graphic Designer, Marketing specialist"
                }
              ];

function renderExperienceCheckboxes() {
    const container = document.getElementById('experienceSection');
    
    EXPERIENCE_DATA.forEach((exp, index) => {
      const id = `expCheckbox${index}`;
      const wrapper = document.createElement('div');
    
      wrapper.innerHTML = `
        <div class="exp-card">
        <label style="display: flex; align-items: flex-start; margin-bottom: 10px;">
          <input type="checkbox" id="${id}" onchange="toggleExperienceDetails(${index})" />
          <span style="margin-left: 8px;">${exp.company} — ${exp.title} (${exp.dates})</span>
        </label>
    
        <div id="expDetails${index}" style="margin-left: 20px; display: none;">
          <div class="exp-details" style="display: flex; flex-direction: column; margin-bottom: 8px;">
            <input type="text" data-field="company" value="${exp.company}" placeholder="Company" style="width:320px; margin-bottom: 6px;" />
            <input type="text" data-field="industry" value="${exp.industry}" placeholder="Industry" style="width:320px; margin-bottom: 6px;" />
            <input type="text" data-field="title" value="${exp.title}" placeholder="Job Title" style="width:320px; margin-bottom: 6px;" />
            <input type="text" data-field="location" value="${exp.location}" placeholder="Location" style="width:320px; margin-bottom: 6px;" />
            <input type="text" data-field="dates" value="${exp.dates}" placeholder="Dates" style="width:320px; margin-bottom: 12px;" />
          </div>
          <label for="achievements${index}" class="input-label">Achievements:</label>
          <textarea id="achievements${index}" data-field="achievements" rows="6" style="width:100%; margin-bottom: 12px; display: none;"></textarea>
        </div>
        </div>
      `;
    
      container.appendChild(wrapper);
    });
}

function toggleExperienceDetails(index) {
    const checkbox = document.getElementById(`expCheckbox${index}`);
    const details = document.getElementById(`expDetails${index}`);
    const achievementsTextarea = document.getElementById(`achievements${index}`);
    details.style.display = checkbox.checked ? 'block' : 'none';
    achievementsTextarea.style.display = checkbox.checked ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', renderExperienceCheckboxes);

document.getElementById("resumeForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const overlay = document.getElementById("loaderOverlay");
  overlay.style.display = "block";

  const form = e.target;
  const formData = new FormData(form);
  const data = {};

  formData.forEach((value, key) => {
    if (key === "education") {
      if (!data.education) data.education = [];
      data.education.push(value);
    } else {
      data[key] = value;
    }
  });
  
  // ➜ Додати явне зчитування з полів форми:
    data.targetCompany = document.getElementById('targetCompany').value;
    data.jobLink = document.getElementById('jobLink').value;
    data.jobDescription = document.getElementById('jobDescription').value;

  data.experience = [];
  document
    .querySelectorAll('input[type="checkbox"][id^="expCheckbox"]')
    .forEach((checkbox, index) => {
      if (checkbox.checked) {
        const fields = document.querySelectorAll(
          `#expDetails${index} input[data-field], #expDetails${index} textarea[data-field]`
        );
        const entry = {};
        fields.forEach((input) => {
          entry[input.dataset.field] = input.value;
        });
        data.experience.push(entry);
      }
    });

  fetch(BACKEND_URL + "?action=createDocument", {
    method: "POST",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  })
    .then((response) => response.json())
        .then((data) => {
        overlay.style.display = "none";
        if (data.resumeUrl && data.coverLetterUrl) {
            window.open(data.resumeUrl, "_blank");
            window.open(data.coverLetterUrl, "_blank");
        } else {
            alert("Документи не створені.");
        }
        })
    .catch((err) => {
      console.error(err);
      overlay.style.display = "none";
      alert("Помилка під час надсилання.");
    });
});
