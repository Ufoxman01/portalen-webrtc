import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("🟢 Ansluten:", socket.id);

  socket.on("join", (room) => {
    socket.join(room);
    console.log(`➡ ${socket.id} joinade rum: ${room}`);

    // Skicka tillbaka bekräftelse
    socket.emit("joined", room);

    // Skicka befintliga peers i rummet
    const clients = [...(io.sockets.adapter.rooms.get(room) || [])]
      .filter(id => id !== socket.id);

    socket.emit("peers", clients);
    socket.to(room).emit("peer-joined", socket.id);
  });

  socket.on("offer", ({ to, sdp }) => {
    io.to(to).emit("offer", { from: socket.id, sdp });
  });

  socket.on("answer", ({ to, sdp }) => {
    io.to(to).emit("answer", { from: socket.id, sdp });
  });

  socket.on("ice", ({ to, candidate }) => {
    io.to(to).emit("ice", { from: socket.id, candidate });
  });

  socket.on("disconnect", () => {
    console.log("🔴 Frånkopplad:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("🚀 Server kör på http://localhost:" + PORT);
});


