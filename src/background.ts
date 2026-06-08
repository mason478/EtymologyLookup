import { MessageType, PingResponse } from './types';

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
    const word = encodeURIComponent(String(message.word).trim());
    chrome.tabs.create({ url: 'https://www.etymonline.com/word/' + word });
    sendResponse({ ok: true });
    return false;
  }

  return false;
});
