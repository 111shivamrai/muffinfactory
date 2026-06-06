import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "muffin-factory", // wait, what is the projectId?
};
// I don't have the config here easily without reading firebaseConfig from the source.
