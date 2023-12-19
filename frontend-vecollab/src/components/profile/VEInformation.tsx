import BoxContentHeadline from './BoxContentHeadline';
import VEInformationContentList from './VEInformationContentList';

interface Props {
    veInterests: string[];
    veContents: string[];
    veGoals: string[];
    experiences: string[];
    interdisciplinaryExchange: boolean;
    preferredFormat: string;
}

export default function VEInformation({
    veInterests,
    veContents,
    veGoals,
    experiences,
    interdisciplinaryExchange,
    preferredFormat,
}: Props) {
    return (
        <div className={'min-h-[30rem] mx-2 my-1 overflow-y-auto content-scrollbar'}>
            <BoxContentHeadline className={'my-1'} text={'VE-Themen'} />
            <VEInformationContentList items={veInterests} />
            <BoxContentHeadline className={'mt-6'} text={'VE-Inhalte'} />
            <VEInformationContentList items={veContents} />
            <BoxContentHeadline className={'mt-6'} text={'VE-Zielsetzungen'} />
            <VEInformationContentList items={veGoals} />
            <BoxContentHeadline className={'mt-6'} text={'Erfahrungen'} />
            <VEInformationContentList items={experiences} />
            <BoxContentHeadline className={'mt-6'} text={'interdisziplinärer Austausch'} />
            <div className={'mb-4 py-2 font-bold text-slate-900 flex flex-wrap'}>
                <div className={'mr-2 mb-2 px-2 rounded-lg bg-gray-300 shadow-lg'}>
                    {interdisciplinaryExchange ? 'ja' : 'nein'}
                </div>
            </div>
            <BoxContentHeadline className={'mt-6'} text={'präferierte Formate'} />
            <div className={'mb-4 py-2 font-bold text-slate-900 flex flex-wrap'}>
                <div className={'mr-2 mb-2 px-2 rounded-lg bg-gray-300 shadow-lg'}>
                    {preferredFormat}
                </div>
            </div>
        </div>
    );
}
