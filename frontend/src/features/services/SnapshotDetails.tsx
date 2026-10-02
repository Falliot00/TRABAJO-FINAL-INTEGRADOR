import type { SnapshotValue } from "@cilgas/contracts";
import { workshopInstant } from "../../shared/format";

const labels: Record<string, string> = {
  documento: "Documento",
  numero: "Número",
  plantillaVersion: "Versión de plantilla",
  emitidaEn: "Emitida el",
  observaciones: "Observaciones",
  servicio: "Servicio",
  fecha: "Fecha",
  descripcion: "Descripción",
  tipoComercial: "Tipo de servicio",
  operacionCodigo: "Código de operación",
  operacionDescripcion: "Operación",
  incluyePH: "Incluye PH",
  habilitacion: "Habilitación",
  vencimiento: "Vencimiento informado",
  obleaAnterior: "Oblea anterior",
  obleaNueva: "Oblea nueva",
  pec: "PEC",
  taller: "Taller",
  titular: "Titular",
  contacto: "Contacto",
  pagador: "Pagador",
  nombreRazonSocial: "Nombre / razón social",
  documentoTipo: "Tipo de documento",
  documentoNumero: "Número de documento",
  calle: "Calle",
  pisoDepto: "Piso / departamento",
  localidad: "Localidad",
  provincia: "Provincia",
  codigoPostal: "Código postal",
  telefono: "Teléfono",
  codigo: "Código",
  nombre: "Nombre",
  cuit: "CUIT",
  domicilio: "Domicilio",
  responsableTecnico: "Responsable técnico",
  matriculaResponsable: "Matrícula del responsable",
  vehiculo: "Vehículo",
  dominio: "Dominio",
  marca: "Marca",
  modelo: "Modelo",
  motorNumero: "Número de motor",
  chasisNumero: "Número de chasis",
  tipo: "Tipo",
  tipoOtroDetalle: "Detalle de tipo",
  uso: "Uso",
  anio: "Año",
  inyeccion: "Inyección",
  reguladores: "Reguladores",
  cilindros: "Cilindros",
  valvulas: "Válvulas",
  accesorios: "Accesorios",
  renglon: "Renglón",
  codigoHomologacion: "Código de homologación",
  numeroSerie: "Número de serie",
  condicion: "Condición",
  accion: "Marca documental",
  fabricacionMes: "Mes de fabricación",
  revisionMes: "Mes de revisión",
  crpcCodigo: "Código de CRPC",
  revisionesPH: "Resultados de PH",
  cilindroCodigo: "Código del cilindro",
  cilindroSerie: "Serie del cilindro",
  fechaEnsayo: "Fecha de ensayo",
  venceEl: "Vencimiento informado",
  resultado: "Resultado",
  numeroCertificado: "Número de certificado",
  firmantes: "Firmantes",
  rectificacion: "Rectificación",
  service: "Servicio",
  description: "Descripción",
  type: "Tipo",
  serviceDate: "Fecha del servicio",
  sheetOperation: "Operación de ficha",
  includesPh: "Incluye PH",
  people: "Personas del servicio",
  person: "Persona",
  role: "Función",
  name: "Nombre",
  documentType: "Tipo de documento",
  documentNumber: "Documento",
  taxId: "CUIT",
  vehicle: "Vehículo",
  plate: "Dominio",
  brand: "Marca",
  model: "Modelo",
  year: "Año",
  chassisNumber: "Chasis",
  engineNumber: "Motor",
  fuelType: "Combustible",
  workshop: "Taller",
  legalName: "Razón social",
  tradeName: "Nombre comercial",
  address: "Dirección",
  phone: "Teléfono",
  email: "Correo",
  city: "Localidad",
  province: "Provincia",
  postalCode: "Código postal",
  actors: "Actores regulatorios",
  registrationCode: "Matrícula",
  registrationNumber: "Matrícula",
  preparation: "Preparación documental",
  previousSticker: "Oblea anterior",
  newSticker: "Oblea nueva",
  enabledOn: "Habilitación informada",
  expiresOn: "Vencimiento informado",
  notes: "Observaciones",
  pecId: "PEC registrado",
  tdmId: "TdM registrado",
  interventions: "Intervenciones y resultados",
  row: "Renglón",
  componentId: "Componente",
  homologationCode: "Código de homologación",
  serialNumber: "Número de serie",
  condition: "Condición",
  action: "Acción registrada",
  finalPosition: "Posición final",
  manufactureMonth: "Mes de fabricación",
  revisionMonth: "Mes de revisión",
  crpcId: "CRPC registrado",
  performsPh: "Ensayo PH",
  testDate: "Fecha de ensayo",
  revisionExpiresOn: "Vencimiento de revisión",
  phResult: "Resultado PH",
  certificateNumber: "Certificado",
  configuration: "Configuración del equipo",
  components: "Componentes",
  position: "Posición",
  issuedBy: "Emitida por",
  signatures: "Firmas",
  requiredBy: "Requisito respaldado",
  spaces: "Espacios de firma",
  regulatoryEvidence: "Validación regulatoria",
  source: "Fuente",
  version: "Versión",
  id: "Identificador",
  active: "Activo",
  createdAt: "Alta",
  updatedAt: "Actualización",
};
const values: Record<string, string> = {
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
  TITULAR: "Titular",
  CONTACTO: "Contacto",
  PAGADOR: "Pagador",
  CILINDRO: "Cilindro",
  VALVULA: "Válvula",
  REGULADOR: "Regulador",
  ACCESORIO: "Accesorio",
  REVISION_ANUAL: "Revisión anual",
  REVISION_QUINQUENAL: "Revisión quinquenal",
};

export function SnapshotDetails({
  value,
  field,
}: {
  value: SnapshotValue;
  field?: string;
}) {
  if (value === null) return <span>Sin informar</span>;
  if (field === "emitidaEn" && typeof value === "string")
    return <span>{workshopInstant(value)}</span>;
  if (typeof value === "boolean") return <span>{value ? "Sí" : "No"}</span>;
  if (typeof value !== "object")
    return <span>{values[String(value)] ?? String(value)}</span>;
  if (Array.isArray(value))
    return value.length === 0 ? (
      <span>Sin registros</span>
    ) : (
      <ul className="snapshot-list">
        {value.map((entry) => (
          <li key={JSON.stringify(entry)}>
            <SnapshotDetails value={entry} />
          </li>
        ))}
      </ul>
    );
  return (
    <dl className="snapshot-details">
      {Object.entries(value).map(([key, entry]) => (
        <div key={key}>
          <dt>{labels[key] ?? key.replace(/([a-z])([A-Z])/g, "$1 $2")}</dt>
          <dd>
            <SnapshotDetails value={entry} field={key} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
