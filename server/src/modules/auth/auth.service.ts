import bcrypt from 'bcryptjs';
import { HttpError } from '../../utils/http-error';
import { findUserWithHashByEmail, insertUser, type User } from './users.repository';

/** bcrypt cost factor: 2¹⁰ rounds ≈ 70 ms per hash, slow enough to make brute force expensive. */
const BCRYPT_ROUNDS = 10;

/**
 * Hash compared when the e-mail does not exist, so a wrong e-mail and a wrong password take
 * the same time: an attacker cannot discover which e-mails have an account by timing the response.
 */
const DUMMY_HASH = bcrypt.hashSync('timing-attack-protection', BCRYPT_ROUNDS);

export async function register(input: { name: string; email: string; password: string }): Promise<User> {
  const existing = await findUserWithHashByEmail(input.email);
  if (existing) {
    throw new HttpError(409, 'EMAIL_TAKEN', 'Un compte existe déjà avec cette adresse e-mail.', {
      details: [{ field: 'email', message: 'Cette adresse est déjà utilisée.' }],
    });
  }
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  return insertUser({ name: input.name, email: input.email, passwordHash });
}

export async function login(input: { email: string; password: string }): Promise<User> {
  const found = await findUserWithHashByEmail(input.email);
  const passwordMatches = await bcrypt.compare(input.password, found?.passwordHash ?? DUMMY_HASH);
  if (!found || !passwordMatches) {
    // Same message in both cases, on purpose (no hint about which part is wrong).
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'E-mail ou mot de passe incorrect.');
  }
  return found.user;
}
