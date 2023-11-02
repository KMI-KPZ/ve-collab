import React from 'react';
import { useGetPlanById } from '@/lib/backend';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import LoadingAnimation from '@/components/LoadingAnimation';

// TODO what if values empty? -> maybe (/) sign
// TODO aufklappbar

// authentication is required on this page
PlanSummarySlug.auth = true;
export default function PlanSummarySlug() {
    const router = useRouter();
    const { data: session } = useSession();
    const currentPlanId: string = router.query.planSummarySlug as string;
    const {
        data: plan,
        isLoading,
        error,
        mutate,
    } = useGetPlanById(session!.accessToken, currentPlanId);
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
                                <div className="text-xl font-semibold mb-4">Eigenschaften</div>
                                <ul className="grid grid-cols-4 gap-8">
                                    <span className="font-semibold pr-5">Partners:</span>
                                    <ul className="flex flex-col space-y-2 col-span-3">
                                        {plan.partners.map((partner, index) => (
                                            <li
                                                className="flex w-fit bg-gray-100 rounded-lg p-2"
                                                key={index}
                                            >
                                                {partner}
                                            </li>
                                        ))}
                                    </ul>
                                    <span className="font-semibold pr-5">Externe Beteidigte:</span>
                                    <ul className="flex flex-col space-y-3 col-span-3">
                                        {plan.involved_parties.map((party, index) => (
                                            <li
                                                className="flex w-fit bg-gray-100 rounded-lg p-2"
                                                key={index}
                                            >
                                                {party}
                                            </li>
                                        ))}
                                    </ul>
                                    <span className="font-semibold pr-5">Institutionen:</span>
                                    <div className="grid grid-cols-2 col-span-3">
                                        {plan.institutions.map((institution, index) => (
                                            <div
                                                key={index}
                                                className="grid grid-cols-2 p-5 mr-3 mb-3 bg-gray-100 rounded-lg space-x-2"
                                            >
                                                <ul className="space-y-1 mr-2">
                                                    <li className="font-medium"> Name </li>
                                                    <li className="font-medium"> Schulform </li>
                                                    <li className="font-medium"> Land </li>
                                                    <li className="font-medium">Abteilungsname</li>
                                                    <li className="font-medium">
                                                        Beteidigte Studiengänge
                                                    </li>
                                                </ul>
                                                <ul className="space-y-1">
                                                    <li>{institution.name} </li>
                                                    <li>{institution.school_type} </li>
                                                    <li>{institution.country} </li>
                                                    <li>{institution.departments} </li>
                                                    <li>{institution.academic_courses} </li>
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                    <span className="font-semibold pr-5">Lehrveranstaltungen:</span>
                                    <div className="grid grid-cols-2 col-span-3">
                                        {plan.lectures.map((lecture, index) => (
                                            <div
                                                key={index}
                                                className="grid grid-cols-2 p-5 mr-3 mb-3 bg-gray-100 rounded-lg space-x-2"
                                            >
                                                <ul className="space-y-1 mr-2">
                                                    <li className="font-medium"> Name </li>
                                                    <li className="font-medium"> Typ </li>
                                                    <li className="font-medium"> Format </li>
                                                    <li className="font-medium">Teilnehmerzahl</li>
                                                </ul>
                                                <ul className="space-y-1">
                                                    <li>{lecture.name} </li>
                                                    <li>{lecture.lecture_type} </li>
                                                    <li>{lecture.lecture_format} </li>
                                                    <li>{lecture.participants_amount} </li>
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                    <span className="font-semibold pr-5">Zielgruppen:</span>
                                    <div className="grid grid-cols-2 col-span-3">
                                        {plan.audience.map((studyGroup, index) => (
                                            <div
                                                key={index}
                                                className="grid grid-cols-2 p-5 mr-3 mb-3 bg-gray-100 rounded-lg space-x-2"
                                            >
                                                <ul className="space-y-1 mr-2">
                                                    <li className="font-medium"> Name </li>
                                                    <li className="font-medium"> Alter </li>
                                                    <li className="font-medium"> Erfahrung </li>
                                                    <li className="font-medium">Studiengang</li>
                                                    <li className="font-medium">Muttersprache</li>
                                                    <li className="font-medium">Fremdsprachen</li>
                                                    <li className="font-medium">Lernziele</li>
                                                </ul>
                                                <ul className="space-y-1">
                                                    <li>{studyGroup.name} </li>
                                                    <li>
                                                        {studyGroup.age_min} - {studyGroup.age_max}
                                                    </li>
                                                    <li>{studyGroup.experience} </li>
                                                    <li>{studyGroup.academic_course} </li>
                                                    <li>{studyGroup.mother_tongue} </li>
                                                    <li>{studyGroup.foreign_languages} </li>
                                                    <li>{studyGroup.learning_goal} </li>
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                    <span className="font-semibold pr-5">Thema:</span>
                                    <ul className="flex flex-col col-span-3">
                                        <li className="flex w-fit bg-gray-100 rounded-lg p-2">
                                            {plan.topic}
                                        </li>
                                    </ul>
                                    <span className="font-semibold pr-5">Sprachen:</span>
                                    <ul className="flex flex-col space-y-2 col-span-3">
                                        {plan.languages.map((language, index) => (
                                            <li
                                                className="flex w-fit bg-gray-100 rounded-lg p-2"
                                                key={index}
                                            >
                                                {language}
                                            </li>
                                        ))}
                                    </ul>
                                    <span className="font-semibold pr-5">Neue Inhalte:</span>
                                    <ul className="flex flex-col col-span-3">
                                        <li className="flex w-fit bg-gray-100 rounded-lg p-2">
                                            {plan.new_content ? 'Ja' : 'Nein'}
                                        </li>
                                    </ul>
                                    <span className="font-semibold pr-5">Digitale Umsetzung:</span>
                                    <ul className="flex flex-col col-span-3">
                                        <li className="flex w-fit bg-gray-100 rounded-lg p-2">
                                            {plan.realization}
                                        </li>
                                    </ul>
                                    <span className="font-semibold pr-5">
                                        Digitale Lernumgebung:
                                    </span>
                                    <ul className="flex flex-col col-span-3">
                                        <li className="flex w-fit bg-gray-100 rounded-lg p-2">
                                            {plan.learning_env}
                                        </li>
                                    </ul>
                                    <span className="font-semibold pr-5">Tools:</span>
                                    <ul className="flex flex-col space-y-2 col-span-3">
                                        {plan.tools.map((toolObject, index) => (
                                            <li
                                                className="flex w-fit bg-gray-100 rounded-lg p-2"
                                                key={index}
                                            >
                                                {toolObject.tool}
                                            </li>
                                        ))}
                                    </ul>
                                </ul>
                                <hr className="h-px my-10 bg-gray-200 border-0 dark:bg-gray-300" />
                                <div className="text-xl font-semibold mb-4">Etappen</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
