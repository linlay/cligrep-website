import React from "react";
import ReactDOM from "react-dom/client";
import "./i18n/index.js";
import App from "./App";
import "./styles/themes.css";
import "./styles/terminal.css";
import "./styles/prompt.css";
import "./styles/panels.css";
import "./styles/responsive.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
