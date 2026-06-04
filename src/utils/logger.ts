import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { SystemLog } from '../types';

/**
 * Centrally registers and uploads any client-side crash or simulation error
 * to the Firestore `/system_logs` repository for the Super Admin to review.
 */
export async function logSystemError(
  errorMessage: string, 
  component: string, 
  severity: 'warning' | 'error' | 'fatal' = 'error',
  sessionId?: string
) {
  try {
    const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logData: Omit<SystemLog, 'id'> = {
      timestamp: new Date().toISOString(),
      errorMessage,
      severity,
      component,
      userEmail: auth.currentUser?.email || 'unauthenticated_visitor',
      sessionId: sessionId || 'none'
    };

    // Use a background call to avoid blocking the UI thread
    setDoc(doc(db, 'system_logs', logId), logData).catch(err => {
      console.warn('Logging transmission deferred: ', err);
    });
  } catch (error) {
    console.error('Fatal crash on secondary log transmission: ', error);
  }
}
