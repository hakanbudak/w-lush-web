import { request } from './client';

export interface BotText {
  key: string;
  label: string;
  group: string;
  fields: string[];
  multiline: boolean;
  /** Kliniğin yazdığı metin. Boşsa varsayılan kullanılıyor. */
  value: string;
  default: string;
}

export const listTexts = () => request<BotText[]>('/api/texts');

export const saveText = (key: string, value: string) =>
  request<BotText>(`/api/texts/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
