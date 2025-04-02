import { fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import router from 'next/router';
import { Socket } from 'socket.io-client';
import { getPlanLock } from '../VE-designer/PlanSocket';
import Button from '../common/buttons/Button';

interface Props {
    socket?: Socket;
    label?: string | JSX.Element;
    children?: JSX.Element;
    className?: string;
    isNoAuthPreview?: boolean;
}
export default function ButtonNewPlan({
    label,
    children,
    className,
    socket,
    isNoAuthPreview = false,
}: Props) {
    const { data: session } = useSession();

    const createAndForwardNewPlanner = async () => {
        if (isNoAuthPreview) return;

        router.push({
            pathname: '/ve-designer/name',
        });
    };

    const defaulStyle =
        'py-2 px-4 rounded-lg text-white bg-ve-collab-orange hover:shadow-button-primary';

    return (
        <Button
            label={label}
            onClick={createAndForwardNewPlanner}
            className={className ? className : defaulStyle}
        >
            {children}
        </Button>
    );
}
