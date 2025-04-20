import express from "express";
import path from "path";
import { createServer } from "node:http";
import { Server } from "socket.io";

import Game from "@server/game/index";

import restApiV1 from "@server/controllers/api/v1/rest/index";
import { handleConnection } from "@server/controllers/api/v1/ws/index";

const app = express();
const server = createServer(app);
const io = new Server(server, { path: "/api/v1/stream" });
const game = new Game(io);

const port = 4000;

io.on("connection", handleConnection(game));

app.use("/api/v1", restApiV1);

const distPath = path.join(__dirname, "..", "..", "web", "dist");
app.use(express.static(distPath));

app.get("/*splat", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

game.start();
