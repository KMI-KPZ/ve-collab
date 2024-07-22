import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';

interface IBackendPlan {
    plan: IPlan;
}

const usePlaner = (planId: string) => {
    const { data: session } = useSession();
    const getPlaner = async () =>
        await axios
            .get(process.env.NEXT_PUBLIC_BACKEND_BASE_URL + `/planner/get?_id=${planId}`, {
                headers: {
                    Authorization: `Bearer ${session?.accessToken}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
            })
            .then((response) => {
                const data: IBackendPlan = {
                    ...response.data,
                };

                return data.plan;
            });

    return useQuery<IPlan, Error>({
        queryKey: ['planer', planId],
        queryFn: getPlaner,
        enabled: planId !== undefined && planId !== '',
    });
};

export default usePlaner;
