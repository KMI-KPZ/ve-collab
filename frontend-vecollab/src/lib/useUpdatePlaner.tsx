import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useSession } from 'next-auth/react';

const useUpdatePlaner = () => {
    const queryClient = useQueryClient();
    const { data: session } = useSession();

    const updatePlaner = async (props: any) =>
        await axios
            .post(
                `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/planner/update_fields`,
                { update: props },
                {
                    headers: {
                        Authorization: `Bearer ${session?.accessToken}`,
                        'Content-Type': 'text/plain',
                    },
                }
            )
            .then((response) => {
                return response.data;
            });

    return useMutation<string, Error, any>({
        mutationFn: updatePlaner,
        onSuccess: async (data, props, context) => {
            await queryClient.invalidateQueries({ queryKey: ['planer', props[0].plan_id] });
        },
    });
};

export default useUpdatePlaner;
