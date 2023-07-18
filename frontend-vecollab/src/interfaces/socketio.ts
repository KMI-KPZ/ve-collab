export interface SocketIOServerResponse extends Record<string, any> {
    status: number;
    success: boolean;
    reason?: string;
}
