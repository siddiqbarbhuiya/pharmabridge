import jwt from 'jsonwebtoken'
import { randomInt } from 'crypto'
import { config } from '../config'
import type { AuthTokenPayload } from '@pharmabridge/types'

type RefreshPayload = { userId: string; jti: string }

// @types/jsonwebtoken uses a branded StringValue for expiresIn — runtime accepts '15m'/'30d' fine.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const signOpts = (expiresIn: string): jwt.SignOptions => ({ expiresIn: expiresIn as any })

export function signAccessToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload as object, config.JWT_ACCESS_SECRET, signOpts(config.JWT_ACCESS_EXPIRES_IN))
}

export function signRefreshToken(userId: string): { token: string; jti: string } {
  const jti   = `${userId}:${randomInt(100_000, 999_999)}:${Date.now()}`
  const token = jwt.sign({ userId, jti }, config.JWT_REFRESH_SECRET, signOpts(config.JWT_REFRESH_EXPIRES_IN))
  return { token, jti }
}

export function verifyRefreshToken(token: string): RefreshPayload {
  return jwt.verify(token, config.JWT_REFRESH_SECRET) as RefreshPayload
}

/** Cryptographically random 6-digit OTP */
export function generateOtp(): string {
  return randomInt(100_000, 1_000_000).toString()
}
