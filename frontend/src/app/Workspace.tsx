import { useState, type ReactNode } from "react";
import type { Person, SessionUser } from "@cilgas/contracts";
import { Brand, Icon } from "../shared/ui";
import { initials, roleName } from "../shared/format";
import { Logout } from "../features/auth/Logout";
import { Home } from "../features/home/Home";
import { Users } from "../features/users/Users";
import { Audit } from "../features/audit/Audit";
import { Settings } from "../features/settings/Settings";
import { People } from "../features/people/People";
import { Vehicles } from "../features/vehicles/Vehicles";
import { Components } from "../features/components/Components";
import { Catalog } from "../features/catalog/Catalog";
import { Suppliers } from "../features/suppliers/Suppliers";

const navigation = [
  { id: "home", label: "Inicio", icon: "home", permission: null },
  {
    id: "people",
    label: "Personas",
    icon: "users",
    permission: "personas.gestionar",
  },
  {
    id: "vehicles",
    label: "Vehículos",
    icon: "workshop",
    permission: "personas.gestionar",
  },
  {
    id: "settings",
    label: "Configuración",
    icon: "shield",
    permission: "personas.gestionar",
  },
  {
    id: "components",
    label: "Componentes",
    icon: "workshop",
    permission: "personas.gestionar",
  },
  {
    id: "catalog",
    label: "Catálogo",
    icon: "audit",
    permission: "catalogo.consultar",
  },
  {
    id: "suppliers",
    label: "Proveedores",
    icon: "users",
    permission: "catalogo.administrar",
  },
  {
    id: "users",
    label: "Usuarios",
    icon: "users",
    permission: "usuarios.administrar",
  },
  {
    id: "audit",
    label: "Auditoría",
    icon: "audit",
    permission: "auditoria.consultar",
  },
] as const;
type Page = (typeof navigation)[number]["id"];
const dateFormat = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  timeZone: "America/Argentina/Buenos_Aires",
});

interface WorkspaceProps {
  user: SessionUser;
  themeControl: ReactNode;
  onSessionLost: () => void;
  onUserUpdated: (user: SessionUser) => void;
  onLogout: (expired: boolean) => void;
}

interface PageContentProps extends Pick<
  WorkspaceProps,
  "user" | "onSessionLost" | "onUserUpdated"
> {
  page: Page;
  onNavigate: (page: Page) => void;
  vehiclePerson?: Person;
  onOpenVehicles: (person: Person) => void;
}

function PageContent({
  page,
  user,
  onNavigate,
  onSessionLost,
  onUserUpdated,
  vehiclePerson,
  onOpenVehicles,
}: PageContentProps) {
  if (user.permissions.includes("personas.gestionar")) {
    if (page === "people")
      return (
        <People onSessionLost={onSessionLost} onOpenVehicles={onOpenVehicles} />
      );
    if (page === "vehicles")
      return (
        <Vehicles
          key={vehiclePerson?.id ?? "all"}
          person={vehiclePerson}
          onSessionLost={onSessionLost}
        />
      );
    if (page === "settings")
      return <Settings user={user} onSessionLost={onSessionLost} />;
    if (page === "components")
      return <Components onSessionLost={onSessionLost} />;
  }
  if (page === "catalog" && user.permissions.includes("catalogo.consultar"))
    return (
      <Catalog
        editable={user.permissions.includes("catalogo.administrar")}
        onSessionLost={onSessionLost}
      />
    );
  if (page === "suppliers" && user.permissions.includes("catalogo.administrar"))
    return <Suppliers onSessionLost={onSessionLost} />;
  if (page === "users" && user.permissions.includes("usuarios.administrar"))
    return (
      <Users
        currentUser={user}
        onUserUpdated={onUserUpdated}
        onSessionLost={onSessionLost}
      />
    );
  if (page === "audit" && user.permissions.includes("auditoria.consultar"))
    return <Audit currentUser={user} onSessionLost={onSessionLost} />;
  return <Home user={user} onNavigate={onNavigate} />;
}

export function Workspace({
  user,
  themeControl,
  onSessionLost,
  onUserUpdated,
  onLogout,
}: WorkspaceProps) {
  const [page, setPage] = useState<Page>("home");
  const [vehiclePerson, setVehiclePerson] = useState<Person>();
  function navigate(next: Page) {
    setVehiclePerson(undefined);
    setPage(next);
  }
  const availablePages = navigation.filter(
    (entry) =>
      entry.permission === null || user.permissions.includes(entry.permission),
  );
  return (
    <div className="workspace">
      <a className="skip-link" href="#main-content">
        Ir al contenido
      </a>
      <aside className="sidebar">
        <Brand />
        <div className="nav-label">Espacio de trabajo</div>
        <nav aria-label="Navegación principal">
          {availablePages.map((entry) => (
            <button
              key={entry.id}
              className="nav-button"
              aria-current={page === entry.id ? "page" : undefined}
              onClick={() => navigate(entry.id)}
            >
              <Icon name={entry.icon} />
              {entry.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="session-mini">
            <span className="avatar">{initials(user.name)}</span>
            <div>
              <strong>{user.name}</strong>
              <small>{roleName(user.role)}</small>
            </div>
          </div>
          <Logout onLogout={onLogout} />
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <div className="breadcrumb">
            Taller<span aria-hidden="true">/</span>
            <strong>
              {navigation.find((entry) => entry.id === page)?.label}
            </strong>
          </div>
          <div className="topbar-tools">
            <span className="today">{dateFormat.format(new Date())}</span>
            {themeControl}
          </div>
        </header>
        <main className="content" id="main-content">
          <PageContent
            page={page}
            user={user}
            onNavigate={navigate}
            vehiclePerson={vehiclePerson}
            onOpenVehicles={(person) => {
              setVehiclePerson(person);
              setPage("vehicles");
            }}
            onSessionLost={onSessionLost}
            onUserUpdated={onUserUpdated}
          />
        </main>
      </div>
    </div>
  );
}
