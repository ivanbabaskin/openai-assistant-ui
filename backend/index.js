const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer");
const OpenAI = require("openai");
const fsPromises = require("fs").promises;
const fs = require("fs");
require("dotenv").config();

// Initialize Express app
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Multer for file upload
const upload = multer({ dest: "uploads/" });

// POST endpoint to handle chat
app.post("/chat", async (req, res) => {
  try {
    const { question } = req.body;

    const chatCompletion = await openai.chat.completions.create({
        messages: [{ role: "user", content: question }],
        model: "gpt-3.5-turbo",
    });
    
    res.json({ response: chatCompletion.choices[0].message.content });
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

// POST endpoint for file upload
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const assistantDetails = await getOrCreateAssistant();
    const file = await openai.files.create({
      file: fs.createReadStream(req.file.path),
      purpose: "assistants",
    });

    // Retrieve existing file IDs from assistant.json to not overwrite
    let existingFileIds = assistantDetails.file_ids || [];

    // Update the assistant with the new file ID
    await openai.beta.assistants.update(assistantDetails.assistantId, {
      file_ids: [...existingFileIds, file.id],
    });

    // Update local assistantDetails and save to assistant.json
    assistantDetails.file_ids = [...existingFileIds, file.id];
    await fsPromises.writeFile(
      "./assistant.json",
      JSON.stringify(assistantDetails, null, 2)
    );

    res.send("File uploaded and successfully added to assistant");
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred during file upload");
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
