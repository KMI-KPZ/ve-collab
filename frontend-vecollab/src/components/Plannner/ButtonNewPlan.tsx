import { fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import router from 'next/router';

interface Props {
    label: string|JSX.Element;
    className?: string;
}
export default function ButtonNewPlan({ label, className }: Props) {
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
                    : 'py-4 pr-6 pl-5 m-10 bg-ve-collab-orange rounded-lg text-white'
            }`}
        >
            {label}
        </button>
    );
}
