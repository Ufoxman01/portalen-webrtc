import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("Ansluten:", socket.id);

  socket.on("join", (room) => {
    socket.join(room);

    // Skicka lista på peers till den som just anslöt
    const clients = Array.from(io.sockets.adapter.rooms.get(room) || []);
    socket.emit("peers", clients.filter(id => id !== socket.id));

    // Tala om för andra att en ny peer kom in
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
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log("Portalen WebRTC kör på port", PORT)
);
