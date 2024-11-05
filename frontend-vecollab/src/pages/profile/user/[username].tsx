import { Socket } from "socket.io-client";
import UserProfile from "..";

interface Props {
    socket: Socket;
}

SelectedUserProfile.auth = true;
export default function SelectedUserProfile({ socket }: Props): JSX.Element {
    return <UserProfile socket={socket} />
}