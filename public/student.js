let ws = new WebSocket("ws://192.168.1.166:3000");
      let userId = Math.random().toString(36).substr(2, 9);
      let rispostaData = false;

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "status") {
          document.getElementById("domandaCorrente").innerText =
            "Domanda " + data.domandaAttuale;
          document.getElementById("risultati").innerHTML = renderResults(
            data.responses
          );
          enableButtons();
        } else if (data.type === "update") {
          document.getElementById("risultati").innerHTML = renderResults(
            data.responses
          );
        }
        let rispostaData = false;
      };

      function vote(choice) {
        ws.send(JSON.stringify({ type: "vote", choice, userId }));
        document.getElementById("selectedAnswer").innerText =
          "Hai scelto: " + choice;
        disableButtons();
        rispostaData = true;
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
        console.log(results);
        return html;
      }

      function disableButtons() {
        document
          .querySelectorAll("button.answer")
          .forEach((btn) => (btn.disabled = true));
      }

      function enableButtons() {
        document
          .querySelectorAll("button.answer")
          .forEach((btn) => (btn.disabled = false));
        document.getElementById("selectedAnswer").innerText = "";
      }