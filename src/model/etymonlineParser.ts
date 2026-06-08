export interface EtymonlineEntry {
  word: string;
  property: string;
  html: string;
  text: string;
}

export interface EtymonlineWordPage {
  title: string;
  description: string;
  canonicalUrl: string;
  entries: EtymonlineEntry[];
}

export type EtymonlineParseResult =
  | {
      ok: true;
      data: EtymonlineWordPage;
    }
  | {
      ok: false;
      error: {
        code: 'EMPTY_HTML' | 'PARSER_UNAVAILABLE' | 'ENTRY_NOT_FOUND' | 'PARSE_FAILED';
        message: string;
      };
    };

const ETYMONLINE_ORIGIN = 'https://www.etymonline.com';

const normalizeText = (value = '') => value.replace(/\s+/g, ' ').trim();

const getMetaContent = (doc: Document, selector: string) =>
  doc.querySelector<HTMLMetaElement>(selector)?.content?.trim() || '';

const createHtmlDocument = (html: string): Document | null => {
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser().parseFromString(html, 'text/html');
  }

  if (typeof document !== 'undefined' && document.implementation?.createHTMLDocument) {
    const doc = document.implementation.createHTMLDocument('');
    doc.documentElement.innerHTML = html;
    return doc;
  }

  return null;
};

const unwrapElement = (element: Element) => {
  const parent = element.parentNode;
  if (!parent) return;

  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  parent.removeChild(element);
};

const sanitizeBody = (source: Element): HTMLElement => {
  const container = source.ownerDocument.createElement('div');
  container.innerHTML = source.innerHTML;

  container
    .querySelectorAll('script, style, template, svg, img, iframe, form, input, button')
    .forEach((element) => element.remove());

  const allowedTags = new Set(['P', 'A', 'EM', 'STRONG', 'I', 'B', 'BR', 'BLOCKQUOTE']);
  Array.from(container.querySelectorAll('*')).forEach((element) => {
    if (!allowedTags.has(element.tagName)) {
      unwrapElement(element);
      return;
    }

    Array.from(element.attributes).forEach((attribute) => {
      const keepLinkAttribute =
        element.tagName === 'A' && ['href', 'title', 'rel', 'target'].includes(attribute.name);
      if (!keepLinkAttribute) {
        element.removeAttribute(attribute.name);
      }
    });

    if (element.tagName === 'A') {
      const href = element.getAttribute('href') || '';
      if (href.startsWith('/')) {
        element.setAttribute('href', ETYMONLINE_ORIGIN + href);
      }
      element.setAttribute('target', '_blank');
      element.setAttribute('rel', 'nofollow noopener noreferrer');
    }
  });

  return container;
};

const hasBodyParagraph = (element: Element) =>
  Boolean(element.querySelector('p')) && !element.querySelector('h1, h2');

const findEntryBody = (entryRoot: Element) => {
  const heading = entryRoot.querySelector('h2');
  let sibling = heading?.parentElement?.nextElementSibling || null;
  while (sibling) {
    if (sibling.tagName === 'SECTION' && hasBodyParagraph(sibling)) {
      return sibling;
    }
    sibling = sibling.nextElementSibling;
  }

  const directBody = Array.from(entryRoot.children).find(
    (child) => child.tagName === 'SECTION' && hasBodyParagraph(child),
  );

  if (directBody) return directBody;

  return Array.from(entryRoot.querySelectorAll('section')).find(hasBodyParagraph);
};

const parseEntry = (entryRoot: Element): EtymonlineEntry | null => {
  const heading = entryRoot.querySelector('h2');
  const body = findEntryBody(entryRoot);
  if (!heading || !body) return null;

  const word =
    normalizeText(heading.querySelector('[lang]')?.textContent || '') ||
    normalizeText(heading.querySelector('span')?.textContent || '');
  const property =
    Array.from(heading.querySelectorAll('span'))
      .map((element) => normalizeText(element.textContent || ''))
      .find((value) => /^\(.+\)$/.test(value)) || '';

  const sanitizedBody = sanitizeBody(body);
  const html = sanitizedBody.innerHTML.trim();
  const text = normalizeText(sanitizedBody.textContent || '');

  if (!word || !html || !text) return null;

  return {
    word,
    property,
    html,
    text,
  };
};

export const parseEtymonlineWordHtml = (html: string): EtymonlineParseResult => {
  try {
    if (!html.trim()) {
      return {
        ok: false,
        error: {
          code: 'EMPTY_HTML',
          message: 'Cannot parse an empty Etymonline word page.',
        },
      };
    }

    const doc = createHtmlDocument(html);
    if (!doc) {
      return {
        ok: false,
        error: {
          code: 'PARSER_UNAVAILABLE',
          message: 'No DOM parser is available in this runtime.',
        },
      };
    }

    const entryRoots = Array.from(doc.querySelectorAll('section[class*="prose"]')).filter(
      (section) => section.querySelector('h2') && findEntryBody(section),
    );
    const entries = entryRoots
      .map(parseEntry)
      .filter((entry): entry is EtymonlineEntry => Boolean(entry));

    if (!entries.length) {
      return {
        ok: false,
        error: {
          code: 'ENTRY_NOT_FOUND',
          message: 'No etymology body was found in the Etymonline word page.',
        },
      };
    }

    return {
      ok: true,
      data: {
        title: normalizeText(doc.querySelector('title')?.textContent || ''),
        description:
          getMetaContent(doc, 'meta[name="description"]') ||
          getMetaContent(doc, 'meta[property="og:description"]'),
        canonicalUrl: doc.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href || '',
        entries,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'PARSE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to parse Etymonline word page.',
      },
    };
  }
};
