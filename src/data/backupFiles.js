/**
 * Entrée / sortie des fichiers de sauvegarde, par plateforme.
 *
 * - Mobile : le JSON est écrit dans le cache de l'app puis proposé via la feuille
 *   de partage (Drive, Fichiers, mail…). La restauration passe par le sélecteur
 *   de documents du système.
 * - Web : téléchargement du fichier ; restauration via le sélecteur de fichier
 *   du navigateur (expo-document-picker le gère aussi sur web).
 */
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { createSnapshot, serializeSnapshot, getBackupFileName } from './backupService';

/**
 * Crée le fichier de sauvegarde et le remet à l'utilisateur.
 * Retourne { fileName, shared } ; `shared` vaut false si la feuille de partage
 * n'est pas disponible (le fichier est alors dans le cache, chemin dans `uri`).
 */
export async function exportBackupFile({ appVersion } = {}) {
  const snapshot = createSnapshot({ appVersion });
  const json = serializeSnapshot(snapshot);
  const fileName = getBackupFileName();

  if (Platform.OS === 'web') {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return { fileName, shared: true };
  }

  const uri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    return { fileName, shared: false, uri };
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/json',
    dialogTitle: 'Enregistrer la sauvegarde RCH Suivi',
    UTI: 'public.json',
  });
  return { fileName, shared: true, uri };
}

/**
 * Ouvre le sélecteur de fichier et renvoie le contenu texte du fichier choisi,
 * ou null si l'utilisateur annule.
 */
export async function pickBackupFileText() {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets || result.assets.length === 0) return null;
  const asset = result.assets[0];

  if (Platform.OS === 'web') {
    if (asset.file && typeof asset.file.text === 'function') {
      return { name: asset.name, text: await asset.file.text() };
    }
    const response = await fetch(asset.uri);
    return { name: asset.name, text: await response.text() };
  }

  const text = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
  return { name: asset.name, text };
}
