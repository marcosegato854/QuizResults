let ws = new WebSocket("ws://192.168.1.166:3000");
let adminToken = null;
let quizInCorso = false;

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "login_success") {
    adminToken = data.token;
    document.getElementById("adminPanel").style.display = "block";
    document.getElementById("loginPanel").style.display = "none";
  } else if (data.type === "status" || data.type === "update") {
    document.getElementById("domandaCorrente").innerText =
      "Domanda corrente: " + data.domandaAttuale;
    document.getElementById("risultati").innerHTML = renderResults(
      data.responses
    );

    quizInCorso = data.quizInCorso;
    aggiornaStatoPulsanti(data);
  }
};

function login() {
  const password = document.getElementById("password").value;
  ws.send(JSON.stringify({ type: "login", password }));
}

function startQuiz() {
  const numDomande = parseInt(
    document.getElementById("numDomande").value
  );
  const materia = document.getElementById("Materia").value;
  ws.send(
    JSON.stringify({
      type: "admin",
      action: "start",
      numDomande,
      materia,
      token: adminToken,
    })
  );

  document.getElementById("btnStart").disabled = true;
  document.getElementById("btnNext").disabled = false;
  document.getElementById("btnStop").disabled = false;
}

function nextQuestion() {
  ws.send(
    JSON.stringify({ type: "admin", action: "next", token: adminToken })
  );
}

function stopQuiz() {
  ws.send(
    JSON.stringify({ type: "admin", action: "stop", token: adminToken })
  );

  document.getElementById("btnStart").disabled = false;
  document.getElementById("btnNext").disabled = true;
  document.getElementById("btnStop").disabled = true;
}

function aggiornaStatoPulsanti(data) {
  let btnNext = document.getElementById("btnNext");

  btnNext.disabled = data.domandaAttuale >= data.numDomande;
}

function renderResults(results) {
  let html = "";
  let totaleRisposte = 0;
  for (let domanda in results) {
    totaleRisposte =
      results[domanda].A +
      results[domanda].B +
      results[domanda].C +
      results[domanda].D;
    html += `<span class="domandaSpan">${domanda} </span><span class="risposteSpan">A:${results[domanda].A}, B:${results[domanda].B}, C:${results[domanda].C}, D:${results[domanda].D} | Totale risposte:${totaleRisposte}</span><br>`;
  }
  return html;
}