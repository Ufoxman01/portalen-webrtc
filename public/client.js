const socket = io();
const room = "portalen";

const audio = document.getElementById("remote");
let pc;
let localStream;

function createPeer() {
  return new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });
}

async function startPeer(targetId, isInitiator) {
  pc = createPeer();

  pc.onicecandidate = e => {
    if (e.candidate) {
      socket.emit("ice", {
        to: targetId,
        candidate: e.candidate
      });
    }
  };

  pc.ontrack = e => {
    audio.srcObject = e.streams[0];
  };

  if (!localStream) {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false
    });
  }

  localStream.getTracks().forEach(track =>
    pc.addTrack(track, localStream)
  );

  if (isInitiator) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit("offer", {
      to: targetId,
      sdp: offer
    });
  }
}

// Starta mikrofon manuellt
document.getElementById("start").onclick = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false
  });
};

// När vi går in i rummet
socket.emit("join", room);

// Får lista på befintliga peers
socket.on("peers", (peers) => {
  peers.forEach(peerId => {
    startPeer(peerId, true);
  });
});

// Någon ny anslöt
socket.on("peer-joined", (peerId) => {
  startPeer(peerId, false);
});

// Ta emot offer
socket.on("offer", async ({ from, sdp }) => {
  pc = createPeer();

  pc.onicecandidate = e => {
    if (e.candidate) {
      socket.emit("ice", {
        to: from,
        candidate: e.candidate
      });
    }
  };

  pc.ontrack = e => {
    audio.srcObject = e.streams[0];
  };

  if (!localStream) {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false
    });
  }

  localStream.getTracks().forEach(track =>
    pc.addTrack(track, localStream)
  );

  await pc.setRemoteDescription(sdp);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  socket.emit("answer", {
    to: from,
    sdp: answer
  });
});

// Ta emot answer
socket.on("answer", async ({ sdp }) => {
  await pc.setRemoteDescription(sdp);
});

// ICE
socket.on("ice", async ({ candidate }) => {
  if (candidate) {
    await pc.addIceCandidate(candidate);
  }
});

