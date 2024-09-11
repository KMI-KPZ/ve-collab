import ViewAttributes from '@/components/planSummary/ViewAttributes';
import ViewFinestep from '@/components/planSummary/ViewFinestep';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import ViewAfterVE from './ViewAfterVE';
import { BackendUserSnippet } from '@/interfaces/api/apiInterfaces';

// same as the regular PlanOverview component, the profile snippets
// have to be supplied, because in the headless browser that generates
// the pdf, no client side user session is available, so everything
// data-related has to be preloaded server-side using the access token

interface Props {
    plan: IPlan;
    openAllBoxes?: boolean;
    partnerProfileSnippets: {
        [Key: string]: BackendUserSnippet;
    };
    availablePlans: IPlan[]
}

export function PlanSummaryPDF({
    plan,
    openAllBoxes,
    partnerProfileSnippets,
    availablePlans
}: Props): JSX.Element {
    return (
        <div className="bg-white rounded-lg p-4 w-full">
            <ViewAttributes
                plan={plan}
                partnerProfileSnippets={partnerProfileSnippets}
                openAllBoxes={openAllBoxes}
            />
            <hr className="h-px my-10 bg-gray-400 border-0" />
            <div className="text-2xl font-semibold mb-4 ml-4">Etappen</div>
            {plan.steps !== undefined && plan.steps.length > 0 ? (
                plan.steps.map((fineStep, index) => (
                    <ViewFinestep
                        key={index}
                        fineStep={fineStep}
                        openAllBoxes={openAllBoxes}
                        availablePlans={availablePlans}
                    />
                ))
            ) : (
                <div className="ml-4"> Noch keine erstellt</div>
            )}
            <hr className="h-px my-10 bg-gray-400 border-0" />
            <ViewAfterVE plan={plan} openAllBoxes={openAllBoxes} />
        </div>
    );
}

export const showDataOrEmptySign = (data: any) => {
    if (data === null || data === undefined || data === '') {
        return '/';
    } else {
        return data;
    }
};
