import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  DocumentType,
  Person,
  PersonInput,
  PersonType,
} from "@cilgas/contracts";
import { ApiError, errorMessage, isSessionLost } from "../../shared/api";
import { peopleApi } from "../../shared/people-api";
import { ErrorNotice } from "../../shared/ui";

interface PersonEditorProps {
  person: Person | null;
  onSaved: (person: Person) => void;
  onCancel: () => void;
  onSessionLost: () => void;
  onSelect: (person: Person) => void;
}

const contactFields = [
  { name: "street", label: "Calle", length: 180 },
  { name: "streetNumber", label: "Número del domicilio", length: 20 },
  { name: "floorApartment", label: "Piso / departamento", length: 40 },
  { name: "locality", label: "Localidad", length: 100 },
  { name: "province", label: "Provincia", length: 100 },
  { name: "postalCode", label: "Código postal", length: 15 },
  { name: "phone", label: "Teléfono", length: 40 },
  { name: "email", label: "Correo electrónico", length: 254 },
] as const;

export function PersonEditor({
  person,
  onSaved,
  onCancel,
  onSessionLost,
  onSelect,
}: PersonEditorProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [matches, setMatches] = useState<Person[]>([]);
  const [prepared, setPrepared] = useState<PersonInput | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    nameInput.current?.focus();
    return () => activeRequest.current?.abort();
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeRequest.current) return;
    const form = new FormData(event.currentTarget);
    const body: PersonInput = {
      type: form.get("type") as PersonType,
      name: String(form.get("name")).trim(),
      documentType: form.get("documentType") as DocumentType,
      documentNumber: String(form.get("documentNumber")).trim(),
      active: form.get("active") === "true",
    };
    for (const { name } of contactFields)
      body[name] = String(form.get(name)).trim() || null;
    void save(body);
  }

  async function save(body: PersonInput, reviewed = false) {
    if (activeRequest.current) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    setPending(true);
    setError("");
    setMatches([]);
    try {
      if (!reviewed) {
        const duplicates = await peopleApi.duplicates(
          body,
          person?.id,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        if (duplicates.items.length > 0) {
          setMatches(duplicates.items);
          setPrepared(body);
          return;
        }
      }
      const saved = person
        ? await peopleApi.update(person.id, body, controller.signal)
        : await peopleApi.create(body, controller.signal);
      if (!controller.signal.aborted) onSaved(saved);
    } catch (failure) {
      if (controller.signal.aborted) return;
      if (isSessionLost(failure)) onSessionLost();
      else {
        setError(errorMessage(failure));
        if (failure instanceof ApiError && failure.status === 409) {
          try {
            const duplicates = await peopleApi.duplicates(
              body,
              person?.id,
              controller.signal,
            );
            if (!controller.signal.aborted) {
              setMatches(duplicates.items);
              setPrepared(body);
            }
          } catch (retryFailure) {
            if (!controller.signal.aborted && isSessionLost(retryFailure))
              onSessionLost();
          }
        }
      }
    } finally {
      if (!controller.signal.aborted) {
        activeRequest.current = null;
        setPending(false);
      }
    }
  }

  const exactDuplicate =
    prepared &&
    matches.some(
      (match) =>
        match.documentType === prepared.documentType &&
        match.documentNumber.replace(/[^a-z0-9]/gi, "").toUpperCase() ===
          prepared.documentNumber.replace(/[^a-z0-9]/gi, "").toUpperCase(),
    );

  return (
    <section
      className="panel panel-padding editor-panel"
      aria-labelledby="person-editor-title"
    >
      <h2 id="person-editor-title">
        {person ? "Editar persona" : "Nueva persona"}
      </h2>
      <p className="records-description">
        Podés completar contacto y domicilio después del alta. Para confirmar
        una ficha se exigen teléfono y domicilio del titular. Escribí S/N en el
        número si el domicilio no tiene altura. Se buscarán coincidencias antes
        de guardar.
      </p>
      <form
        onSubmit={submit}
        onChange={() => {
          setMatches([]);
          setPrepared(null);
        }}
        aria-busy={pending}
      >
        <fieldset className="form-grid" disabled={pending}>
          <label className="field">
            Tipo de persona
            <select name="type" defaultValue={person?.type ?? "FISICA"}>
              <option value="FISICA">Persona física</option>
              <option value="JURIDICA">Persona jurídica</option>
            </select>
          </label>
          <label className="field">
            Nombre o razón social
            <input
              ref={nameInput}
              name="name"
              defaultValue={person?.name}
              required
              maxLength={180}
            />
          </label>
          <label className="field">
            Tipo de documento
            <select
              name="documentType"
              defaultValue={person?.documentType ?? "DNI"}
            >
              <option>DNI</option>
              <option>CUIT</option>
              <option>CUIL</option>
              <option>PASAPORTE</option>
              <option value="OTRO">Otro</option>
            </select>
          </label>
          <label className="field">
            Número de documento
            <input
              name="documentNumber"
              defaultValue={person?.documentNumber}
              required
              maxLength={30}
            />
          </label>
          {contactFields.map(({ name, label, length }) => (
            <label className="field" key={name}>
              {label}
              <input
                name={name}
                type={
                  name === "email" ? "email" : name === "phone" ? "tel" : "text"
                }
                defaultValue={person?.[name] ?? ""}
                maxLength={length}
              />
            </label>
          ))}
          <label className="field">
            Estado de la persona
            <select name="active" defaultValue={String(person?.active ?? true)}>
              <option value="true">Activa</option>
              <option value="false">Inactiva</option>
            </select>
          </label>
        </fieldset>
        {error && <ErrorNotice>{error}</ErrorNotice>}
        {matches.length > 0 && (
          <section
            className="notice notice-info records-matches"
            aria-label="Personas coincidentes"
          >
            <strong>
              Encontramos personas coincidentes. Revisá sus datos antes de
              continuar.
            </strong>
            <ul>
              {matches.map((match) => (
                <li key={match.id}>
                  <span>
                    {match.name} · {match.documentType} {match.documentNumber} ·{" "}
                    {match.active ? "Activa" : "Inactiva"}
                  </span>
                  <button
                    className="secondary"
                    type="button"
                    disabled={pending}
                    onClick={() => onSelect(match)}
                  >
                    Usar {match.name}
                  </button>
                </li>
              ))}
            </ul>
            {exactDuplicate ? (
              <p>
                Ese documento ya está registrado. Usá la persona existente o
                corregí el documento.
              </p>
            ) : (
              prepared && (
                <button
                  type="button"
                  className="secondary"
                  disabled={pending}
                  onClick={() => void save(prepared, true)}
                >
                  {person
                    ? "Guardar persona diferente"
                    : "Crear persona diferente"}
                </button>
              )
            )}
          </section>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="secondary"
            disabled={pending}
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button type="submit" className="primary" disabled={pending}>
            {pending
              ? "Guardando…"
              : person
                ? "Guardar persona"
                : "Crear persona"}
          </button>
        </div>
      </form>
    </section>
  );
}
