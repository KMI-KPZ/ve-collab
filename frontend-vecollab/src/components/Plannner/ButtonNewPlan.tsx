import { fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import router from 'next/router';
import { Socket } from 'socket.io-client';
import ButtonPrimary from '../ButtonPrimary';
import { dropPlanLock, getPlanLock } from '../VE-designer/PlanSocket';

interface Props {
    socket: Socket;
    label?: string|JSX.Element;
    children?: JSX.Element;
    className?: string;
}
export default function ButtonNewPlan({ label, children, className, socket }: Props) {
    const { data: session } = useSession();

    const createAndForwardNewPlanner = async () => {
        const newPlanner = await fetchPOST('/planner/insert_empty', {}, session?.accessToken);

        getPlanLock(socket, newPlanner.inserted_id)
        .then((response) => {
            router.push({
                pathname: '/ve-designer/name',
                query: { plannerId: newPlanner.inserted_id },
            });
        })
        .catch((response) => {
            // TODO print error
            console.log({response});

        })
    };

    const defaulStyle = 'py-2 px-4 rounded-lg text-white bg-ve-collab-orange hover:shadow-button-primary'

    return (
        <ButtonPrimary
            label={label}
            onClick={createAndForwardNewPlanner}
            className={className ? className : defaulStyle}
        >
            {children}
        </ButtonPrimary>
    );
}
