import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { scrapeChapter } from "./src/services/scraper.js";

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "8080", 10);

  app.use(express.json());

  // API to scrape story content
  app.get("/api/scrape", async (req, res) => {
    const { url } = req.query;

    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      const result = await scrapeChapter(url);
      res.json(result);
    } catch (error: any) {
      console.error("Scraping error:", error.message);
      res.status(500).json({ error: "Lỗi: Trang web này chặn truy cập hoặc URL không hợp lệ." });
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();