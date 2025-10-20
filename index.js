import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json({ limit: "10mb" }));

const { GITHUB_TOKEN, GITHUB_USERNAME, GITHUB_REPO } = process.env;

app.post("/build-ipa", async (req, res) => {
  const { html, appName } = req.body;
  const htmlFile = "index.html";

  fs.writeFileSync(htmlFile, html);

  const content = fs.readFileSync(htmlFile).toString("base64");
  await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${htmlFile}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: "Upload HTML for build",
      content,
    }),
  });

  const triggerResp = await fetch(
    `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/actions/workflows/build.yml/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: "main",
        inputs: {
          app_name: appName,
          html_file: htmlFile,
        },
      }),
    }
  );

  if (!triggerResp.ok) {
    const text = await triggerResp.text();
    return res.status(400).send(`Workflow trigger failed: ${text}`);
  }

  res.json({ status: "Workflow triggered successfully!" });
});

app.listen(4000, () => console.log("Server running on port 4000"));
