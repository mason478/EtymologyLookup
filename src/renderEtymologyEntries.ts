import { EtymonlineEntry } from './model/etymonlineParser';

export const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export const renderEtymologyEntries = (entries: EtymonlineEntry[]) =>
  entries
    .map((entry) => {
      const property = entry.property ? ' ' + entry.property : '';
      return (
        '<section class="etymology-entry"><div class="etymology-entry-title">' +
        escapeHtml(entry.word + property) +
        '</div><div class="etymology-entry-content">' +
        entry.html +
        '</div></section>'
      );
    })
    .join('');
