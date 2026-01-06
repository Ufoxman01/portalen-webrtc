import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

io.on("connection", socket => {
  console.log("Ansluten:", socket.id);

  socket.on("join", room => {
    socket.join(room);

    const peers =
      [...(io.sockets.adapter.rooms.get(room) || [])]
      .filter(id => id !== socket.id);

    socket.emit("peers", peers);
    socket.to(room).emit("peer-joined", socket.id);
  });

  socket.on("offer", data => io.to(data.to).emit("offer", data));
  socket.on("answer", data => io.to(data.to).emit("answer", data));
  socket.on("ice", data => io.to(data.to).emit("ice", data));
});

server.listen(3000, () =>
  console.log("Server på http://localhost:3000")
);


