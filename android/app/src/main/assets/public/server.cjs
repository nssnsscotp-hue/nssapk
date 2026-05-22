var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_multer = __toESM(require("multer"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_app = require("firebase/app");
var import_storage = require("firebase/storage");
import_dotenv.default.config();
var firebaseConfig = JSON.parse(
  import_fs.default.readFileSync(import_path.default.join(process.cwd(), "firebase-applet-config.json"), "utf8")
);
var firebaseApp = (0, import_app.getApps)().length === 0 ? (0, import_app.initializeApp)(firebaseConfig) : (0, import_app.getApp)();
var memoryStorage = import_multer.default.memoryStorage();
var uploadMem = (0, import_multer.default)({ storage: memoryStorage });
var uploadDir = import_path.default.join(process.cwd(), "uploads");
if (!import_fs.default.existsSync(uploadDir)) {
  import_fs.default.mkdirSync(uploadDir, { recursive: true });
}
var metadataPath = import_path.default.join(uploadDir, "metadata.json");
if (!import_fs.default.existsSync(metadataPath)) {
  import_fs.default.writeFileSync(metadataPath, JSON.stringify([], null, 2));
}
var preseededFiles = [
  "NSS_Regular_Activities_Manual.pdf",
  "Annual_Special_Camp_Guidelines_2026.pdf",
  "Gram_Vikas_Project_Report_April_2026.docx",
  "Blood_Donation_Camp_Certificate_Template.pdf",
  "Socio_Economic_Survey_Form_Blank.xlsx",
  "Campus_Cleaning_Drive_Snapshots.zip"
];
preseededFiles.forEach((fileName) => {
  const filePath = import_path.default.join(uploadDir, fileName);
  if (!import_fs.default.existsSync(filePath)) {
    import_fs.default.writeFileSync(filePath, `This is the official NSS Resource package content for ${fileName}. Thank you for your leadership in the National Service Scheme.`);
  }
});
var storage = import_multer.default.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = import_path.default.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  }
});
var upload = (0, import_multer.default)({ storage });
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, systemInstruction } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured in the environment.");
      }
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [{ text: message }]
          }
        ],
        config: {
          systemInstruction
        }
      });
      res.json({ text: response.text });
    } catch (error) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: "Failed to generate content", details: error.message });
    }
  });
  app.post("/api/firebase/upload", uploadMem.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file was selected for upload." });
      }
      const { folder, bucket } = req.body;
      const file = req.file;
      let activeStorage = (0, import_storage.getStorage)(firebaseApp);
      if (bucket && bucket.trim() !== "" && bucket !== firebaseConfig.storageBucket) {
        const appId = `shard_${bucket.replace(/[^a-zA-Z0-9]/g, "_")}`;
        const activeApp = (0, import_app.getApps)().find((a) => a.name === appId) || (0, import_app.initializeApp)({
          ...firebaseConfig,
          storageBucket: bucket
        }, appId);
        activeStorage = (0, import_storage.getStorage)(activeApp);
      }
      const folderPath = folder || "uploads";
      const fileExt = file.originalname.split(".").pop() || "jpg";
      const cleanName = `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9]/g, "_")}.${fileExt}`;
      const fileRef = (0, import_storage.ref)(activeStorage, `${folderPath}/${cleanName}`);
      await (0, import_storage.uploadBytes)(fileRef, file.buffer, {
        contentType: file.mimetype
      });
      const downloadUrl = await (0, import_storage.getDownloadURL)(fileRef);
      res.status(200).json({ success: true, url: downloadUrl });
    } catch (err) {
      console.warn("Firebase Storage upload failed, falling back to local container storage:", err.message || err);
      try {
        const file = req.file;
        if (!file) {
          return res.status(400).json({ error: "No file was selected for upload." });
        }
        const fileExt = file.originalname.split(".").pop() || "jpg";
        const diskFilename = `fallback_${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9]/g, "_")}.${fileExt}`;
        const filePath = import_path.default.join(uploadDir, diskFilename);
        import_fs.default.writeFileSync(filePath, file.buffer);
        const downloadUrl = `/api/uploads/${diskFilename}`;
        console.log(`Fallback local write successful. Served at: ${downloadUrl}`);
        res.status(200).json({
          success: true,
          url: downloadUrl,
          message: "Secure fallback container routing."
        });
      } catch (fallbackErr) {
        console.error("Local directory write fallback error:", fallbackErr);
        res.status(500).json({ error: "Fallback storage write failed. Both Cloud and Local storage are unavailable." });
      }
    }
  });
  app.get("/api/uploads/:filename", (req, res) => {
    try {
      const { filename } = req.params;
      if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
        return res.status(403).json({ error: "Access denied." });
      }
      const filePath = import_path.default.join(uploadDir, filename);
      if (import_fs.default.existsSync(filePath)) {
        return res.sendFile(filePath);
      } else {
        return res.status(404).send("File not found in local container pool.");
      }
    } catch (err) {
      console.error("Local asset streaming error:", err);
      res.status(500).send("Asset delivery error.");
    }
  });
  app.get("/api/resources", (req, res) => {
    try {
      const data = import_fs.default.readFileSync(metadataPath, "utf-8");
      const localFiles = JSON.parse(data);
      res.json({ localFiles });
    } catch (err) {
      console.error("Error reading resources metadata:", err);
      res.status(500).json({ error: "Failed to read resource listings" });
    }
  });
  app.post("/api/resources/upload", upload.single("file"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file was selected for upload." });
      }
      const { category, customTitle, uploadedBy } = req.body;
      const file = req.file;
      const metadata = JSON.parse(import_fs.default.readFileSync(metadataPath, "utf-8"));
      const displayName = customTitle && customTitle.trim() ? `${customTitle.trim().replace(/\.[^/.]+$/, "")}${import_path.default.extname(file.originalname)}` : file.originalname;
      const newResource = {
        id: `server-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: displayName,
        category: category || "Other 01",
        uploadedBy: uploadedBy || "Volunteer",
        uploadedAt: (/* @__PURE__ */ new Date()).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        }).replace(/ /g, "-"),
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        filename: file.filename,
        isLocal: true
      };
      metadata.unshift(newResource);
      import_fs.default.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      res.status(201).json({ success: true, resource: newResource });
    } catch (err) {
      console.error("Upload route error:", err);
      res.status(500).json({ error: "Internal Server Error during upload" });
    }
  });
  app.get("/api/resources/download/:id", (req, res) => {
    try {
      const { id } = req.params;
      const preseededMap = {
        "1": "NSS_Regular_Activities_Manual.pdf",
        "2": "Annual_Special_Camp_Guidelines_2026.pdf",
        "3": "Gram_Vikas_Project_Report_April_2026.docx",
        "4": "Blood_Donation_Camp_Certificate_Template.pdf",
        "5": "Socio_Economic_Survey_Form_Blank.xlsx",
        "6": "Campus_Cleaning_Drive_Snapshots.zip"
      };
      if (preseededMap[id]) {
        const fileName = preseededMap[id];
        const filePath2 = import_path.default.join(uploadDir, fileName);
        if (import_fs.default.existsSync(filePath2)) {
          return res.download(filePath2, fileName);
        }
      }
      const metadata = JSON.parse(import_fs.default.readFileSync(metadataPath, "utf-8"));
      const resource = metadata.find((r) => r.id === id);
      if (!resource) {
        return res.status(404).json({ error: "Resource item not found in repository." });
      }
      const filePath = import_path.default.join(uploadDir, resource.filename);
      if (!import_fs.default.existsSync(filePath)) {
        return res.status(404).json({ error: "Physical file was cleared or does not exist." });
      }
      res.download(filePath, resource.name);
    } catch (err) {
      console.error("Download route error:", err);
      res.status(500).json({ error: "Failed to download file" });
    }
  });
  app.delete("/api/resources/:id", (req, res) => {
    try {
      const { id } = req.params;
      const metadata = JSON.parse(import_fs.default.readFileSync(metadataPath, "utf-8"));
      const resourceIndex = metadata.findIndex((r) => r.id === id);
      if (resourceIndex === -1) {
        return res.status(404).json({ error: "Resource not found" });
      }
      const resource = metadata[resourceIndex];
      const filePath = import_path.default.join(uploadDir, resource.filename);
      if (import_fs.default.existsSync(filePath)) {
        import_fs.default.unlinkSync(filePath);
      }
      metadata.splice(resourceIndex, 1);
      import_fs.default.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      res.json({ success: true, message: "Resource removed successfully" });
    } catch (err) {
      console.error("Delete route error:", err);
      res.status(500).json({ error: "Failed to delete resource entry" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
