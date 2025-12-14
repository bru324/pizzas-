// app.js (module)
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-messaging.js";

const SERVER_BASE = "http://localhost:3000"; // ajuste se rodar em outra porta/servidor
const VAPID_PUBLIC_KEY = "YOUR_PUBLIC_VAPID_KEY_HERE"; // <--- aqui você deve colar a VAPID key do Firebase (Cloud Messaging -> Web push certificates)

const app = window.__FIREBASE_APP__;
const messaging = getMessaging(app);

const permStatusSpan = document.getElementById("permStatus");
const requestPermBtn = document.getElementById("requestPermBtn");

function updatePermStatus(){
  permStatusSpan.textContent = Notification.permission;
}
updatePermStatus();

requestPermBtn.addEventListener("click", async ()=>{
  const p = await Notification.requestPermission();
  updatePermStatus();
  if(p === "granted"){
    // registra service worker
    try {
      const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log("Service Worker registrado", reg);

      const token = await getToken(messaging, {vapidKey: VAPID_PUBLIC_KEY});
      console.log("Token FCM:", token);

      // envia token para o backend registrar
      await fetch(SERVER_BASE + "/register-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      alert("Registrado para notificações!");
    } catch (err){
      console.error("Erro ao registrar notificações:", err);
      alert("Erro ao registrar notificações: " + err.message);
    }
  } else {
    alert("Permissão não concedida.");
  }
});

// Lógica simples de "receber" notificações enquanto site aberto
onMessage(messaging, (payload) => {
  console.log('Mensagem recebida em foreground: ', payload);
  // opcional: mostrar UI no site
  alert("Notificação: " + (payload?.notification?.title || "Ingrediente baixo"));
});

// ---------- RECIPE (quantidade por pizza) ----------
const recipe = {
  "farinha_g": 300, // gramas por pizza
  "queijo_g": 100,
  "molho_g": 80,
  "fermento_g": 5
};

// calcular ingredientes por N pizzas
document.getElementById("calcBtn").addEventListener("click", ()=>{
  const n = parseInt(document.getElementById("numPizzas").value) || 1;
  const res = Object.entries(recipe).map(([k,v]) => `${k.replace(/_/g,' ')}: ${v*n} g`).join("<br>");
  document.getElementById("calcResult").innerHTML = `<div class="small">${res}</div>`;
});

// ---------- ESTOQUE (frontend) ----------
let ingredients = {}; // formato: {name: {qty, min}}

const form = document.getElementById("addIngredientForm");
const listEl = document.getElementById("ingredientsList");

function renderList(){
  listEl.innerHTML = "";
  for(const name in ingredients){
    const it = ingredients[name];
    const li = document.createElement("li");
    li.innerHTML = `<div>
      <strong>${name}</strong> <span class="small">(${it.qty} | min ${it.min})</span>
    </div>
    <div>
      <button data-name="${name}" class="dec">-10</button>
      <button data-name="${name}" class="inc">+10</button>
      <button data-name="${name}" class="del">Rem</button>
    </div>`;
    listEl.appendChild(li);
  }
}

form.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const name = document.getElementById("name").value.trim();
  const qty = Number(document.getElementById("qty").value);
  const min = Number(document.getElementById("min").value);
  if(!name) return;
  ingredients[name] = { qty, min };
  renderList();

  // envia para servidor atualizar estoque (o servidor dispara notificação se estiver abaixo)
  await fetch(SERVER_BASE + "/update-stock", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ name, qty, min })
  });

  form.reset();
});

listEl.addEventListener("click", async (e)=>{
  const btn = e.target;
  if(!btn.dataset) return;
  const name = btn.dataset.name;
  if(btn.classList.contains("dec")){
    ingredients[name].qty = Math.max(0, ingredients[name].qty - 10);
  } else if(btn.classList.contains("inc")){
    ingredients[name].qty = ingredients[name].qty + 10;
  } else if(btn.classList.contains("del")){
    delete ingredients[name];
  }
  renderList();

  // envia atualização ao servidor
  if(name){
    const it = ingredients[name];
    if(it){
      await fetch(SERVER_BASE + "/update-stock", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ name, qty: it.qty, min: it.min })
      });
    } else {
      // removido
      await fetch(SERVER_BASE + "/remove-stock", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ name })
      });
    }
  }
});

// ao carregar, pega estoque atual do servidor (opcional)
async function loadServerStock(){
  try{
    const res = await fetch(SERVER_BASE + "/stocks");
    if(res.ok){
      const data = await res.json();
      ingredients = data;
      renderList();
    }
  }catch(e){
    console.warn("Não foi possível carregar estoque do servidor:", e.message);
  }
}
loadServerStock();
