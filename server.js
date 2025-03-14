const WebSocket = require('ws');
const fs = require('fs');
const crypto = require('crypto');

const server = new WebSocket.Server({ port: 8080, host: '0.0.0.0' });

let numDomande = 0;
let domandaAttuale = 1;
let votazioneAttiva = false;
let responses = {}; // Risultati per ogni domanda
let utentiVotanti = {}; // Tiene traccia di chi ha votato per ogni domanda
let date = new Date();
let month = date.getMonth() + 1;
let totalDate = date.getDate() + "-" + month + "-" + date.getFullYear();

const adminPassword = "m";
let adminToken = null;

function generateToken() {
    return crypto.randomBytes(16).toString('hex');
}

server.on('connection', (ws) => {
    console.log('Nuovo utente connesso');

    // Invia lo stato attuale
    ws.send(JSON.stringify({ type: 'status', numDomande, domandaAttuale, votazioneAttiva, responses }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'login') {
                if (data.password === adminPassword) {
                    adminToken = generateToken();
                    ws.send(JSON.stringify({ type: 'login_success', token: adminToken }));
                } else {
                    ws.send(JSON.stringify({ type: 'login_failed' }));
                }
            } else if (data.type === 'admin') {
                if (data.token !== adminToken) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Accesso negato' }));
                    return;
                }

                if (data.action === 'start') {
                    numDomande = data.numDomande;
                    materia = data.materia;
                    domandaAttuale = 1;
                    votazioneAttiva = true;
                    responses = {};
                    utentiVotanti = {};
                    broadcast({ type: 'status', numDomande, materia, domandaAttuale, votazioneAttiva, responses });
                } else if (data.action === 'next') {
                    if (domandaAttuale < numDomande) {
                        domandaAttuale++;
                        utentiVotanti = {}; // Reset utenti votanti per la nuova domanda
                        broadcast({ type: 'status', domandaAttuale, responses });
                    } else {
                        votazioneAttiva = false;
                        broadcast({ type: 'status', votazioneAttiva });

                        // Salva le risposte in un file JSON
                        const fileData = JSON.stringify(responses, null, 2);
                        fs.writeFileSync(`risultati_${materia}_${totalDate}.json`, fileData);
                        console.log(`Risultati salvati in risultati_${materia}_${totalDate}.json`);
                    }
                } else if (data.action === 'stop') {
                    votazioneAttiva = false;
                    broadcast({ type: 'status', votazioneAttiva });

                    // Salva le risposte in un file JSON
                    const fileData = JSON.stringify(responses, null, 2);
                    fs.writeFileSync(`risultati_${materia}_${totalDate}.json`, fileData);
                    console.log(`Risultati salvati in risultati_${materia}_${totalDate}.json`);
                }
            } else if (data.type === 'vote') {
                if (votazioneAttiva && !utentiVotanti[data.userId]) {
                    if (!responses[`Domanda ${domandaAttuale}`]) {
                        responses[`Domanda ${domandaAttuale}`] = { A: 0, B: 0, C: 0, D: 0 };
                    }
                    responses[`Domanda ${domandaAttuale}`][data.choice]++;
                    utentiVotanti[data.userId] = true;
                    broadcast({ type: 'update', responses, domandaAttuale });
                }
            }
        } catch (error) {
            console.error("Errore nella gestione del messaggio:", error);
            ws.send(JSON.stringify({ type: 'error', message: 'Messaggio non valido' }));
        }
    });

    ws.on('close', () => {
        console.log('Utente disconnesso');
    });
});

function broadcast(data) {
    server.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

console.log("Server WebSocket avviato sulla porta 8080 e accessibile da qualsiasi dispositivo nella rete.");
