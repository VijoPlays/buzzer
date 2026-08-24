let peer = null;
let conn = null;

const setupScreen = document.getElementById('setup-screen');
const buzzerScreen = document.getElementById('buzzer-screen');
const connectBtn = document.getElementById('connect-btn');
const buzzerBtn = document.getElementById('buzzer-btn');
const statusMsg = document.getElementById('status-msg');
const feedbackMsg = document.getElementById('feedback-msg');

connectBtn.addEventListener('click', () => {
    const code = document.getElementById('join-code').value.trim().toUpperCase();
    const name = document.getElementById('player-name').value.trim();

    if (!code || !name) {
        statusMsg.innerText = "ERROR: CALLSIGN AND CODE REQUIRED";
        return;
    }

    statusMsg.innerText = "INITIALIZING SIGNAL...";

    // Create random ID for remote
    peer = new Peer();

    peer.on('open', (id) => {
        console.log("Remote Peer ID:", id);
        attemptConnection(code, name);
    });

    peer.on('error', (err) => {
        console.error("Peer Error:", err);
        statusMsg.innerText = "SIGNAL LOST: " + err.type;
        if (err.type === 'peer-unavailable') {
            statusMsg.innerText = "BOARD NOT FOUND. CHECK CODE: " + code;
        }
    });
});

function attemptConnection(code, name) {
    conn = peer.connect(code, {
        reliable: true
    });

    conn.on('open', () => {
        conn.send({ type: 'join', name: name });
        setupScreen.classList.add('hidden');
        buzzerScreen.classList.remove('hidden');
        document.getElementById('display-name').innerText = name.toUpperCase();
    });

    conn.on('data', (data) => {
        if (data.type === 'lock') {
            buzzerBtn.classList.add('locked');
            feedbackMsg.innerText = "SIGNAL JAMMED";
        } else if (data.type === 'unlock') {
            buzzerBtn.classList.remove('locked');
            feedbackMsg.innerText = "READY FOR ENGAGEMENT";
        } else if (data.type === 'play-audio') {
            feedbackMsg.innerText = "INCOMING AUDIO RELAY...";
            setTimeout(() => {
                const audio = new Audio(data.url);
                audio.play();
                feedbackMsg.innerText = "PLAYING AUDIO...";
                audio.onended = () => {
                    feedbackMsg.innerText = "AUDIO RELAY COMPLETE";
                };
            }, data.delay || 0);
        }
    });

    conn.on('close', () => {
        statusMsg.innerText = "CONNECTION TERMINATED";
        location.reload();
    });

    conn.on('error', (err) => {
        console.error("Link Error:", err);
        statusMsg.innerText = "LINK FAILED: " + err.type;
    });
}

buzzerBtn.addEventListener('mousedown', sendBuzz);
buzzerBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    sendBuzz();
});

function sendBuzz() {
    if (conn && conn.open && !buzzerBtn.classList.contains('locked')) {
        conn.send({ type: 'buzz', timestamp: Date.now() });
        feedbackMsg.innerText = "ENGAGED";
        buzzerBtn.classList.add('locked'); // Auto-lock locally to prevent spam
    }
}
