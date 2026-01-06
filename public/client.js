const socket = io();

const roomInput = document.getElementById("room");
const joinBtn = document.getElementById("join");
const startBtn = document.getElementById("start");
const status = document.getElementById("status");
const audio = document.getElementById("audio");

let room = null;
let localStream = null;
const peers = new Map(); // peerId → RTCPeerConnection

// ================= SOCKET =================

socket.on("connect", () => {
  status.textContent = "🟢 Socket ansluten";
});

joinBtn.onclick = () => {
  room = roomInput.value.trim();
  if (!room) {
    status.textContent = "❌ Ange rumnamn";
    return;
  }
  socket.emit("join", room);
};

socket.on("joined", (r) => {
  status.textContent = `✅ I rum: ${r}`;
  startBtn.disabled = false;
});

socket.on("peers", (list) => {
  list.forEach(peerId => callPeer(peerId));
});

socket.on("peer-joined", (peerId) => {
  // Väntar på offer från ny peer
});

// ================= WEBRTC =================

function createPeer(peerId) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  pc.onicecandidate = e => {
    if (e.candidate) {
      socket.emit("ice", { to: peerId, candidate: e.candidate });
    }
  };

  pc.ontrack = e => {
    audio.srcObject = e.streams[0];
  };

  localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
  peers.set(peerId, pc);
  return pc;
}

async function callPeer(peerId) {
  const pc = createPeer(peerId);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit("offer", { to: peerId, sdp: offer });
}

socket.on("offer", async ({ from, sdp }) => {
  const pc = createPeer(from);
  await pc.setRemoteDescription(sdp);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit("answer", { to: from, sdp: answer });
});

socket.on("answer", async ({ from, sdp }) => {
  await peers.get(from).setRemoteDescription(sdp);
});

socket.on("ice", async ({ from, candidate }) => {
  try {
    await peers.get(from).addIceCandidate(candidate);
  } catch {}
});

// ================= MIC =================

startBtn.onclick = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false
  });
  startBtn.disabled = true;
  startBtn.textContent = "🎙️ Mikrofon igång";
};

