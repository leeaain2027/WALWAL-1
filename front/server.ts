import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory storage for messages received via POST
  let receivedMessages: { id: string; text: string; timestamp: Date }[] = [];

  // API Route to receive messages
  app.post("/api/message", (req, res) => {
    const { text } = req.body;
    console.log("Received message:", text);
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const newMessage = {
      id: Date.now().toString(),
      text,
      timestamp: new Date(),
    };

    receivedMessages.unshift(newMessage);
    // Keep only the last 3 messages
    receivedMessages = receivedMessages.slice(0, 3);

    res.status(201).json(newMessage);
  });

  // API Route to get received messages
  app.get("/api/message", (req, res) => {
    res.json(receivedMessages);
  });

  // API Route to save user input to a file
  // app.post("/api/save-input", async (req, res) => {
  //   const { text } = req.body;

  //   try {
  //     const fs = await import("fs/promises");

  //     const filePath = "/../user_input.json"; // mac/linux에서 거의 항상 가능
  //     await fs.writeFile(filePath, text ?? "", "utf-8");

  //     res.status(200).json({
  //       message: "saved",
  //       filePath,
  //     });
  //   } catch (error) {
  //     console.error(error);
  //     res.status(500).json({ error: "failed" });
  //   }
  // });

  app.post("/api/save-input", async (req, res) => {
  const { text } = req.body;

  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const os = await import("os");

    // const filePath = path.join(os.tmpdir(), "user_input.json");
    const filePath = "user_input.json"; // mac/linux에서 거의 항상 가능
    // 저장할 데이터 구조
    const newData = {
      text: text ?? "",
      timestamp: new Date().toISOString(),
    };

    // 기존 파일 있으면 읽어서 배열로 유지
    let existingData = [];

    try {
      const file = await fs.readFile(filePath, "utf-8");
      existingData = JSON.parse(file);
    } catch (e) {
      // 파일 없으면 그냥 새로 시작
      existingData = [];
    }

    existingData.push(newData);

    await fs.writeFile(filePath, JSON.stringify(existingData, null, 2), "utf-8");

    res.status(200).json({
      message: "saved",
      filePath,
      saved: newData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "failed" });
  }
});

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
