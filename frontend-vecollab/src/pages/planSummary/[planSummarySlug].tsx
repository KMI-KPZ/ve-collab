import React from 'react';
import { useGetPlanById } from '@/lib/backend';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import LoadingAnimation from '@/components/LoadingAnimation';

// TODO aufklappbar
// TODO abstände anpassen

// TODO Idee: Klappen in Eigenschaften untereinander und standart zu geklappt

// authentication is required on this page
PlanSummarySlug.auth = true;
export default function PlanSummarySlug() {
    const router = useRouter();
    const { data: session } = useSession();
    const currentPlanId: string = router.query.planSummarySlug as string;
    const { data: plan, isLoading } = useGetPlanById(session!.accessToken, currentPlanId);

    const convertDateToLocal = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('de-DE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const showDataOrEmptySign = (data: any) => {
        if (data === null || data === undefined || data === '') {
            return '/';
        } else {
            return data;
        }
    };

    return (
        <>
            <div className="flex justify-center bg-pattern-left-blue-small bg-no-repeat">
                <div className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-content">
                    <div>
                        <div className={'text-center font-bold text-4xl mb-2'}>{plan.name}</div>
                        <div className={'text-center mb-10'}>Zusammenfassung des Plans</div>
                    </div>
                    <div className="flex flex-wrap">
                        {isLoading ? (
                            <LoadingAnimation />
                        ) : (
                            <div className="bg-white rounded-lg p-4">
                                <div className="text-2xl font-semibold mb-4">Eigenschaften</div>
                                <ul className="grid grid-cols-4 gap-8 border-2 border-gray-400 rounded-3xl p-4">
                                    <span className="font-semibold pr-5">Partners:</span>
                                    <ul className="flex flex-col space-y-2 col-span-3">
                                        {plan.partners.length !== 0 ? (
                                            plan.partners.map((partner, index) => (
                                                <li
                                                    className="flex w-fit bg-slate-200 rounded-lg p-2"
                                                    key={index}
                                                >
                                                    {showDataOrEmptySign(partner)}
                                                </li>
                                            ))
                                        ) : (
                                            <li className="flex w-fit bg-slate-200 rounded-lg p-2">
                                                /
                                            </li>
                                        )}
                                    </ul>
                                    <span className="text-base font-semibold pr-5">
                                        Externe Beteidigte:
                                    </span>
                                    <ul className="flex flex-col space-y-3 col-span-3">
                                        {plan.involved_parties.length !== 0 ? (
                                            plan.involved_parties.map((party, index) => (
                                                <li
                                                    className="flex w-fit bg-slate-200 rounded-lg p-2"
                                                    key={index}
                                                >
                                                    {showDataOrEmptySign(party)}
                                                </li>
                                            ))
                                        ) : (
                                            <li className="flex w-fit bg-slate-200 rounded-lg p-2">
                                                /
                                            </li>
                                        )}
                                    </ul>
                                    <span className="font-semibold pr-5">Institutionen:</span>
                                    <div className="grid grid-cols-2 col-span-3">
                                        {plan.institutions.length !== 0 ? (
                                            plan.institutions.map((institution, index) => (
                                                <div
                                                    key={index}
                                                    className="grid grid-cols-2 p-5 mr-3 mb-3 bg-slate-200 rounded-lg space-x-2"
                                                >
                                                    <ul className="space-y-1 mr-2">
                                                        <li className="font-medium"> Name </li>
                                                        <li className="font-medium"> Schulform </li>
                                                        <li className="font-medium"> Land </li>
                                                        <li className="font-medium">
                                                            Abteilungsname
                                                        </li>
                                                        <li className="font-medium">
                                                            Beteidigte Studiengänge
                                                        </li>
                                                    </ul>
                                                    <ul className="space-y-1">
                                                        <li>
                                                            {showDataOrEmptySign(institution.name)}
                                                        </li>
                                                        <li>
                                                            {showDataOrEmptySign(
                                                                institution.school_type
                                                            )}
                                                        </li>
                                                        <li>
                                                            {showDataOrEmptySign(
                                                                institution.country
                                                            )}
                                                        </li>
                                                        <li>
                                                            {showDataOrEmptySign(
                                                                institution.departments
                                                            )}
                                                        </li>
                                                        <li>
                                                            {showDataOrEmptySign(
                                                                institution.academic_courses
                                                            )}
                                                        </li>
                                                    </ul>
                                                </div>
                                            ))
                                        ) : (
                                            <li className="flex w-fit bg-slate-200 rounded-lg p-2">
                                                /
                                            </li>
                                        )}
                                    </div>
                                    <span className="font-semibold pr-5">Lehrveranstaltungen:</span>
                                    <div className="grid grid-cols-2 col-span-3">
                                        {plan.lectures.length !== 0 ? (
                                            plan.lectures.map((lecture, index) => (
                                                <div
                                                    key={index}
                                                    className="grid grid-cols-2 p-5 mr-3 mb-3 bg-slate-200 rounded-lg space-x-2"
                                                >
                                                    <ul className="space-y-1 mr-2">
                                                        <li className="font-medium"> Name </li>
                                                        <li className="font-medium"> Typ </li>
                                                        <li className="font-medium"> Format </li>
                                                        <li className="font-medium">
                                                            Teilnehmerzahl
                                                        </li>
                                                    </ul>
                                                    <ul className="space-y-1">
                                                        <li>
                                                            {showDataOrEmptySign(lecture.name)}{' '}
                                                        </li>
                                                        <li>
                                                            {showDataOrEmptySign(
                                                                lecture.lecture_type
                                                            )}
                                                        </li>
                                                        <li>
                                                            {showDataOrEmptySign(
                                                                lecture.lecture_format
                                                            )}
                                                        </li>
                                                        <li>
                                                            {showDataOrEmptySign(
                                                                lecture.participants_amount
                                                            )}
                                                        </li>
                                                    </ul>
                                                </div>
                                            ))
                                        ) : (
                                            <li className="flex w-fit bg-slate-200 rounded-lg p-2">
                                                /
                                            </li>
                                        )}
                                    </div>
                                    <span className="font-semibold pr-5">Zielgruppen:</span>
                                    <div className="grid grid-cols-2 col-span-3">
                                        {plan.audience.length !== 0 ? (
                                            plan.audience.map((studyGroup, index) => (
                                                <div
                                                    key={index}
                                                    className="grid grid-cols-2 p-5 mr-3 mb-3 bg-slate-200 rounded-lg space-x-2"
                                                >
                                                    <ul className="space-y-1 mr-2">
                                                        <li className="font-medium"> Name </li>
                                                        <li className="font-medium"> Alter </li>
                                                        <li className="font-medium"> Erfahrung </li>
                                                        <li className="font-medium">Studiengang</li>
                                                        <li className="font-medium">
                                                            Muttersprache
                                                        </li>
                                                        <li className="font-medium">
                                                            Fremdsprachen
                                                        </li>
                                                        <li className="font-medium">Lernziele</li>
                                                    </ul>
                                                    <ul className="space-y-1">
                                                        <li>
                                                            {showDataOrEmptySign(studyGroup.name)}{' '}
                                                        </li>
                                                        <li>
                                                            {showDataOrEmptySign(
                                                                studyGroup.age_min
                                                            )}
                                                            {' - '}
                                                            {showDataOrEmptySign(
                                                                studyGroup.age_max
                                                            )}
                                                        </li>
                                                        <li>
                                                            {showDataOrEmptySign(
                                                                studyGroup.experience
                                                            )}
                                                        </li>
                                                        <li>
                                                            {showDataOrEmptySign(
                                                                studyGroup.academic_course
                                                            )}
                                                        </li>
                                                        <li>
                                                            {showDataOrEmptySign(
                                                                studyGroup.mother_tongue
                                                            )}
                                                        </li>
                                                        <li>
                                                            {showDataOrEmptySign(
                                                                studyGroup.foreign_languages
                                                            )}
                                                        </li>
                                                        <li>
                                                            {showDataOrEmptySign(
                                                                studyGroup.learning_goal
                                                            )}
                                                        </li>
                                                    </ul>
                                                </div>
                                            ))
                                        ) : (
                                            <li className="flex w-fit bg-slate-200 rounded-lg p-2">
                                                /
                                            </li>
                                        )}
                                    </div>
                                    <span className="font-semibold pr-5">Thema:</span>
                                    <ul className="flex flex-col col-span-3">
                                        <li className="flex w-fit bg-slate-200 rounded-lg p-2">
                                            {showDataOrEmptySign(plan.topic)}
                                        </li>
                                    </ul>
                                    <span className="font-semibold pr-5">Sprachen:</span>
                                    <ul className="flex flex-col space-y-2 col-span-3">
                                        {plan.languages.length !== 0 ? (
                                            plan.languages.map((language, index) => (
                                                <li
                                                    className="flex w-fit bg-slate-200 rounded-lg p-2"
                                                    key={index}
                                                >
                                                    {showDataOrEmptySign(language)}
                                                </li>
                                            ))
                                        ) : (
                                            <li className="flex w-fit bg-slate-200 rounded-lg p-2">
                                                /
                                            </li>
                                        )}
                                    </ul>
                                    <span className="font-semibold pr-5">Neue Inhalte:</span>
                                    <ul className="flex flex-col col-span-3">
                                        <li className="flex w-fit bg-slate-200 rounded-lg p-2">
                                            {plan.new_content
                                                ? plan.new_content
                                                    ? 'Ja'
                                                    : 'Nein'
                                                : '/'}
                                        </li>
                                    </ul>
                                    <span className="font-semibold pr-5">Digitale Umsetzung:</span>
                                    <ul className="flex flex-col col-span-3">
                                        <li className="flex w-fit bg-slate-200 rounded-lg p-2">
                                            {showDataOrEmptySign(plan.realization)}
                                        </li>
                                    </ul>
                                    <span className="font-semibold pr-5">
                                        Digitale Lernumgebung:
                                    </span>
                                    <ul className="flex flex-col col-span-3">
                                        <li className="flex w-fit bg-slate-200 rounded-lg p-2">
                                            {showDataOrEmptySign(plan.learning_env)}
                                        </li>
                                    </ul>
                                    <span className="font-semibold pr-5">Tools:</span>
                                    <ul className="flex flex-col space-y-2 col-span-3">
                                        {plan.tools.length !== 0 ? (
                                            plan.tools.map((toolObject, index) => (
                                                <li
                                                    className="flex w-fit bg-slate-200 rounded-lg p-2"
                                                    key={index}
                                                >
                                                    {showDataOrEmptySign(toolObject.tool)}
                                                </li>
                                            ))
                                        ) : (
                                            <li className="flex w-fit bg-slate-200 rounded-lg p-2">
                                                /
                                            </li>
                                        )}
                                    </ul>
                                </ul>
                                <hr className="h-px my-10 bg-gray-400 border-0" />
                                <div className="text-2xl font-semibold mb-4 ml-4">Etappen</div>
                                {plan.steps.map((fineStep, index) => (
                                    <div
                                        className="p-4 my-8 bg-white border-2 border-gray-400 rounded-3xl"
                                        key={index}
                                    >
                                        <div className="flex justify-center items-center space-x-10">
                                            <div className="flex">
                                                <div className="font-bold text-xl mx-2">
                                                    Etappe:
                                                </div>
                                                <div className="font-bold text-xl">
                                                    {showDataOrEmptySign(fineStep.name)}
                                                </div>
                                            </div>
                                            <div className="flex">
                                                <div className="font-bold mx-2">Zeitspanne:</div>
                                                <div className="mx-2">
                                                    {showDataOrEmptySign(
                                                        convertDateToLocal(fineStep.timestamp_from)
                                                    )}
                                                    {' - '}
                                                    {showDataOrEmptySign(
                                                        convertDateToLocal(fineStep.timestamp_to)
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex">
                                            <div className="w-1/6 flex items-center">
                                                <p className="font-semibold px-2 py-2">Workload</p>
                                            </div>
                                            <div className="flex items-center w-fit bg-slate-200 rounded-lg px-3">
                                                {showDataOrEmptySign(fineStep.workload) +
                                                    ' Stunden'}
                                            </div>
                                        </div>
                                        <div className="mt-4 flex">
                                            <div className="w-1/6 flex items-center">
                                                <p className="font-semibold px-2 py-2 flex items-center">
                                                    Sozialform
                                                </p>
                                            </div>
                                            <div className="flex items-center w-fit bg-slate-200 rounded-lg px-3">
                                                {showDataOrEmptySign(fineStep.social_form)}
                                            </div>
                                        </div>
                                        <div className="mt-4 flex">
                                            <div className="w-1/6 flex items-center">
                                                <p className="font-semibold px-2 py-2 ">
                                                    digitale Lernumgebung
                                                </p>
                                            </div>
                                            <div className="flex items-center w-fit bg-slate-200 rounded-lg px-3">
                                                {showDataOrEmptySign(fineStep.learning_env)}
                                            </div>
                                        </div>
                                        <div className="mt-4 flex">
                                            <div className="w-1/6 flex items-center">
                                                <p className="font-semibold px-2 py-2">VE-Ansatz</p>
                                            </div>
                                            <div className="flex items-center w-fit bg-slate-200 rounded-lg px-3">
                                                {showDataOrEmptySign(fineStep.ve_approach)}
                                            </div>
                                        </div>
                                        <div className="mt-4 flex">
                                            <div className="font-semibold w-1/6 flex items-center px-2 py-2px-2 py-2">
                                                Aufgabenstellungen
                                            </div>
                                            {fineStep.tasks.map((task, taskIndex) => (
                                                <div
                                                    className="flex flex-col space-y-1 w-1/2 p-4 my-4 mx-2 bg-slate-200 rounded-3xl shadow-2xl "
                                                    key={taskIndex}
                                                >
                                                    <div className="flex space-x-8">
                                                        <span className="w-1/4 font-medium">
                                                            Titel:
                                                        </span>
                                                        <span>
                                                            {showDataOrEmptySign(task.title)}
                                                        </span>
                                                    </div>
                                                    <div className="flex space-x-8">
                                                        <span className="w-1/4 font-medium">
                                                            Beschreibung:
                                                        </span>
                                                        <span>
                                                            {showDataOrEmptySign(task.description)}
                                                        </span>
                                                    </div>
                                                    <div className="flex space-x-8">
                                                        <span className="w-1/4 font-medium">
                                                            Lernziele:
                                                        </span>
                                                        <span>
                                                            {showDataOrEmptySign(
                                                                task.learning_goal
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="flex space-x-8">
                                                        <span className="w-1/4 font-medium">
                                                            Beschreibung:
                                                        </span>
                                                        <span>
                                                            {showDataOrEmptySign(task.description)}
                                                        </span>
                                                    </div>
                                                    <div className="flex space-x-8">
                                                        <span className="w-1/4 font-medium">
                                                            Lernziel:
                                                        </span>
                                                        <span>
                                                            {showDataOrEmptySign(
                                                                task.learning_goal
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="flex space-x-8">
                                                        <span className="w-1/4 font-medium">
                                                            Tools:
                                                        </span>
                                                        <span>
                                                            {showDataOrEmptySign(
                                                                task.tools
                                                                    .filter(
                                                                        (element) => element !== ''
                                                                    )
                                                                    .join(', ')
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

// plan.task.tools (doppel string join )
