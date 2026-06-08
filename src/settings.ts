export const SELECTION_LOOKUP_ENABLED_KEY = 'selectionLookupEnabled';

export interface ExtensionSettings {
  [SELECTION_LOOKUP_ENABLED_KEY]: boolean;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  [SELECTION_LOOKUP_ENABLED_KEY]: false,
};
