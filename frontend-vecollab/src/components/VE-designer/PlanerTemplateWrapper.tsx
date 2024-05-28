import React, { useEffect, useState } from 'react';
import HeadProgressBarSection from '@/components/VE-designer/HeadProgressBarSection';
import SideProgressBarWithReactHookFormWithoutPopUp from '@/components/VE-designer/SideProgressBarWithReactHookFormWithoutPopUp';
import { FormProvider } from 'react-hook-form';
import { fetchGET } from '@/lib/backend';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';

interface Props {
    methods: any;
    children: React.ReactNode;

    planerDataCallback: (data: any) => void
}

// TODO Weiter, Zurück button + combinedSubmitRouteAndUpdate in parent verschieben
// TODO react query (https://tanstack.com/query/) einbauen
// TODO interface for planerData, loading?, daten hin und herschieben, mehr reactHookForm vllt noch in parent
// TODO Error onSubmit -> einzeln durchgeben?
// TODO Topmenu mit submit refactoren

export default function PlanerTemplateWrapper({ children, methods, planerDataCallback }: Props): JSX.Element {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [planerData, setPlanerData] = useState<any>();

    useEffect(() => {
        fetchGET(`/planner/get?_id=${router.query.plannerId}`, session?.accessToken).then(
            (data) => {
                setPlanerData(data.plan);
                planerDataCallback(data.plan)
            }
        );
    }, [session, status, router]);

    return (
        <FormProvider {...methods}>
            <div className="flex bg-pattern-left-blue-small bg-no-repeat">
                <div className="flex flex-grow justify-center">
                    <div className="flex flex-col">
                        <HeadProgressBarSection
                            stage={0}
                            linkFineStep={planerData?.steps[0]?.name}
                        />

                        {children}
                    </div>
                </div>
                <SideProgressBarWithReactHookFormWithoutPopUp
                    progressState={planerData?.progress}
                    onSubmit={methods.onSubmit}
                />
            </div>
        </FormProvider>
    );
}
