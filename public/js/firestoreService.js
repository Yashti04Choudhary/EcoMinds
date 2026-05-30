// firestore.js
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase.js";

export async function addUser(uid, email) {
  const userRef = doc(db, "users", uid);

  try {
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
      // Only add user if doc doesn't exist
      await setDoc(userRef, {
        email: email,
        points: 0,
        badges: [],
        pickups: [],
        isAdmin: false
      });
      console.log("✅ Firestore: New user created");
    } else {
      console.log("ℹ️ Firestore: User already exists");
    }
  } catch (error) {
    console.error("❌ Firestore error (addUser):", error);
  }
}

export async function updateUserPoints(uid, points) {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, { points: points });
    console.log("Points updated!");
  } catch (error) {
    console.error("Error updating points:", error);
  }
}

export async function getUser(uid) {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      console.log("User data:", docSnap.data());
      return docSnap.data();
    } else {
      console.log("No such user!");
      return null;
    }
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
}
