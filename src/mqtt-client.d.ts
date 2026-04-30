declare module '@cloudsignal/mqtt-client' {
  interface ClientOptions {
    debug?: boolean
    preset?: 'auto' | 'mobile' | 'desktop' | 'agent' | 'server'
    tokenServiceUrl?: string
    [key: string]: unknown
  }

  interface ConnectionConfig {
    host: string
    username?: string
    password?: string
    clientId?: string
    willTopic?: string
    willMessage?: string
    willQos?: 0 | 1 | 2
    willRetain?: boolean
    [key: string]: unknown
  }

  interface TokenAuthConfig {
    host: string
    organizationId?: string
    secretKey?: string
    externalToken?: string
    willTopic?: string
    willMessage?: string
    willQos?: 0 | 1 | 2
    willRetain?: boolean
    [key: string]: unknown
  }

  class CloudSignalClient {
    constructor(options?: ClientOptions)
    connect(config: ConnectionConfig): Promise<void>
    connectWithToken(config: TokenAuthConfig): Promise<void>
    subscribe(topic: string, qos?: 0 | 1 | 2): Promise<void>
    unsubscribe(topic: string): Promise<void>
    transmit(topic: string, message: string | object, options?: { qos?: 0 | 1 | 2; retain?: boolean }): void
    destroy(): void
    onMessage(handler: (topic: string, message: string) => void): void
    offMessage(handler: (topic: string, message: string) => void): void
    onConnectionStatusChange: ((connected: boolean) => void) | null
    onReconnecting: ((attempt: number) => void) | null
    onAuthError: ((error: Error) => void) | null
    isConnected(): boolean
  }

  export default CloudSignalClient
  export { CloudSignalClient, ConnectionConfig, TokenAuthConfig, ClientOptions }
}
