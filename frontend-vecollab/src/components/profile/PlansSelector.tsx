import { useGetAvailablePlans } from '@/lib/backend';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import Select from 'react-select';
import LoadingAnimation from '../common/LoadingAnimation';
import { IplansFilter } from '@/pages/plans';

interface Props {
    chosenPlanId?: string;
    setChosenPlanId: (id: string) => void;
}

PlansSelector.auth = true;
export default function PlansSelector({ chosenPlanId, setChosenPlanId }: Props) {
    const { t } = useTranslation('common');
    const pageLimit = 5;
    const [filterBy, setFilterBy] = useState<IplansFilter>({
        owner: 'own',
        limit: pageLimit,
        offset: 0,
    });
    const { data: plans, isLoading } = useGetAvailablePlans(filterBy);

    const loadMore = () => {
        if (plans.length >= filterBy.limit!) {
            setFilterBy((prev) => ({
                ...prev,
                limit: prev.limit! + pageLimit,
            }));
        }
    };

    return (
        <Select
            options={plans.map((plan) => ({ value: plan._id, label: plan.name }))}
            loadingMessage={() => <LoadingAnimation size="small" />}
            onChange={(e) => {
                if (!e?.value) return;
                setChosenPlanId(e.value);
            }}
            noOptionsMessage={() => t('plans_nothing_matches')}
            onMenuScrollToBottom={loadMore}
            placeholder={t('common:choose')}
            maxMenuHeight={128}
        />
    );
}
