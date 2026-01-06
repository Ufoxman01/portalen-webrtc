const socket = io();
const room = "portalen";

let pc;
let localStream;

const audio = document.getElementById("remote");

function createPeer() {
  return new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });
}

document.getElementById("start").onclick = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false
  });

  pc = createPeer();

  localStream.getTracks().forEach(track =>
    pc.addTrack(track, localStream)
  );

  pc.onicecandidate = e => {
    if (e.candidate) {
      socket.emit("ice", {
        to: room,
        candidate: e.candidate
      });
    }
  };

  pc.ontrack = e => {
    audio.srcObject = e.streams[0];
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  socket.emit("offer", {
    to: room,
    sdp: offer
  });
};

socket.emit("join", room);

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

  await pc.setRemoteDescription(sdp);

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  socket.emit("answer", {
    to: from,
    sdp: answer
  });
});

socket.on("answer", async ({ sdp }) => {
  await pc.setRemoteDescription(sdp);
});

socket.on("ice", async ({ candidate }) => {
  if (candidate) {
    await pc.addIceCandidate(candidate);
  }
});

