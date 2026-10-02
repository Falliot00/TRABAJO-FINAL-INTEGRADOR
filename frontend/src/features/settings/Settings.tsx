import type { SessionUser } from "@cilgas/contracts";
import { useState } from "react";
import { WorkshopSettings } from "./WorkshopSettings";
import { RegulatoryActors } from "./RegulatoryActors";
import { ComponentModels } from "./ComponentModels";
import "./settings.css";

export function Settings({
  user,
  onSessionLost,
}: {
  user: SessionUser;
  onSessionLost: () => void;
}) {
  const [section, setSection] = useState("Taller");
  const editable = user.permissions.includes("configuracion.administrar");
  return (
    <>
      <header className="page-heading">
        <div>
          <span className="eyebrow">Datos de referencia</span>
          <h1>Configuración</h1>
          <p>Datos del taller y referencias para la atención técnica.</p>
        </div>
      </header>
      <nav className="settings-tabs" aria-label="Secciones de configuración">
        {["Taller", "Actores regulatorios", "Modelos de componentes"].map(
          (label) => (
            <button
              key={label}
              className={section === label ? "primary" : "secondary"}
              aria-current={section === label ? "page" : undefined}
              onClick={() => setSection(label)}
            >
              {label}
            </button>
          ),
        )}
      </nav>
      {section === "Taller" && (
        <WorkshopSettings editable={editable} onSessionLost={onSessionLost} />
      )}
      {section === "Actores regulatorios" && (
        <RegulatoryActors editable={editable} onSessionLost={onSessionLost} />
      )}
      {section === "Modelos de componentes" && (
        <ComponentModels editable={editable} onSessionLost={onSessionLost} />
      )}
    </>
  );
}
