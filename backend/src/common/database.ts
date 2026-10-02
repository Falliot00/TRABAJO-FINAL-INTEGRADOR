import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

export function createDatabase(connectionString: string) {
  const url = new URL(connectionString);
  const schema = url.searchParams.get("schema") ?? "public";
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema))
    throw new Error("Esquema PostgreSQL no válido.");
  url.searchParams.delete("schema");
  return new PrismaClient({
    adapter: new PrismaPg(
      { connectionString: url.toString(), options: `-c search_path=${schema}` },
      { schema },
    ),
  });
}
