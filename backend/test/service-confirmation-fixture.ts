import type { INestApplication } from "@nestjs/common";
import type { Component, ServiceDraft } from "@cilgas/contracts";
import { signedIn } from "./session";

/** Synthetic external validation; never a regulatory policy or an HTTP bypass. */
export const syntheticRegulatoryValidation = {
  assess: async () => ({
    blockers: [],
    evidence: { source: "TEST_ONLY_SYNTHETIC", version: "fixture-1" },
    document: {
      operationDescription: "Operación sintética de prueba",
      signers: [
        {
          rol: "TECNICO",
          nombre: "Responsable sintético",
          matricula: "SYN",
          requiereEspacioFirma: true,
        },
      ],
    },
  }),
};

export async function prepareConfirmation(
  app: INestApplication,
  number: number,
  sharedComponent?: Component,
) {
  const admin = await signedIn(app);
  const person = (
    await admin.agent
      .post("/api/people")
      .set(admin.headers)
      .send({
        type: "FISICA",
        name: `Titular sintético ${number}`,
        documentType: "DNI",
        documentNumber: `45000${number}`,
        street: "Calle sintética",
        streetNumber: "123",
        locality: "Rosario",
        province: "Santa Fe",
        postalCode: "2000",
        phone: "3410000000",
      })
      .expect(201)
  ).body;
  const vehicle = (
    await admin.agent
      .post("/api/vehicles")
      .set(admin.headers)
      .send({
        plate: `CZ${number}AA`,
        brand: "Marca sintética",
        model: "Modelo sintético",
        year: 2020,
        engineNumber: `MOTOR-${number}`,
        chassisNumber: `CHASIS-${number}`,
        type: "PARTICULAR",
        usage: "PARTICULAR",
        injection: true,
      })
      .expect(201)
  ).body;
  await admin.agent
    .post(`/api/vehicles/${vehicle.id}/relationships`)
    .set(admin.headers)
    .send({ personId: person.id, role: "TITULAR", from: "2026-01-01" })
    .expect(201);
  const actors: Record<string, string> = {};
  for (const type of ["TDM", "PEC", "CRPC"]) {
    const actor = (
      await admin.agent
        .post("/api/regulatory-actors")
        .set(admin.headers)
        .send({
          type,
          code: `SYN-${type}-${number}`,
          name: `${type} sintético ${number}`,
          cuit: "20123456786",
          address: "Dirección sintética 123",
          locality: "Rosario",
          phone: "3410000000",
          technicalResponsible: `Responsable sintético ${type}`,
          responsibleLicense: `MATRICULA-SYN-${number}`,
        })
        .expect(201)
    ).body;
    actors[type] = actor.id;
  }
  await admin.agent
    .patch("/api/workshop")
    .set(admin.headers)
    .send({
      name: "Taller sintético",
      cuit: "20123456786",
      address: "Calle sintética 123",
      locality: "Rosario",
      province: "Santa Fe",
      phone: "3410000000",
      tdmId: actors.TDM,
    })
    .expect(200);
  let component = sharedComponent;
  if (!component) {
    const model = (
      await admin.agent
        .post("/api/component-models")
        .set(admin.headers)
        .send({
          type: "CILINDRO",
          homologationCode: `CIL-SYN-${number}`,
          brand: "Marca sintética",
          model: "Modelo sintético",
          capacityLiters: "60",
        })
        .expect(201)
    ).body;
    component = (
      await admin.agent
        .post("/api/components")
        .set(admin.headers)
        .send({
          modelId: model.id,
          type: "CILINDRO",
          serialNumber: `SERIE-SYN-${number}`,
          manufactureMonth: "2020-01",
        })
        .expect(201)
    ).body as Component;
  }
  const equipment: Component[] = [];
  for (const type of ["REGULADOR", "VALVULA"] as const) {
    const model = (
      await admin.agent
        .post("/api/component-models")
        .set(admin.headers)
        .send({
          type,
          homologationCode: `${type}-SYN-${number}`,
        })
        .expect(201)
    ).body;
    equipment.push(
      (
        await admin.agent
          .post("/api/components")
          .set(admin.headers)
          .send({
            type,
            modelId: model.id,
            serialNumber: `${type}-SYN-${number}`,
          })
          .expect(201)
      ).body,
    );
  }
  const supplier = (
    await admin.agent
      .post("/api/suppliers")
      .set(admin.headers)
      .send({ name: `Proveedor sintético ${number}` })
      .expect(201)
  ).body;
  const offer = (
    await admin.agent
      .post("/api/catalog-services")
      .set(admin.headers)
      .send({
        code: `CONFIRM-SYN-${number}`,
        name: `Conversión sintética ${number}`,
        description: "Fixture sin validez regulatoria",
        type: "CONVERSION",
        suggestedPrice: "100.00",
        items: [],
      })
      .expect(201)
  ).body;
  const created = (
    await admin.agent
      .post("/api/service-drafts")
      .set(admin.headers)
      .send({
        vehicleId: vehicle.id,
        catalogOfferId: offer.id,
        serviceDate: "2026-10-02",
      })
      .expect(201)
  ).body;
  const draft = (
    await admin.agent
      .patch(`/api/service-drafts/${created.id}`)
      .set(admin.headers)
      .send({
        version: 1,
        sheetOperation: "C",
        includesPh: true,
        phReason: "CONVERSION",
        totalAmount: "100.00",
        people: [{ role: "TITULAR", personId: person.id }],
        items: [
          {
            order: 1,
            description: "Instalación sintética",
            type: "COMPONENTE",
            componentId: component.id,
            action: "INSTALAR",
            quantity: "1",
            unitPrice: "100.00",
            discount: "0",
            costs: [
              {
                supplierId: supplier.id,
                concept: "Costo externo histórico",
                treatment: "PROVEEDOR",
                amount: "20.20",
              },
              {
                concept: "Costo absorbido histórico",
                treatment: "ABSORBIDO",
                amount: "5.00",
              },
            ],
          },
          ...equipment.map((item, index) => ({
            order: index + 2,
            description: `Instalación ${item.type}`,
            type: "COMPONENTE",
            componentId: item.id,
            action: "INSTALAR",
            quantity: "1",
            unitPrice: "0",
            discount: "0",
            costs: [],
          })),
        ],
        preparation: {
          pecId: actors.PEC,
          tdmId: actors.TDM,
          newSticker: `OBLEA-SYN-${number}`,
          enabledOn: "2026-10-02",
          expiresOn: "2027-10-31",
        },
        interventions: [
          {
            type: "CILINDRO",
            row: 1,
            componentId: component.id,
            homologationCode: component.model.homologationCode,
            serialNumber: component.serialNumber,
            condition: "USADO",
            action: "M",
            finalPosition: 1,
            manufactureMonth: "2020-01",
            revisionMonth: "2026-10",
            crpcId: actors.CRPC,
            performsPh: true,
            testDate: "2026-10-01",
            revisionExpiresOn: "2031-10-31",
            phResult: "APROBADO",
            certificateNumber: `CERT-SYN-${number}`,
          },
          ...equipment.map((item) => ({
            type: item.type,
            row: 1,
            componentId: item.id,
            cylinderId: item.type === "VALVULA" ? component.id : null,
            homologationCode: item.model.homologationCode,
            serialNumber: item.serialNumber,
            condition: "USADO",
            action: "M",
            finalPosition: 1,
            performsPh: false,
          })),
        ],
      })
      .expect(200)
  ).body as ServiceDraft;
  return {
    admin,
    draft,
    vehicleId: vehicle.id as string,
    personId: person.id as string,
    supplierId: supplier.id as string,
    offerId: offer.id as string,
    component,
    regulator: equipment[0]!,
    valve: equipment[1]!,
    actors,
  };
}
