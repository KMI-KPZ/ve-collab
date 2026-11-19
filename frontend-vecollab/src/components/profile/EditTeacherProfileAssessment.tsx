import { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import EditProfileHeader from './EditProfileHeader';
import EditProfileHeadline from './EditProfileHeadline';
import EditProfileVerticalSpacer from './EditProfileVerticalSpacer';
import { TeacherProfileAssessment } from '@/interfaces/profile/profileInterfaces';
import {
    countAnswered,
    LIKERT_VALUES,
    TEACHER_PROFILE_QUESTION_IDS,
    TEACHER_PROFILE_QUESTIONS,
    TeacherProfileAnswers,
} from '@/components/methods/teacherProfileAssessment';

interface Props {
    answers: TeacherProfileAnswers;
    onAnswersChange(answers: TeacherProfileAnswers): void;
    /** the last saved assessment, null if the user has not made one yet */
    savedAssessment: TeacherProfileAssessment | null;
    updateProfileData(evt: FormEvent): Promise<void>;
    orcid: string | null | undefined;
    importOrcidProfile(evt: FormEvent): Promise<void>;
}

export default function EditTeacherProfileAssessment({
    answers,
    onAnswersChange,
    savedAssessment,
    updateProfileData,
    orcid,
    importOrcidProfile,
}: Props) {
    const { t } = useTranslation(['community', 'common']);
    const router = useRouter();

    const answered = countAnswered(answers);
    const total = TEACHER_PROFILE_QUESTION_IDS.length;

    return (
        <form onSubmit={updateProfileData}>
            <EditProfileHeader orcid={orcid} importOrcidProfile={importOrcidProfile} />
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={t('teacher_profile_assessment.title')} />
                <p className="mb-2 text-sm">{t('teacher_profile_assessment.intro')}</p>
                {savedAssessment && (
                    <p className="mb-2 text-sm text-gray-500">
                        {t('teacher_profile_assessment.last_updated', {
                            date: new Date(savedAssessment.updated_at).toLocaleDateString(
                                router.locale
                            ),
                        })}{' '}
                        <Link href="/methods" className="text-ve-collab-blue underline">
                            {t('teacher_profile_assessment.to_methods')}
                        </Link>
                    </p>
                )}

                <div className="my-4 border border-slate-300 rounded-xl overflow-hidden">
                    <table className="table-fixed w-full border-collapse">
                        <thead>
                            <tr className="border-b border-slate-300 bg-slate-100">
                                <th className="w-2/5"></th>
                                {LIKERT_VALUES.map((value) => (
                                    <th key={value} className="p-2 text-center text-xs font-medium">
                                        {t(`teacher_profile_assessment.likert.${value}`)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {TEACHER_PROFILE_QUESTIONS.map(({ key, questionIds }) => (
                                <QuestionGroup
                                    key={key}
                                    title={t(`teacher_profile_assessment.dimensions.${key}`)}
                                    questionIds={questionIds}
                                    answers={answers}
                                    onAnswersChange={onAnswersChange}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                        {t('teacher_profile_assessment.progress', { answered, total })}
                    </span>
                    <button
                        type="button"
                        onClick={() => onAnswersChange({})}
                        disabled={answered === 0}
                        className="py-1 px-3 border border-ve-collab-orange rounded-lg cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {t('teacher_profile_assessment.reset')}
                    </button>
                </div>
                {answered < total && (answered > 0 || savedAssessment) && (
                    <p className="mt-2 text-sm text-ve-collab-orange">
                        {t('teacher_profile_assessment.incomplete')}
                        {savedAssessment &&
                            ' ' + t('teacher_profile_assessment.incomplete_keeps_previous')}
                    </p>
                )}
            </EditProfileVerticalSpacer>
        </form>
    );
}

interface QuestionGroupProps {
    title: string;
    questionIds: string[];
    answers: TeacherProfileAnswers;
    onAnswersChange(answers: TeacherProfileAnswers): void;
}

function QuestionGroup({ title, questionIds, answers, onAnswersChange }: QuestionGroupProps) {
    const { t } = useTranslation(['community', 'common']);

    return (
        <>
            <tr className="border-b border-slate-300 bg-slate-50">
                <th colSpan={LIKERT_VALUES.length + 1} className="p-2 text-left font-semibold">
                    {title}
                </th>
            </tr>
            {questionIds.map((id) => {
                const question = t(`teacher_profile_assessment.questions.${id}`);
                return (
                    <tr key={id} className="border-b border-slate-200 last:border-b-0">
                        <td className="p-2 text-sm">{question}</td>
                        {LIKERT_VALUES.map((value) => (
                            <td key={value} className="p-2 text-center">
                                <input
                                    type="radio"
                                    name={id}
                                    value={value}
                                    checked={answers[id] === value}
                                    onChange={() => onAnswersChange({ ...answers, [id]: value })}
                                    aria-label={`${question}: ${t(
                                        `teacher_profile_assessment.likert.${value}`
                                    )}`}
                                    className="cursor-pointer accent-ve-collab-orange"
                                />
                            </td>
                        ))}
                    </tr>
                );
            })}
        </>
    );
}
