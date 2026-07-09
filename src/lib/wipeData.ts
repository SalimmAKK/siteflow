import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

export async function wipeAllData() {
  const collections = ['projects', 'tasks', 'events', 'activities', 'users'];
  
  for (const collectionName of collections) {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const batch = writeBatch(db);
    
    querySnapshot.forEach((document) => {
      batch.delete(doc(db, collectionName, document.id));
    });
    
    await batch.commit();
    console.log(`Deleted all documents in ${collectionName}`);
  }
}
