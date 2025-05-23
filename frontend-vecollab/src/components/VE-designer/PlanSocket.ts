import { SocketIOServerResponse } from '@/interfaces/socketio';
import { Socket } from 'socket.io-client';

export const getPlanLock = (
    socket: Socket,
    plan_id: string | string[] | undefined
): Promise<SocketIOServerResponse> => {
    if (!plan_id)
        return Promise.resolve({ status: 400, success: false, reason: 'missing_key: plan_id' });
    return new Promise((resolve, reject) => {
        socket.emit(
            'try_acquire_or_extend_plan_write_lock',
            { plan_id },
            (response: SocketIOServerResponse) => {
                if (!response.success) {
                    reject(response);
                } else {
                    resolve(response);
                }
            }
        );
    });
};

export const dropPlanLock = (
    socket: Socket,
    plan_id: string | string[] | undefined
): Promise<SocketIOServerResponse> => {
    if (!plan_id)
        return Promise.resolve({ status: 400, success: false, reason: 'missing_key: plan_id' });
    return new Promise((resolve, reject) => {
        socket.emit('drop_plan_lock', { plan_id }, (response: SocketIOServerResponse) => {
            if (!response.success) {
                reject(response);
            } else {
                resolve(response);
            }
        });
    });
};
