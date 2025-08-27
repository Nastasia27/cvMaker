// ===== show messages and errors ======
export function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.style.background = isError ? "#e74c3c" : "#2ecc71"; 
  toast.className = "show";

  setTimeout(() => {
    toast.className = toast.className.replace("show", "");
  }, 3000);
}