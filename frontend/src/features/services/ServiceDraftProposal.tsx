import type { Dispatch, SetStateAction } from "react";
import { ServiceItemEditor, type EditableItem } from "./ServiceItemEditor";

export function ServiceDraftProposal({
  items,
  setItems,
  canViewCosts,
  pending,
  onSessionLost,
}: {
  items: EditableItem[];
  setItems: Dispatch<SetStateAction<EditableItem[]>>;
  canViewCosts: boolean;
  pending: boolean;
  onSessionLost: () => void;
}) {
  return (
    <section aria-label="Propuesta comercial">
      {" "}
      <h3>Propuesta comercial del borrador</h3>
      <p className="records-description">
        Los ajustes quedan en este borrador. El total acordado se puede preparar
        aunque todavía no coincida con los renglones.
      </p>
      {items.map((item, index) => (
        <ServiceItemEditor
          key={item.key}
          item={item}
          index={index}
          canViewCosts={canViewCosts}
          disabled={pending}
          onSessionLost={onSessionLost}
          onChange={(next) =>
            setItems((current) =>
              current.map((entry) => (entry.key === item.key ? next : entry)),
            )
          }
          onRemove={() =>
            setItems((current) =>
              current.filter((entry) => entry.key !== item.key),
            )
          }
        />
      ))}
      <button
        type="button"
        className="secondary"
        onClick={() =>
          setItems((current) => [
            ...current,
            {
              key: crypto.randomUUID(),
              order: current.length + 1,
              description: "",
              type: "OTRO",
              quantity: "1",
              unitPrice: "0",
              discount: "0",
            },
          ])
        }
      >
        Agregar ítem
      </button>
    </section>
  );
}
