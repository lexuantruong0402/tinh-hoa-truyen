import { db, auth } from "@/src/lib/firebase";
import {
  serverTimestamp,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
  getDoc,
  collection,
} from "firebase/firestore";
import { OperationType, FirestoreErrorInfo, ReadingHistory } from "@/src/types";

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error Detailed Context: ", JSON.stringify(errInfo));
  return errInfo.error;
}

export async function fetchReadingHistory(userId: string): Promise<ReadingHistory[]> {
  const path = "reading_history";
  try {
    const q = query(collection(db, path), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    const historyItems = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ReadingHistory[];

    historyItems.sort((a, b) => {
      const timeA = (a.updatedAt || a.createdAt)?.toMillis?.() || 0;
      const timeB = (b.updatedAt || b.createdAt)?.toMillis?.() || 0;
      return timeB - timeA;
    });

    return historyItems;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

export async function saveReadingHistoryRecord(
  storyTitle: string,
  currentUrl: string,
  userId: string,
  parseReadingInfoFn: (url: string, title: string) => { storyName: string; chapterName: string; sourceHost: string },
) {
  if (!storyTitle || !currentUrl) return;

  const { storyName, chapterName, sourceHost } = parseReadingInfoFn(currentUrl, storyTitle);

  const storySlug = storyName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .substring(0, 100);
  const historyDocId = `${userId}_${storySlug}`;

  try {
    const docRef = doc(db, "reading_history", historyDocId);
    const docSnap = await getDoc(docRef).catch(() => null);

    if (docSnap && docSnap.exists()) {
      const existingData = docSnap.data();
      await setDoc(docRef, {
        storyName,
        chapterName,
        url: currentUrl,
        sourceHost,
        userId,
        createdAt: existingData.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        storyName,
        chapterName,
        url: currentUrl,
        sourceHost,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `reading_history/${historyDocId}`);
  }
}

export async function deleteReadingHistoryItem(id: string) {
  const path = `reading_history/${id}`;
  try {
    await deleteDoc(doc(db, "reading_history", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}