let room = null;

document.getElementById("join").onclick = () => {
  room = document.getElementById("room").value || "portalen";
  document.getElementById("start").disabled = false;
};
const socket = io();

const roomInput = document.getElementById("room");
const joinBtn = document.getElementById("join");
const status = document.getElementById("status");

joinBtn.onclick = () => {
  const room = roomInput.value.trim();

  if (!room) {
    status.textContent = "❌ Ange ett rumnamn";
    return;
  }

  socket.emit("join", room);
  status.textContent = `⏳ Försöker joina rum: ${room}`;
};

socket.on("joined", (room) => {
  status.textContent = `✅ Du är nu i rum: ${room}`;
});

socket.on("connect", () => {
  status.textContent = "🟢 Socket ansluten";
});

  pc.ontrack = (e) => {
    // För enkel audio-radio: spela första inkommande streamen
    if (!audioEl.srcObject) audioEl.srcObject = e.streams[0];
  };

  // lägg till mic om den finns
  if (localStream) {
    for (const track of localStream.getTracks()) {
      pc.addTrack(track, localStream);
    }
  }

  pcs.set(peerId, pc);
  return pc;
}

async function ensureMic() {
  if (localStream) return localStream;
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  return localStream;
}

startBtn.onclick = async () => {
  await ensureMic();
};

socket.emit("join", room);

// När du får befintliga peers: ring upp dem (du är initiator)
socket.on("peers", async (peers) => {
  // om du vill: auto-starta mic vid första test
  // await ensureMic();

  for (const peerId of peers) {
    const pc = createPeer(peerId);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit("offer", { to: peerId, sdp: offer });
  }
});

// När en ny peer ansluter: vänta på offer från den (du är inte initiator här)
socket.on("peer-joined", (peerId) => {
  // Vi skapar pc så vi kan ta emot offer/ice
  if (!pcs.has(peerId)) createPeer(peerId);
});

socket.on("offer", async ({ from, sdp }) => {
  // Se till att vi har mic om vi ska kunna svara med audio tillbaka
  // Om du vill att lyssnare INTE ska prata tillbaka senare, tar vi bort detta i Steg 2.
  await ensureMic();

  const pc = pcs.get(from) || createPeer(from);

  await pc.setRemoteDescription(sdp);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  socket.emit("answer", { to: from, sdp: answer });
});

socket.on("answer", async ({ from, sdp }) => {
  const pc = pcs.get(from);
  if (!pc) return;
  await pc.setRemoteDescription(sdp);
});

socket.on("ice", async ({ from, candidate }) => {
  const pc = pcs.get(from);
  if (!pc) return;
  try {
    await pc.addIceCandidate(candidate);
  } catch {}
});

socket.on("peer-left", (peerId) => {
  const pc = pcs.get(peerId);
  if (pc) pc.close();
  pcs.delete(peerId);

  // om den som spelades försvann
  // (valfritt) audioEl.srcObject = null;
});


