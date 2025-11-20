import express from "express";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { router as apiRouter } from "./routes.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static client
app.use(express.static(path.join(__dirname, "..", "client")));

// API
app.use("/api", apiRouter);

// Fallback SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "client", "index.html"));
});

app.listen(PORT, () => {
  console.log(`ms-journal-agent running at http://localhost:${PORT}`);
});
