import { useRouter } from 'next/router';
import React, { useCallback, useState } from 'react';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/ve-designer/sideProgressBar';
import { fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { TooltipList } from '@/components/TooltipList';
import { Tooltip } from '@/components/Tooltip';
import { PiBookOpenText } from 'react-icons/pi';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { BackendUserSnippet, BackendProfileSnippetsResponse } from '@/interfaces/api/apiInterfaces';
import Wrapper from '@/components/VE-designer/Wrapper';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';

export interface CheckListPartner {
    username: string;
    time: boolean;
    format: boolean;
    topic: boolean;
    goals: boolean;
    languages: boolean;
    media: boolean;
    technicalEquipment: boolean;
    evaluation: boolean;
    institutionalRequirements: boolean;
    dataProtection: boolean;
}

interface FormValues {
    checklist: CheckListPartner[];
}

const areAllFormValuesEmpty = (formValues: FormValues): boolean => {
    return formValues.checklist.every((checkListPartner) => {
        return (
            !checkListPartner.time &&
            !checkListPartner.format &&
            !checkListPartner.topic &&
            !checkListPartner.goals &&
            !checkListPartner.languages &&
            !checkListPartner.media &&
            !checkListPartner.technicalEquipment &&
            !checkListPartner.evaluation &&
            !checkListPartner.institutionalRequirements &&
            !checkListPartner.dataProtection
        );
    });
};

const emptyCheckListPartner: CheckListPartner = {
    username: '',
    time: false,
    format: false,
    topic: false,
    goals: false,
    languages: false,
    media: false,
    technicalEquipment: false,
    evaluation: false,
    institutionalRequirements: false,
    dataProtection: false,
};

Checklist.auth = true;
export default function Checklist() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const [usersFirstLastNames, setUsersFirstLastNames] = useState<BackendUserSnippet[]>([]);
    const prevpage = '/ve-designer/learning-environment'
    const nextpage = '/ve-designer/step-names'

    const methods = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
            checklist: [emptyCheckListPartner],
        },
    });

    const { fields } = useFieldArray({
        name: 'checklist',
        control: methods.control,
    });

    const setPlanerData = useCallback((plan: IPlan) => {
        if (
            plan.formalities &&
            Array.isArray(plan.formalities) &&
            plan.formalities.length > 0
        ) {
            methods.setValue('checklist', plan.formalities);
        }

        // fetch profile snippets to be able to display the full name instead of username only
        fetchPOST(
            '/profile_snippets',
            { usernames: [...plan.partners, plan.author] },
            session?.accessToken
        ).then((snippets: BackendProfileSnippetsResponse) => {
            setUsersFirstLastNames(snippets.user_snippets);
        });

    }, [methods, session]);

    const findPartnerFirstAndLastName = (username: string): string => {
        const findUser = usersFirstLastNames.find(
            (backendUserSnippet: BackendUserSnippet) => username === backendUserSnippet.username
        );
        if (findUser) {
            return findUser.first_name + ' ' + findUser.last_name;
        } else {
            return username;
        }
    };

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        if (areAllFormValuesEmpty(data)) return

        return [
            {
                plan_id: router.query.plannerId,
                field_name: 'formalities',
                value: data.checklist,
            },
            {
                plan_id: router.query.plannerId,
                field_name: 'progress',
                value: {
                    ...sideMenuStepsProgress,
                    formalities: ProgressState.completed,
                },
            },
        ]
    };

    function renderCheckBoxes(): JSX.Element[] {
        return fields.map((userCheckForm, index) => (
            <div key={userCheckForm.id} className="flex justify-center">
                <div className="w-4/5 space-y-3 py-8 flex flex-col">
                    <div className="flex justify-start items-center font-bold text-lg mb-4">
                        {findPartnerFirstAndLastName(userCheckForm.username)}
                    </div>
                    <div className="flex justify-start items-center">
                        <input
                            type="checkbox"
                            {...methods.register(`checklist.${index}.time`)}
                            className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                        />
                        <TooltipList
                            tooltipsTextItems={[
                                'Zeiten für die gemeinsame Vorbereitung (Zeitplan erstellen)',
                                'Zeitlicher Ablauf des VE',
                                'Zeitslots für den VE, falls synchrone Meetings geplant sind',
                            ]}
                        >
                            <p>Zeit</p>
                        </TooltipList>
                    </div>
                    <div className="flex justify-start items-center">
                        <input
                            type="checkbox"
                            {...methods.register(`checklist.${index}.format`)}
                            className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                        />
                        <TooltipList tooltipsTextItems={['Format(e) des VE']}>
                            <p>Format</p>
                        </TooltipList>
                    </div>
                    <div className="flex justify-start items-center">
                        <input
                            type="checkbox"
                            {...methods.register(`checklist.${index}.topic`)}
                            className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                        />
                        <TooltipList
                            tooltipsTextItems={[
                                'Thema / Themen des VE, welche(s) mit Modulvorgaben / dem Lehrplan aller beteiligten Partner vereinbar ist / sind',
                            ]}
                        >
                            <p>Thema</p>
                        </TooltipList>
                    </div>
                    <div className="flex justify-start items-center">
                        <input
                            type="checkbox"
                            {...methods.register(`checklist.${index}.goals`)}
                            className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                        />
                        <TooltipList
                            tooltipsTextItems={[
                                'Richtlernziele des VE, welche mit Modulvorgaben / dem Lehrplan aller beteiligter Partner verinbar sind',
                            ]}
                        >
                            <p>Ziele</p>
                        </TooltipList>
                    </div>
                    <div className="flex justify-start items-center">
                        <input
                            type="checkbox"
                            {...methods.register(`checklist.${index}.languages`)}
                            className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                        />
                        <TooltipList
                            tooltipsTextItems={[
                                'Sprache(n), in der / denen der VE stattfinden soll bzw. in denen im VE kommuniziert werden kann',
                            ]}
                        >
                            <p>Sprache(n)</p>
                        </TooltipList>
                    </div>
                    <div className="flex justify-start items-center">
                        <input
                            type="checkbox"
                            {...methods.register(`checklist.${index}.media`)}
                            className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                        />
                        <TooltipList
                            tooltipsTextItems={[
                                'Learning Management System, das im VE verwendet wird',
                            ]}
                        >
                            <p>Medien</p>
                        </TooltipList>
                    </div>
                    <div className="flex justify-start items-center">
                        <input
                            type="checkbox"
                            {...methods.register(`checklist.${index}.technicalEquipment`)}
                            className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                        />
                        <TooltipList
                            tooltipsTextItems={[
                                'Ausreichende technische Ausstattung zur Durchführung des VE',
                                'Ressourcen für technische Unterstützung während des VE',
                            ]}
                        >
                            <p>Technik</p>
                        </TooltipList>
                    </div>
                    <div className="flex justify-start items-center">
                        <input
                            type="checkbox"
                            {...methods.register(`checklist.${index}.evaluation`)}
                            className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                        />
                        <TooltipList
                            tooltipsTextItems={[
                                'Vorgehen bei der Bewertung (Art der Leistung und Bewertung), falls Prüfungsleistung im VE',
                            ]}
                        >
                            <p>Bewertung</p>
                        </TooltipList>
                    </div>
                    <div className="flex justify-start items-center">
                        <input
                            type="checkbox"
                            {...methods.register(`checklist.${index}.institutionalRequirements`)}
                            className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                        />
                        <TooltipList tooltipsTextItems={['Umgang mit Anwesenheit und Mitarbeit']}>
                            <div>
                                <p>institutionelle</p>
                                <p>Vorgaben</p>
                            </div>
                        </TooltipList>
                    </div>
                    <div className="flex justify-start items-center">
                        <input
                            type="checkbox"
                            {...methods.register(`checklist.${index}.dataProtection`)}
                            className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                        />
                        <TooltipList
                            tooltipsTextItems={[
                                'Kenntnis der relevanten Datenschutzbestimmungen deiner Institution / deines Landes',
                            ]}
                        >
                            <p>Datenschutz</p>
                        </TooltipList>
                    </div>
                </div>
            </div>
        ));
    }

    return (
        <Wrapper
            methods={methods}
            prevpage={prevpage}
            nextpage={nextpage}
            setProgress={setSideMenuStepsProgress}
            planerDataCallback={setPlanerData}
            submitCallback={onSubmit}
        >
           <div className={'text-center font-bold text-4xl mb-2 relative'}>
                An alles gedacht?
                <Tooltip tooltipsText="Mehr zu der Checkliste findest du hier in den Selbstlernmaterialien …">
                    <Link
                        target="_blank"
                        href={
                            '/learning-material/top-bubble/Herausforderungen'
                        }
                    >
                        <PiBookOpenText size={30} color="#00748f" />
                    </Link>
                </Tooltip>
            </div>
            <div className={'text-center mb-4'}>optional</div>
            <div className={'text-center'}>
                Bevor es mit der inhaltlichen und didaktischen Planung
                losgeht:
            </div>
            <div className="text-center mb-10">
                Sind die folgenden Bedingungen bei allen Beteiligten
                geklärt?
            </div>
            <div className="grid grid-cols-3 gap-1 mt-7 mb-10">
                {renderCheckBoxes()}
            </div>
        </Wrapper>
    );
}
