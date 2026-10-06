import type { ServiceDraftPerson, ServicePersonRole } from "@cilgas/contracts";
import { RecordPicker } from "../../shared/RecordPicker";
import { peopleApi } from "../../shared/people-api";

const roles: Record<ServicePersonRole, string> = {
  TITULAR: "Titular",
  CONTACTO: "Contacto",
  PAGADOR: "Pagador",
};
function loadPeople(
  q: string,
  cursor: string | undefined,
  signal: AbortSignal,
) {
  return peopleApi.list({ q, cursor, active: "true" }, signal);
}
export function ServicePeople({
  people,
  disabled,
  onChange,
  onSessionLost,
}: {
  people: ServiceDraftPerson[];
  disabled: boolean;
  onChange: (people: ServiceDraftPerson[]) => void;
  onSessionLost: () => void;
}) {
  return (
    <section aria-label="Personas del servicio">
      <h3>Personas del servicio</h3>
      <p className="records-description">
        Para confirmar, el titular debe tener nombre, documento, teléfono,
        calle, altura o S/N explícito, código postal, localidad y provincia.
        Piso y departamento son opcionales. Completá los faltantes en Personas.
      </p>
      <div className="service-people-grid">
        {(Object.entries(roles) as [ServicePersonRole, string][]).map(
          ([role, label]) => {
            const selected = people.find((entry) => entry.role === role);
            return (
              <fieldset className="catalog-item" key={role} disabled={disabled}>
                <legend>{label}</legend>
                {selected ? (
                  <p className="notice notice-info">
                    <strong>{selected.person.name}</strong> ·{" "}
                    {selected.person.documentType}{" "}
                    {selected.person.documentNumber}
                    <button
                      type="button"
                      className="text-button"
                      onClick={() =>
                        onChange(people.filter((entry) => entry.role !== role))
                      }
                    >
                      Quitar {label.toLocaleLowerCase("es")}
                    </button>
                  </p>
                ) : (
                  <p className="records-description">
                    Sin {label.toLocaleLowerCase("es")} seleccionado.
                  </p>
                )}
                <RecordPicker
                  label={`Buscar ${label.toLocaleLowerCase("es")} del servicio`}
                  searchLabel="Buscar personas"
                  load={loadPeople}
                  describe={(person) =>
                    `${person.name} · ${person.documentType} ${person.documentNumber}`
                  }
                  selectLabel={(person) => person.name}
                  onSelect={(person) =>
                    onChange([
                      ...people.filter((entry) => entry.role !== role),
                      { role, personId: person.id, person },
                    ])
                  }
                  onSessionLost={onSessionLost}
                  disabled={disabled}
                />
              </fieldset>
            );
          },
        )}
      </div>
    </section>
  );
}
