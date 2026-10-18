/** Delivery address validation (client accounts). */
import { ValidationError } from "@/lib/errors";
import { cleanText, isPhone } from "@/lib/sanitize";

/** Kept as an alias: address validation errors are plain validation errors. */
export const AddressError = ValidationError;

export type AddressInput = {
  name: string;
  phone: string;
  country: string;
  city: string;
  line: string;
  zip: string | null;
  isDefault: boolean;
};

const s = cleanText;

export function parseAddress(body: Record<string, unknown>): AddressInput {
  const a = {
    name: s(body.name, 80),
    phone: s(body.phone, 30),
    country: s(body.country, 60) || "Côte d'Ivoire",
    city: s(body.city, 60),
    line: s(body.line, 200),
    zip: s(body.zip, 20) || null,
    isDefault: body.isDefault === true,
  };
  if (a.name.length < 2) throw new AddressError("Indiquez le nom du destinataire.");
  if (!isPhone(a.phone)) throw new AddressError("Numéro de téléphone invalide.");
  if (a.city.length < 2) throw new AddressError("Indiquez la ville.");
  if (a.line.length < 4) throw new AddressError("Indiquez l'adresse (quartier, rue, repère).");
  return a;
}

export const MAX_ADDRESSES = 10;
