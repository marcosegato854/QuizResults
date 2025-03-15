const WebSocket = require('ws');
const express = require('express');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// WebSocket
let numDomande = 0;
let domandaAttuale = 1;
let votazioneAttiva = false;
let responses = {};
let utentiVotanti = {};
let date = new Date();
let month = date.getMonth() + 1;
let totalDate = date.getDate() + "-" + month + "-" + date.getFullYear();

const adminPassword = "unapasswordmoltosicura";
let adminToken = null;

function generateToken() {
    return crypto.randomBytes(16).toString('hex');
}

wss.on('connection', (ws) => {
    console.log('Nuovo utente connesso');

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
                        utentiVotanti = {};
                        broadcast({ type: 'status', domandaAttuale, responses });
                    } else {
                        votazioneAttiva = false;
                        broadcast({ type: 'status', votazioneAttiva });

                        const fileData = JSON.stringify(responses, null, 2);
                        fs.writeFileSync(`risultati_${materia}_${totalDate}.json`, fileData);
                        console.log(`Risultati salvati in risultati_${materia}_${totalDate}.json`);
                    }
                } else if (data.action === 'stop') {
                    votazioneAttiva = false;
                    broadcast({ type: 'status', votazioneAttiva });

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
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server avviato su http://0.0.0.0:${PORT}`);
});
