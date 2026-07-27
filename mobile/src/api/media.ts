import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { api } from './client';

// Evidence captured on the device and hosted by the API. `url` is what gets stored as a
// signal's evidence_url; `kind` drives how the detail screen renders it.
export type Evidence = { url: string; kind: 'photo' | 'voice'; filename?: string };

/** Launch the camera or photo library and return the selected image as base64 (or null if cancelled). */
export async function pickPhoto(source: 'camera' | 'library'): Promise<{ base64: string; mime: string } | null> {
  const perm = source === 'camera'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error(source === 'camera' ? 'Camera access is needed to take a photo.' : 'Photo access is needed to attach an image.');
  }
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, base64: true };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  const asset = res.canceled ? undefined : res.assets?.[0];
  if (!asset?.base64) return null;
  return { base64: asset.base64, mime: asset.mimeType || 'image/jpeg' };
}

/** Read a recorded file (file:// uri) to base64 for upload. */
export function fileToBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

/** Upload base64 media to the API and return the hosted evidence reference. */
export async function uploadMedia(base64: string, mime: string): Promise<Evidence> {
  const kind: Evidence['kind'] = mime.startsWith('audio') ? 'voice' : 'photo';
  const data = await api.post<{ url: string; filename: string }>('/pulses/media', { data: base64, mime });
  return { url: data.url, filename: data.filename, kind };
}

export const isImageUrl = (u?: string) => !!u && /\.(jpg|jpeg|png|heic|webp|gif)$/i.test(u);
export const isAudioUrl = (u?: string) => !!u && /\.(m4a|mp3|wav|webm|aac)$/i.test(u);
