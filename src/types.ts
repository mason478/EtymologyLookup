export enum MessageType {
  Ping = 'PING',
  OpenEtymonline = 'OPEN_ETYMONLINE',
  FetchEtymologyHtml = 'FETCH_ETYMOLOGY_HTML',
}

export interface PingResponse {
  ok: boolean;
  manifestVersion?: string;
}

export type FetchEtymologyHtmlResponse =
  | {
      ok: true;
      html: string;
      url: string;
    }
  | {
      ok: false;
      error: string;
    };
