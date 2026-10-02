import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./shared/styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("No se encontró la raíz de la aplicación.");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
