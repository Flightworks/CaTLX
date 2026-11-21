import { expect, test } from 'vitest';
import english from './public/locales/en.json';
import french from './public/locales/fr.json';

type Locale = { [key: string]: string | Locale };

function messageKeys(locale: Locale, prefix = ''): string[] {
  return Object.entries(locale).flatMap(([key, value]) => {
    const path = prefix + key;
    return typeof value === 'string' ? [path] : messageKeys(value, path + '.');
  });
}

test('French and English define the same application messages', () => {
  expect(messageKeys(french).sort()).toEqual(messageKeys(english).sort());
});
