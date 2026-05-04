import * as admin from 'firebase-admin'
import { config } from '../config'

let initialized = false

export function initFirebase(): void {
  if (initialized || !config.FIREBASE_SERVICE_ACCOUNT_JSON) return
  try {
    if (!admin.apps.length) {
      const serviceAccount = JSON.parse(
        Buffer.from(config.FIREBASE_SERVICE_ACCOUNT_JSON, 'base64').toString('utf-8')
      ) as admin.ServiceAccount
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
    }
    initialized = true
  } catch (err) {
    // Firebase is optional — dev environments may omit the key
    console.warn('Firebase init skipped:', (err as Error).message)
  }
}

export function getMessaging(): admin.messaging.Messaging | null {
  if (!initialized) return null
  try {
    return admin.messaging()
  } catch {
    return null
  }
}
