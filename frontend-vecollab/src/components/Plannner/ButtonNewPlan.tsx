import { fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import router from 'next/router';

interface Props {
    label?: string|JSX.Element;
    children?: JSX.Element;
    className?: string;
}
export default function ButtonNewPlan({ label, children, className }: Props) {
    const { data: session } = useSession();

    const createAndForwardNewPlanner = async () => {
        const newPlanner = await fetchPOST('/planner/insert_empty', {}, session?.accessToken);
        await router.push({
            pathname: '/ve-designer/name',
            query: { plannerId: newPlanner.inserted_id },
        });
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
