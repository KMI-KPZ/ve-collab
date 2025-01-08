import { Dispatch, FormEvent, SetStateAction } from 'react';
import EditProfileHeader from './EditProfileHeader';
import EditProfileVerticalSpacer from './EditProfileVerticalSpacer';
import EditProfileHeadline from './EditProfileHeadline';
import SlateBox from '../common/SlateBox';
import EditProfilePlusMinusButtons from './EditProfilePlusMinusButtons';
import EditProfileItemRow from './EditProfileItemRow';
import Swapper from './Swapper';
import { VEWindowItem } from '@/interfaces/profile/profileInterfaces';
import { useGetPublicPlansOfCurrentUser } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import Select from 'react-select';
import LoadingAnimation from '../common/LoadingAnimation';
import { useTranslation } from 'next-i18next';

interface Props {
    items: VEWindowItem[];
    setItems: Dispatch<SetStateAction<VEWindowItem[]>>;
    updateProfileData(evt: FormEvent): Promise<void>;
    orcid: string | null | undefined;
    importOrcidProfile(evt: FormEvent): Promise<void>;
}

EditProfileVeWindow.auth = true;
export default function EditProfileVeWindow({
    items,
    setItems,
    updateProfileData,
    orcid,
    importOrcidProfile,
}: Props) {
    const { data: session, status } = useSession();
    const { t } = useTranslation(['community', 'common']);

    const {
        data: myPublicPlans,
        isLoading,
        error,
        mutate,
    } = useGetPublicPlansOfCurrentUser(session!.accessToken, session!.user!.preferred_username!);

    const modifyTitle = (index: number, value: string) => {
        let newItems = [...items];
        newItems[index].title = value;
        setItems(newItems);
    };

    const modifyDescription = (index: number, value: string) => {
        let newItems = [...items];
        newItems[index].description = value;
        setItems(newItems);
    };

    const modifyChosenPlan = (index: number, value: string, name: string) => {
        let newItems = [...items];
        newItems[index].plan = {
            _id: value,
            name: name,
        };
        setItems(newItems);
    };

    const swapItem = (e: FormEvent, firstIndex: number, secondIndex: number) => {
        e.preventDefault();

        let newItems = [...items];

        // swap indices
        [newItems[firstIndex], newItems[secondIndex]] = [
            newItems[secondIndex],
            newItems[firstIndex],
        ];
        setItems(newItems);
    };

    const deleteFromItems = (e: FormEvent, index: number) => {
        e.preventDefault();

        let copy = [...items];
        copy.splice(index, 1);
        setItems(copy);
    };

    const addEmptyItem = (e: FormEvent) => {
        e.preventDefault();
        setItems([...items, { plan: { _id: '', name: '' }, title: '', description: '' }]);
    };

    return (
        <form onSubmit={updateProfileData}>
            <EditProfileHeader orcid={orcid} importOrcidProfile={importOrcidProfile} />
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={t('ve_window')} />
                <div className="mb-2 text-sm">{t('ve_window_question')}</div>
                {isLoading ? (
                    <LoadingAnimation />
                ) : (
                    <>
                        {items.map((item, index) => (
                            <Swapper
                                key={index}
                                index={index}
                                arrayLength={items.length}
                                swapCallback={swapItem}
                                deleteCallback={deleteFromItems}
                            >
                                <div className="w-full">
                                    <SlateBox>
                                        <div className="mt-2 flex">
                                            <div className={'flex items-center w-1/3'}>
                                                <label htmlFor={'plan'} className="px-2 py-2">
                                                    {t('choose_plan')}
                                                </label>
                                            </div>
                                            <Select
                                                className="w-2/3"
                                                options={myPublicPlans
                                                    .map((plan) => {
                                                        return {
                                                            label: plan.name,
                                                            value: plan._id,
                                                        };
                                                    })
                                                    .sort((a, b) => a.label.localeCompare(b.label))}
                                                onChange={(e) =>
                                                    modifyChosenPlan(index, e!.value, e!.label)
                                                }
                                                value={
                                                    item.plan._id !== ''
                                                        ? {
                                                              label: item.plan.name,
                                                              value: item.plan._id,
                                                          }
                                                        : null
                                                }
                                                placeholder={t('common:choose_option')}
                                            />
                                        </div>
                                        <EditProfileItemRow
                                            label={t('common:title')}
                                            value={item.title}
                                            onChange={(e) => {
                                                modifyTitle(index, e.target.value);
                                            }}
                                            labelElementWidth="w-1/3"
                                            inputElemenWidth="w-2/3"
                                            placeholder={t('ve_window_title_placeholder')}
                                        />
                                        <EditProfileItemRow
                                            label={t('description')}
                                            value={item.description}
                                            onChange={(e) => {
                                                modifyDescription(index, e.target.value);
                                            }}
                                            labelElementWidth="w-1/3"
                                            inputElemenWidth="w-2/3"
                                            placeholder={t('ve_window_description_placeholder')}
                                        />
                                    </SlateBox>
                                </div>
                            </Swapper>
                        ))}
                        <EditProfilePlusMinusButtons plusCallback={addEmptyItem} />
                    </>
                )}
            </EditProfileVerticalSpacer>
        </form>
    );
}
