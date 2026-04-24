import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";

import type { PickedFile } from "../../utils/pickers";
import { app } from "./config";

const storage = getStorage(app);

function getFileExtension(fileName: string) {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop() : "jpg";
}

export async function uploadFileToStorage(
  file: PickedFile,
  pathPrefix: string,
) {
  const response = await fetch(file.uri);
  const blob = await response.blob();
  const extension = getFileExtension(file.name);
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const storageRef = ref(storage, `${pathPrefix}/${safeName}`);

  await uploadBytes(storageRef, blob, {
    contentType: file.mimeType ?? undefined,
  });

  const downloadUrl = await getDownloadURL(storageRef);

  return {
    ...file,
    downloadUrl,
    storagePath: storageRef.fullPath,
  };
}
