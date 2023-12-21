import { io } from 'socket.io-client';

// TODO need "path" option to be able to connect to socket.io server if the backend
// is running behind a nginx location block (e.g. /backend/socket.io/ needs "path": "/backend/socket.io")
// OR configure nginx to proxy pass /backend/socket.io directly to the backends /socket.io
// with a custom nginx /socket.io location
export const socket = io(process.env.NEXT_PUBLIC_SOCKETIO_BASE_URL!, { autoConnect: false });
