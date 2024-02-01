import { VEInformation as IVEInformation } from '@/interfaces/profile/profileInterfaces';
import BoxContentHeadline from './BoxContentHeadline';
import VEInformationContentList from './VEInformationContentList';

interface Props {
    veInfo: IVEInformation;
}

export default function VEInformation({ veInfo }: Props) {
    return (
        <div className={'min-h-[30rem] mx-2 my-1 overflow-y-auto content-scrollbar'}>
            <BoxContentHeadline className={'my-1'} text={'VE-Themen'} />
            <VEInformationContentList items={veInfo.veInterests} />
            <BoxContentHeadline className={'mt-6'} text={'VE-Inhalte'} />
            <VEInformationContentList items={veInfo.veContents} />
            <BoxContentHeadline className={'mt-6'} text={'VE-Zielsetzungen'} />
            <VEInformationContentList items={veInfo.veGoals} />
            <BoxContentHeadline className={'mt-6'} text={'Erfahrungen'} />
            <VEInformationContentList items={veInfo.experience} />
            <BoxContentHeadline className={'mt-6'} text={'interdisziplinärer Austausch'} />
            <div className={'mb-4 py-2 font-bold text-slate-900 flex flex-wrap'}>
                <div className={'mr-2 mb-2 px-2 rounded-lg bg-gray-300 shadow-lg'}>
                    {veInfo.interdisciplinaryExchange ? 'ja' : 'nein'}
                </div>
            </div>
            <BoxContentHeadline className={'mt-6'} text={'präferierte Formate'} />
            <div className={'mb-4 py-2 font-bold text-slate-900 flex flex-wrap'}>
                <div className={'mr-2 mb-2 px-2 rounded-lg bg-gray-300 shadow-lg'}>
                    {veInfo.preferredFormat}
                </div>
            </div>
        </div>
    );
}
