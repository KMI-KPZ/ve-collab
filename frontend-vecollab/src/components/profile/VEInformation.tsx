import { VEInformation as IVEInformation } from '@/interfaces/profile/profileInterfaces';
import BoxContentHeadline from './BoxContentHeadline';
import VEInformationContentList from './VEInformationContentList';
import { useTranslation } from 'next-i18next';

interface Props {
    veInfo: IVEInformation;
}

export default function VEInformation({ veInfo }: Props) {
    const { t } = useTranslation(['community', 'common']);

    return (
        <div className={'min-h-[30rem] mx-2 my-1 overflow-y-auto content-scrollbar'}>
            <BoxContentHeadline className={'my-1'} text={t('ve_topics')} />
            <VEInformationContentList
                items={veInfo.veInterests.map((ve_interest) =>
                    t('ve_interests_options.' + ve_interest, { defaultValue: ve_interest })
                )}
            />
            <BoxContentHeadline className={'mt-6'} text={t('ve_contents')} />
            <VEInformationContentList items={veInfo.veContents} />
            <BoxContentHeadline className={'mt-6'} text={t('ve_goals')} />
            <VEInformationContentList
                items={veInfo.veGoals.map((ve_goal) =>
                    t('ve_goals_options.' + ve_goal, { defaultValue: ve_goal })
                )}
            />
            <BoxContentHeadline className={'mt-6'} text={t('ve_experience')} />
            <VEInformationContentList items={veInfo.experience} />
            <BoxContentHeadline className={'mt-6'} text={t('interdisciplinary_exchange')} />
            <div className={'mb-4 py-2 font-bold text-slate-900 flex flex-wrap'}>
                <div className={'mr-2 mb-2 px-2 rounded-lg bg-gray-300 shadow-lg'}>
                    {veInfo.interdisciplinaryExchange ? t('common:yes') : t('common:no')}
                </div>
            </div>
            <BoxContentHeadline className={'mt-6'} text={t('preferred_formats')} />
            <div className={'mb-4 py-2 font-bold text-slate-900 flex flex-wrap'}>
                <div className={'mr-2 mb-2 px-2 rounded-lg bg-gray-300 shadow-lg'}>
                    {t('preferred_formats_options.' + veInfo.preferredFormat, {
                        defaultValue: veInfo.preferredFormat,
                    })}
                </div>
            </div>
        </div>
    );
}
