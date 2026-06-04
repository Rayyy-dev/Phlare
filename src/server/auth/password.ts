import argon2 from "argon2";

/**
 * Password hashing.
 *
 * We use argon2id — the current OWASP-recommended, memory-hard algorithm —
 * chosen over bcrypt for its resistance to GPU/ASIC cracking. Parameters below
 * are sensible defaults for an interactive login (≈64 MiB, 3 passes).
 */
const OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 1,
};

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, OPTIONS);
}

export async function verifyPassword(
  hash: string,
  plain: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    // Malformed hash etc. — treat as a failed verification, never throw to caller.
    return false;
  }
}
