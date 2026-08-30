cat << 'INNER_EOF' >> src/services/firestoreService.ts

export async function deleteUserStatus(statusId: string): Promise<void> {
  const statusRef = doc(db, 'statuses', statusId);
  await deleteDoc(statusRef);
}

export async function toggleLikeStatus(statusId: string, userId: string): Promise<void> {
  const statusRef = doc(db, 'statuses', statusId);
  const statusSnap = await getDoc(statusRef);
  
  if (statusSnap.exists()) {
    const data = statusSnap.data();
    const likes = data.likes || [];
    
    if (likes.includes(userId)) {
      await updateDoc(statusRef, {
        likes: arrayRemove(userId)
      });
    } else {
      await updateDoc(statusRef, {
        likes: arrayUnion(userId)
      });
    }
  }
}

export async function markStatusAsViewed(statusId: string, userId: string): Promise<void> {
  const statusRef = doc(db, 'statuses', statusId);
  const statusSnap = await getDoc(statusRef);
  
  if (statusSnap.exists()) {
    const data = statusSnap.data();
    // Only update if not already viewed to save writes
    if (!data.views?.includes(userId)) {
      await updateDoc(statusRef, {
        views: arrayUnion(userId)
      });
    }
  }
}
INNER_EOF
