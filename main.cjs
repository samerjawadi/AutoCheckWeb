const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
  });

  // Load React build (production)
  win.loadFile(path.join(__dirname, "dist", "index.html"));

  // OR (for development)
  // win.loadURL("http://localhost:3000");
}

app.whenReady().then(createWindow);
