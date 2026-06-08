export enum MessageType {
  Ping = 'PING',
  OpenEtymonline = 'OPEN_ETYMONLINE',
}

export interface PingResponse {
  ok: boolean;
  manifestVersion?: string;
}
