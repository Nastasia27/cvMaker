const GAS_URL = "https://script.google.com/macros/s/AKfycbw1UDSOvkUI8aOp49Yr4XXGZFUlymx659uNONFyuSeBZVIjx0AWd9b7P3sNmEr3zzUQ/exec";

const fillSkillsBtn = document.getElementById('fill-skills-btn');

fillSkillsBtn.addEventListener("click", fillSkillsFromAI);

// ==== Універсальна функція для викликів GAS ====
async function callGAS(action, payload = {}) {
  try {
    const res = await fetch(GAS_URL + "?action=" + action, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.error("❌ GAS request error:", err);
    throw err;
  }
}

// ==== Виклик 1: Згенерувати cover letter ====
async function generateCoverLetter() {
  const result = await callGAS("generateCoverLetterAI", {
    jobDescription: "...",
    achievements: ["Improved UX by 30%", "Led team of 5"],
    selectedLang: "English",
  });
  console.log("✅ Cover Letter:", result);
}

// ==== Виклик 2: Отримати скіли з AI ====
async function fillSkillsFromAI() {
  const jobDescription = document.getElementById("jobDescription").value;

  document.getElementById("loaderOverlay").style.display = "block";

  try {
    const data = await callGAS("getSkillsFromAI", { jobDescription });
    console.log("✅ AI returned skills:", data.skills);

    document.getElementById("skills").value = data.skills || "";
    if (!data.skills) alert("AI не знайшов відповідні скіли.");
  } catch {
    alert("Помилка при зверненні до AI.");
  } finally {
    document.getElementById("loaderOverlay").style.display = "none";
  }
}

// ==== Виклик 3: Автозаповнення досягнень ====
async function autoFillAchievements() {
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

  try {
    const data = await callGAS("generateAchievementsAI", {
      jobDescription,
      companies: selectedJobs.map((j) => j.company),
    });

    selectedJobs.forEach((job) => {
      const achievementsTextarea = document.getElementById(
        `achievements${job.index}`
      );
      const aiAchievements = data[job.company];
      if (aiAchievements && aiAchievements.length > 0) {
        achievementsTextarea.value = aiAchievements.join("\n");
      }
    });
  } catch {
    alert("Помилка при зверненні до AI.");
  } finally {
    document.getElementById("loaderOverlay").style.display = "none";
  }
}