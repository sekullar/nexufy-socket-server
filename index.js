const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

// Supabase bağlantısı
const supabaseUrl = "https://cwvgzpwabyisqzyflazf.supabase.co"; // Supabase URL'inizi buraya ekleyin
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3dmd6cHdhYnlpc3F6eWZsYXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0NTE1NDAsImV4cCI6MjA1ODAyNzU0MH0.moiPwbzhxyFlSbxQvAxT_x2MhLr7NIZmEg4jzfySe7I"; // Supabase anon public key'inizi buraya ekleyin
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://nexufy.vercel.app", // prod adresi
    methods: ["GET", "POST"],
  },
  path: "/api/signal",
});

const rooms = {}; // odaId -> [socketId]

io.on("connection", (socket) => {
  socket.on("ping-check", (timestamp) => {
    socket.emit("pong-reply", timestamp);
  });
});


io.on("connection", (socket) => {
  console.log("🔌 Bağlanan:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`📥 ${socket.id} ${roomId} odasına katıldı`);

    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push(socket.id);

    const otherUsers = rooms[roomId].filter((id) => id !== socket.id);
    socket.emit("all-users", otherUsers);

    socket.to(roomId).emit("user-joined", socket.id);
  

    socket.on("disconnect", async () => {
      console.log("❌ Koptu:", socket.id);
      rooms[roomId] = rooms[roomId]?.filter((id) => id !== socket.id);
      socket.to(roomId).emit("user-left", socket.id);

      const { error } = await supabase
        .from("soundChannelInfo")
        .delete()
        .eq("socket_id", socket.id); // kullanıcının socket_id'sine göre sil

      if (error) {
        console.log("Supabase hata:", error);
      } else {
        console.log("Kullanıcı disconnect olarak silindi.");
      }

      if (rooms[roomId].length === 0) {
        console.log(`Oda ${roomId} tamamen boş, işlem yapılabilir.`);
      }
    });
  });

  socket.on("offer", ({ target, offer }) => {
    io.to(target).emit("offer", { from: socket.id, offer });
  });

  socket.on("answer", ({ target, answer }) => {
    io.to(target).emit("answer", { from: socket.id, answer });
  });

  socket.on("candidate", ({ target, candidate }) => {
    io.to(target).emit("candidate", { from: socket.id, candidate });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Sunucu ${PORT} portunda çalışıyor`);
});
