export interface KnownPhAntecedentInput {
  /** Precisión conocida: YYYY-MM o YYYY-MM-DD. */
  testDate?: string | null;
  expiresOn?: string | null;
  crpcId?: string | null;
  result?: "APROBADO" | "RECHAZADO" | null;
  certificateNumber?: string | null;
}
export interface KnownStickerAntecedentInput {
  number?: string | null;
  enabledOn?: string | null;
  expiresOn?: string | null;
}
export type KnownPhAntecedent = Required<KnownPhAntecedentInput>;
export type KnownStickerAntecedent = Required<KnownStickerAntecedentInput>;
export interface InitialEquipmentSurveyInput {
  idempotencyKey: string;
  regulatorId: string;
  pairs: {
    position: number;
    cylinderId: string;
    valveId: string;
    ph?: KnownPhAntecedentInput | null;
  }[];
  sticker?: KnownStickerAntecedentInput | null;
  notes?: string | null;
}
export interface InitialEquipmentSurvey {
  configurationId: string;
  vehicleId: string;
  recordedAt: string;
  recordedBy: string;
  regulatorId: string;
  pairs: {
    position: number;
    cylinderId: string;
    valveId: string;
    ph: KnownPhAntecedent | null;
  }[];
  sticker: KnownStickerAntecedent | null;
  notes: string | null;
}
