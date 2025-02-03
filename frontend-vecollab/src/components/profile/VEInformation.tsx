import { VEInformation as IVEInformation } from '@/interfaces/profile/profileInterfaces';
import BoxContentHeadline from './BoxContentHeadline';
import VEInformationContentList from './VEInformationContentList';
import { useTranslation } from 'next-i18next';
import NoItemAvailable from './NoItemAvailable';
import TagBox from './TagBox';
import { MdEdit } from 'react-icons/md';
import Link from 'next/link';

interface Props {
    veInfo: IVEInformation;
}

export default function VEInformation({ veInfo }: Props) {
    const { t } = useTranslation(['community', 'common']);

    return (
        <div
            className={
                'relative group mx-4 my-1 grid grid-cols-2 grid-rows-3 grid-flow-col gap-4 overflow-y-auto content-scrollbar'
            }
        >
            <Link
                href={'/profile/edit#tabVE-Info'}
                className="absolute right-0 top-0 mx-2 invisible group-hover:visible italic text-slate-600 text-xs"
            >
                <MdEdit className="inline" /> {t('common:edit')}
            </Link>

            <div>
                <BoxContentHeadline className={''} text={t('ve_topics')} />
                <VEInformationContentList
                    items={veInfo.veInterests.map((ve_interest) =>
                        t('ve_interests_options.' + ve_interest, { defaultValue: ve_interest })
                    )}
                />
            </div>

            <div>
                <BoxContentHeadline className={''} text={t('ve_contents')} />
                <VEInformationContentList items={veInfo.veContents} />
            </div>
            <div>
                <BoxContentHeadline className={''} text={t('ve_goals')} />
                <VEInformationContentList
                    items={veInfo.veGoals.map((ve_goal) =>
                        t('ve_goals_options.' + ve_goal, { defaultValue: ve_goal })
                    )}
                />
            </div>
            <div>
                <BoxContentHeadline className={''} text={t('ve_experience')} />
                <VEInformationContentList items={veInfo.experience} />
            </div>
            <div>
                <BoxContentHeadline className={''} text={t('interdisciplinary_exchange')} />
                <div className={'mb-4 py-2 font-bold text-slate-900 flex flex-wrap'}>
                    <TagBox
                        key={'interdisciplinaryExchange'}
                        text={veInfo.interdisciplinaryExchange ? t('common:yes') : t('common:no')}
                    />
                </div>
            </div>
            <div>
                <BoxContentHeadline className={''} text={t('preferred_formats')} />
                {veInfo.preferredFormat.length > 0 ? (
                    <div className={'mb-4 py-2 font-bold text-slate-900 flex flex-wrap'}>
                        <TagBox
                            key={'interdisciplinaryExchange'}
                            text={t('preferred_formats_options.' + veInfo.preferredFormat, {
                                defaultValue: veInfo.preferredFormat,
                            })}
                        />
                    </div>
                ) : (
                    <NoItemAvailable />
                )}
            </div>
        </div>
    );
}
