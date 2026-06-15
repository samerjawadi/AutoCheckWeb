import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { seedIfEmpty } from "./services/localDB.js";
import { LanguageProvider } from "./context/LanguageContext.jsx";

seedIfEmpty();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>
);
