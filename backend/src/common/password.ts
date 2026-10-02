import { argon2id, hash, verify } from "argon2";

export const hashPassword = (password: string) =>
  hash(password, {
    type: argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });

export const verifyPassword = (digest: string, password: string) =>
  verify(digest, password);
