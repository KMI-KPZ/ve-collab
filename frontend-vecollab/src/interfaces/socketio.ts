export interface SocketIOServerResponse extends Record<string, any> {
    status: number;
    success: boolean;
    reason?: string;
}

export interface VeInvitation {
    _id: string;
    type: string;
    from: string;
    to: string;
    message: string;
    plan_id: string;
    receive_state: string;
    creation_timestamp: string;
}
