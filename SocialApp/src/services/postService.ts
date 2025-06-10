import { storage, db } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, getDocs, query, where, orderBy } from "firebase/firestore";

export const createPost = async (
  mainImageUri: string,
  frontImageUri: string,
  caption: string,
  authorName: string,
  authorId: string,
  groupId: string
): Promise<any> => {
  try {
    console.log("📤 Starting post creation...");

    // Upload main image
    const mainImageResponse = await fetch(mainImageUri);
    const mainImageBlob = await mainImageResponse.blob();
    const mainImageRef = ref(storage, `posts/${groupId}/${Date.now()}_main.jpg`);
    await uploadBytes(mainImageRef, mainImageBlob);
    const mainImageUrl = await getDownloadURL(mainImageRef);

    // Upload front image
    const frontImageResponse = await fetch(frontImageUri);
    const frontImageBlob = await frontImageResponse.blob();
    const frontImageRef = ref(storage, `posts/${groupId}/${Date.now()}_front.jpg`);
    await uploadBytes(frontImageRef, frontImageBlob);
    const frontImageUrl = await getDownloadURL(frontImageRef);

    // Create post document
    const postRef = await addDoc(collection(db, "posts"), {
      imageUrl: mainImageUrl,
      frontImageUrl: frontImageUrl,
      caption,
      authorName,
      authorId,
      groupId,
      createdAt: new Date(),
    });

    console.log("✅ Post created successfully:", postRef.id);
    return postRef;
  } catch (error) {
    console.error("❌ Error creating post:", error);
    throw error;
  }
};

export const getGroupPosts = async (groupId: string) => {
  try {
    const postsQuery = query(
      collection(db, "posts"),
      where("groupId", "==", groupId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(postsQuery);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("❌ Error getting group posts:", error);
    throw error;
  }
};
