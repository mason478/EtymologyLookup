import { FetchEtymologyHtmlResponse, MessageType, PingResponse } from './types';

const buildEtymonlineUrl = (word: string) =>
  'https://www.etymonline.com/word/' + encodeURIComponent(word.trim());

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'lookup-etymology',
    title: 'Look up etymology',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== 'lookup-etymology' || !info.selectionText) return;
  const word = encodeURIComponent(info.selectionText.trim());
  chrome.tabs.create({ url: 'https://www.etymonline.com/word/' + word });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === MessageType.Ping) {
    const response: PingResponse = {
      ok: true,
      manifestVersion: chrome.runtime.getManifest().manifest_version.toString(),
    };
    sendResponse(response);
    return false;
  }

  if (message?.type === MessageType.OpenEtymonline && message.word) {
    chrome.tabs.create({ url: buildEtymonlineUrl(String(message.word)) });
    sendResponse({ ok: true });
    return false;
  }

  if (message?.type === MessageType.FetchEtymologyHtml && message.word) {
    const url = buildEtymonlineUrl(String(message.word));
    fetch(url, {
      credentials: 'omit',
      headers: {
        accept: 'text/html,application/xhtml+xml',
      },
    })
      .then(async (response): Promise<FetchEtymologyHtmlResponse> => {
        if (!response.ok) {
          return {
            ok: false,
            error: 'Etymonline returned HTTP ' + response.status + '.',
          };
        }

        return {
          ok: true,
          html: await response.text(),
          url: response.url || url,
        };
      })
      .catch((error): FetchEtymologyHtmlResponse => ({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to fetch Etymonline.',
      }))
      .then(sendResponse);

    return true;
  }

  return false;
});
