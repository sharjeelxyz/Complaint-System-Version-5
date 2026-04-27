// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCyTbBGFH39SEyQyqA6_jt7gyhkTSW4leU",
  authDomain: "cms-version-2-c5c5a.firebaseapp.com",
  projectId: "cms-version-2-c5c5a",
  storageBucket: "cms-version-2-c5c5a.firebasestorage.app",
  messagingSenderId: "398432426520",
  appId: "1:398432426520:web:124202a41ec9c65c76816d"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);

export default app;
