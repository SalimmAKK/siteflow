import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubFirestore: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      // Clean up previous Firestore listener when auth state changes
      if (unsubFirestore) {
        unsubFirestore();
        unsubFirestore = null;
      }

      if (firebaseUser) {
        // Subscribe to real-time user document updates
        const userRef = doc(db, 'users', firebaseUser.uid);
        unsubFirestore = onSnapshot(userRef, (snapshot) => {
          if (snapshot.exists()) {
            setUser({ uid: firebaseUser.uid, ...snapshot.data() } as User);
          } else {
            // Firestore doc doesn't exist yet (mid-registration)
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'User',
              role: 'member',
            });
          }
          setLoading(false);
        }, (error) => {
          console.error('Error listening to user document:', error);
          // Fallback to basic auth info
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'User',
            role: 'member',
          });
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubFirestore) {
        unsubFirestore();
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
