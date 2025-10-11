declare module 'y-websocket' {
  import * as Y from 'yjs'

  export class WebsocketProvider {
    constructor(serverUrl: string, roomName: string, doc: Y.Doc, opts?: any)
    connect(): void
    disconnect(): void
    destroy(): void
    awareness: any
  }

  export default WebsocketProvider
}
