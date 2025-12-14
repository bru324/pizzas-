// ================================
// CALCULADORA DE PIZZA
// ================================
const recipe = {
  farinha: 300,
  queijo: 100,
  molho: 80,
  fermento: 5
};

document.getElementById("calcBtn").addEventListener("click", () => {
  const pizzas = Number(document.getElementById("numPizzas").value) || 1;
  let resultado = "";

  for (let ing in recipe) {
    resultado += `${ing}: ${recipe[ing] * pizzas} g<br>`;
  }

  document.getElementById("calcResult").innerHTML = resultado;
});

// ================================
// CONTROLE DE ESTOQUE
// ================================
let ingredientes = {};

const form = document.getElementById("addIngredientForm");
const lista = document.getElementById("ingredientsList");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const nome = document.getElementById("name").value.trim();
  const qtd = Number(document.getElementById("qty").value);
  const minimo = Number(document.getElementById("min").value);

  if (!nome) return;

  ingredientes[nome] = { qtd, minimo };
  renderLista();
  form.reset();

  // 🔔 NOTIFICAÇÃO AUTOMÁTICA
  if (qtd <= minimo && Notification.permission === "granted") {
    new Notification("⚠️ Estoque baixo", {
      body: `Compre mais ${nome}`
    });
  }
});

function renderLista() {
  lista.innerHTML = "";

  for (let nome in ingredientes) {
    const li = document.createElement("li");
    li.textContent = `${nome} — ${ingredientes[nome].qtd} (mín: ${ingredientes[nome].minimo})`;
    lista.appendChild(li);
  }
}

// ================================
// PERMISSÃO DE NOTIFICAÇÃO
// ================================
const permBtn = document.getElementById("requestPermBtn");
const permStatus = document.getElementById("permStatus");

permStatus.textContent = Notification.permission;

permBtn.addEventListener("click", async () => {
  const permission = await Notification.requestPermission();
  permStatus.textContent = permission;

  if (permission === "granted") {
    new Notification("Pizza Manager 🍕", {
      body: "Notificações ativadas com sucesso!"
    });
  }
});

// ================================
// SERVICE WORKER (PWA)
// ================================
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("service-worker.js")
    .then(() => console.log("Service Worker registrado"))
    .catch(err => console.error("Erro no Service Worker:", err));
}
