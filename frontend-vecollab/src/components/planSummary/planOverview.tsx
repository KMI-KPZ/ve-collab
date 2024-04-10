import React from 'react';
import ViewAttributes from '@/components/planSummary/ViewAttributes';
import ViewFinestep from '@/components/planSummary/ViewFinestep';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import ViewAfterVE from './ViewAfterVE';

interface Props {
    plan: IPlan;
}

export function PlanOverview({ plan }: Props): JSX.Element {
    console.log(plan);
    return (
        <div className="bg-white rounded-lg p-4 w-full">
            <ViewAttributes plan={plan} />
            <hr className="h-px my-10 bg-gray-400 border-0" />
            <div className="text-2xl font-semibold mb-4 ml-4">Etappen</div>
            {plan.steps !== undefined && plan.steps.length > 0 ? (
                plan.steps.map((fineStep, index) => (
                    <ViewFinestep key={index} fineStep={fineStep} />
                ))
            ) : (
                <div className="ml-4"> Noch keine erstellt</div>
            )}
            <hr className="h-px my-10 bg-gray-400 border-0" />
            <ViewAfterVE plan={plan} />
        </div>
    );
}
