import { Platform, Share } from 'react-native';

import { config } from './config';

export async function shareInvite(groupName: string, code: string): Promise<'shared' | 'copied'> {
  const link = config.shareUrl ? `\nScarica l'app: ${config.shareUrl}` : '';
  const message = `Ti invito in "${groupName}" su Casa in Ordine: gestiamo insieme spese, entrate e scadenze di casa 🏡\nCodice invito: ${code}${link}`;
  if (Platform.OS === 'web') {
    await navigator.clipboard?.writeText(message);
    return 'copied';
  }
  await Share.share({ message });
  return 'shared';
}
