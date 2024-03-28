const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  pingInterval: 10000,
  pingTimeout: 5000,
  transports: ["websocket"],
});

app.use(express.static("public"));

app.get("/", (req, res) => {
  fs.readFile("index.html", "utf8", (err, data) => {
    if (err) {
      console.error("Error reading file:", err);
      res.status(500).send("Internal Server Error");
      return;
    }
    res.send(data);
  });
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

let documents = [{ title: "first", text: "" }];

io.on("connection", (socket) => {
   console.log(`connected with transport ${socket.conn.transport.name}`);
  console.log(`${socket.id} user connected`);
  socket.join(documents[0].title);
  socket.emit(
    "documentList",
    documents.map((x) => x.title)
  );
  socket.emit("documentContent", documents[0]);

  socket.on("updateDocument", ({ title, text }) => {
    const documentIndex = documents.findIndex((doc) => doc.title === title);

    if (documentIndex !== -1) {
      documents[documentIndex].text = text;
      io.to(title).emit("documentContent", documents[documentIndex]);
    }
  });

  socket.on("changeDocument", (title) => {
    socket.join(title);
    let document = documents.find((x) => x.title === title);

    socket.emit("documentContent", document);
  });

  socket.on("newDocuments", ({ title, text }) => {
    if (documents.find(x => x.title === title)) {
      return;
    }
    documents.push({ title, text });
    io.emit(
      "documentList",
      documents.map((x) => x.title)
    );
  });

  socket.on("disconnect", () => {
    console.log(`${socket.id} user disconnected`);
  });
});
