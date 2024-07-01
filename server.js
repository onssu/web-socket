const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const hostname = "0.0.0.0";
const port = 80;

app.use(express.static(path.join(__dirname, "public")));

let drawingData = [];
let users = [];

wss.on("connection", (ws) => {
  let currentUser = null;
  // 새로운 클라이언트에게 기존의 drawingData 전송
  ws.send(JSON.stringify({ type: "init", drawingData }));

  ws.on("message", (message) => {
    const bufferData = Buffer.from(message, "hex");

    const jsonString = bufferData.toString("utf8");
    try {
      const data = JSON.parse(jsonString);

      if (data.type === "setNickname") {
        currentUser = { nickname: data.nickname, color: "#000000" };
        users.push(currentUser);
        broadcastUserList();
      } else if (data.type === "colorChange") {
        const userIndex = users.findIndex(
          (user) =>
            user.nickname === currentUser.nickname &&
            user.color === currentUser.color
        );

        if (userIndex !== -1) {
          users[userIndex].color = data.color;
          broadcastUserList();
        }
      } else {
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
      }

      if (data.type === "clear") {
        drawingData = []; // 캔버스 클리어 시 저장된 데이터도 클리어
      } else {
        drawingData.push(data); // 그리기 데이터 저장
      }
    } catch (error) {}
  });

  ws.on("close", () => {
    if (currentUser) {
      users = users.filter(
        (user) =>
          user.nickname !== currentUser.nickname ||
          user.color !== currentUser.color
      );

      broadcastUserList();
    }
  });

  if (users.length > 0) ws.send(JSON.stringify({ type: "userList", users }));
});

function broadcastUserList() {
  const userList = Object.keys(users).map((user) => ({
    nickname: users[user].nickname,
    color: users[user].color,
  }));
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: "userList", users: userList }));
    }
  });
}

server.listen(port, hostname, () => {
  console.log("Server is listening");
});
