import { initializeApp } from 'firebase/app'
import { connectDatabaseEmulator, getDatabase } from 'firebase/database'
import { firebaseConfig } from './config'

const app = initializeApp(firebaseConfig)

export const db = getDatabase(app)

const useEmulator =
  import.meta.env.DEV || new URLSearchParams(window.location.search).get('emulator') === '1'
if (useEmulator) {
  connectDatabaseEmulator(db, 'localhost', 9001)
}
