let n = 0;
const display = document.getElementById("count");

document.getElementById("inc").onclick = () => { n++; display.textContent = n; };
document.getElementById("dec").onclick = () => { n--; display.textContent = n; };

function addItem(text) {
  const li = document.createElement("li");
  const btn = document.createElement("button");
  btn.className = "rm";
  btn.textContent = "✕";
  btn.onclick = () => li.remove();
  li.textContent = text;
  li.appendChild(btn);
  document.getElementById("list").appendChild(li);
}

document.getElementById("add").onclick = () => {
  const inp = document.getElementById("inp");
  if (inp.value.trim()) {
    addItem(inp.value.trim());
    inp.value = "";
  }
};

document.getElementById("inp").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("add").click();
});

document.querySelectorAll(".rm").forEach(b => b.onclick = () => b.parentElement.remove());
