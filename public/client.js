const socket = io();
const audio = document.getElementById("audio");

let pc;
let localStream;
let room;

const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

function createPC(peerId) {
  pc = new RTCPeerConnection(config);

  pc.onicecandidate = e => {
    if (e.candidate) {
      socket.emit("ice", { to: peerId, candidate: e.candidate });
    }
  };

pc.ontrack = e => {
  console.log("🎧 Audio stream mottagen");
  audio.srcObject = e.streams[0];
  audio.muted = false;
  audio.volume = 1.0;

  audio.play().catch(err => {
    console.error("❌ audio.play() blockerad:", err);
  });
};


  localStream.getTracks().forEach(t =>
    pc.addTrack(t, localStream)
  );

  return pc;
}

document.getElementById("start").onclick = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true
  });
  alert("Mikrofon igång");
};

document.getElementById("join").onclick = () => {
  room = document.getElementById("room").value;
  socket.emit("join", room);
};

socket.on("peers", async peers => {
  if (!peers.length) return;

  const peerId = peers[0];
  const pc = createPC(peerId);

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  socket.emit("offer", { to: peerId, sdp: offer });
});

socket.on("offer", async data => {
  const pc = createPC(data.from);

  await pc.setRemoteDescription(data.sdp);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  socket.emit("answer", { to: data.from, sdp: answer });
});

socket.on("answer", async data => {
  await pc.setRemoteDescription(data.sdp);
});

socket.on("ice", async data => {
  if (data.candidate) {
    await pc.addIceCandidate(data.candidate);
  }
});

