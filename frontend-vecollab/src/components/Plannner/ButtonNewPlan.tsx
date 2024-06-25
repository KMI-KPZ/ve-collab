import { fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import router from 'next/router';
import { Socket } from 'socket.io-client';

interface Props {
    socket: Socket;
    label?: string | JSX.Element;
    children?: JSX.Element;
    className?: string;
}
export default function ButtonNewPlan({ label, children, className, socket }: Props) {
    const { data: session } = useSession();

    const createAndForwardNewPlanner = async () => {
        const newPlanner = await fetchPOST('/planner/insert_empty', {}, session?.accessToken);
        socket.emit(
            'try_acquire_or_extend_plan_write_lock',
            { plan_id: newPlanner.inserted_id },
            async (response: any) => {
                console.log(response);
                if (response.success) {
                    await router.push({
                        pathname: '/ve-designer/name',
                        query: { plannerId: newPlanner.inserted_id },
                    });
                }
            }
        );
    };

    return (
        <button
            onClick={createAndForwardNewPlanner}
            className={`${
                className
                    ? className
                    : 'py-2 px-4 rounded-lg text-white bg-ve-collab-orange hover:shadow-button-primary'
            }`}
        >
            {children || label}
        </button>
    );
}
