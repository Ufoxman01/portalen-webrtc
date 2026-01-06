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
    socket.to(room).emit("peer-joined", socket.id);
  });

  socket.on("offer", ({ to, sdp }) => {
    socket.to(to).emit("offer", { from: socket.id, sdp });
  });

  socket.on("answer", ({ to, sdp }) => {
    socket.to(to).emit("answer", { from: socket.id, sdp });
  });

  socket.on("ice", ({ to, candidate }) => {
    socket.to(to).emit("ice", { from: socket.id, candidate });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log("Portalen WebRTC kör på port", PORT)
);
