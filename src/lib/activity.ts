import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export type ActivityAction = 'created' | 'updated' | 'deleted' | 'completed';
export type ActivityType = 'project' | 'task' | 'event';

export async function logActivity(
  action: ActivityAction,
  type: ActivityType,
  targetName: string,
  userId: string,
  userName?: string
) {
  const name = userName || 'Someone';
  const description = `${name} ${action} ${type} "${targetName}"`;

  try {
    await addDoc(collection(db, 'activities'), {
      action,
      type,
      targetName,
      userId,
      userName: name,
      description,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

