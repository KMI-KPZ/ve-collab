import { Dispatch, FormEvent, SetStateAction, useEffect, useState } from 'react';
import EditProfileHeader from './EditProfileHeader';
import EditProfileVerticalSpacer from './EditProfileVerticalSpacer';
import EditProfileHeadline from './EditProfileHeadline';
import SlateBox from '../Layout/SlateBox';
import EditProfilePlusMinusButtons from './EditProfilePlusMinusButtons';
import EditProfileItemRow from './EditProfileItemRow';
import Swapper from './Swapper';
import { VEPlanSnippet, VEWindowItem } from '@/interfaces/profile/profileInterfaces';
import { fetchGET } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

interface Props {
    items: VEWindowItem[];
    setItems: Dispatch<SetStateAction<VEWindowItem[]>>;
    updateProfileData(evt: FormEvent): Promise<void>;
    orcid: string | null | undefined;
    importOrcidProfile(evt: FormEvent): Promise<void>;
}

export default function EditProfileVeWindow({
    items,
    setItems,
    updateProfileData,
    orcid,
    importOrcidProfile,
}: Props) {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const [myPublicPlans, setMyPublicPlans] = useState<VEPlanSnippet[]>([
        {
            _id: '',
            name: '',
        },
    ]);

    // request all personal public plans for dropdown
    useEffect(() => {
        // if router or session is not yet ready, don't make an redirect decisions or requests, just wait for the next re-render
        if (!router.isReady || status === 'loading') {
            setLoading(true);
            return;
        }
        // to minimize backend load, request the data only if session is valid (the other useEffect will handle session re-initiation)
        if (session) {
            fetchGET(
                `/planner/get_public_of_user?username=${session.user.preferred_username}`,
                session?.accessToken
            ).then((data) => {
                setMyPublicPlans(
                    data.plans.map((plan: any) => ({
                        _id: plan._id,
                        name: plan.name,
                    }))
                );
            });
        }
    }, [session, status, router]);

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
        console.log(value);
        console.log(name);
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
        setItems([
            ...items,
            {
                plan: {
                    _id: myPublicPlans[0]._id,
                    name: myPublicPlans[0].name,
                },
                title: '',
                description: '',
            },
        ]);
    };

    return (
        <form onSubmit={updateProfileData}>
            <EditProfileHeader orcid={orcid} importOrcidProfile={importOrcidProfile} />
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'VE-Schaufenster'} />
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
                                            Plan wählen
                                        </label>
                                    </div>
                                    <select
                                        name="plan"
                                        className="w-2/3 border border-gray-500 rounded-lg h-12 p-2 bg-white"
                                        value={item.plan._id}
                                        onChange={(e) =>
                                            modifyChosenPlan(
                                                index,
                                                e.target.value,
                                                e.target.selectedOptions[0].text
                                            )
                                        }
                                    >
                                        {myPublicPlans.map((plan, index) => (
                                            <option key={`option_${index}`} value={plan._id}>
                                                {plan.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <EditProfileItemRow
                                    label={'Titel'}
                                    value={item.title}
                                    onChange={(e) => {
                                        modifyTitle(index, e.target.value);
                                    }}
                                    labelElementWidth="w-1/3"
                                    inputElemenWidth="w-2/3"
                                    placeholder="optional, anderer Titel im Schaufenster"
                                />
                                <EditProfileItemRow
                                    label={'Beschreibung'}
                                    value={item.description}
                                    onChange={(e) => {
                                        modifyDescription(index, e.target.value);
                                    }}
                                    labelElementWidth="w-1/3"
                                    inputElemenWidth="w-2/3"
                                    placeholder="optional, andere Beschreibung im Schaufenster"
                                />
                            </SlateBox>
                        </div>
                    </Swapper>
                ))}
                <EditProfilePlusMinusButtons plusCallback={addEmptyItem} />
            </EditProfileVerticalSpacer>
        </form>
    );
}
