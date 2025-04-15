const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://nexufy.vercel.app", // prod adresin
    methods: ["GET", "POST"],
  },
  path: "/api/signal",
});

const rooms = {}; // odaId -> [socketId]

io.on("connection", (socket) => {
  console.log("🔌 Bağlanan:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`📥 ${socket.id} ${roomId} odasına katıldı`);

    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push(socket.id);

    // Oda içindeki diğer kullanıcılara haber ver
    const otherUsers = rooms[roomId].filter((id) => id !== socket.id);
    socket.emit("all-users", otherUsers);

    socket.to(roomId).emit("user-joined", socket.id);

    // Odada disconnect olunca diziden çıkar
    socket.on("disconnect", () => {
      console.log("❌ Koptu:", socket.id);
      rooms[roomId] = rooms[roomId]?.filter((id) => id !== socket.id);
      socket.to(roomId).emit("user-left", socket.id);
    });
  });

  // OFFER -> Hedefe gönder
  socket.on("offer", ({ target, offer }) => {
    io.to(target).emit("offer", { from: socket.id, offer });
  });

  // ANSWER -> Hedefe gönder
  socket.on("answer", ({ target, answer }) => {
    io.to(target).emit("answer", { from: socket.id, answer });
  });

  // ICE CANDIDATE -> Hedefe gönder
  socket.on("candidate", ({ target, candidate }) => {
    io.to(target).emit("candidate", { from: socket.id, candidate });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Sunucu ${PORT} portunda çalışıyor`);
});
