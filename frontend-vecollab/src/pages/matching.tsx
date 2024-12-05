import AuthenticatedImage from '@/components/common/AuthenticatedImage';
import BoxHeadline from '@/components/common/BoxHeadline';
import LoadingAnimation from '@/components/common/LoadingAnimation';
import { useGetMatching } from '@/lib/backend';
import { GetStaticPropsContext } from 'next';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { useState } from 'react';
import CustomHead from '@/components/metaData/CustomHead';

Matching.auth = true;
Matching.autoForward = true;
export default function Matching() {
    const { data: session } = useSession();
    const { t } = useTranslation(['community', 'common']);

    const router = useRouter();

    const [triggerMatching, setTriggerMatching] = useState<boolean>(false);

    const {
        data: matchedUserSnippets,
        isLoading,
        error,
        mutate,
    } = useGetMatching(triggerMatching, session!.accessToken);

    const getMatchingCandidates = () => {
        setTriggerMatching(true);
    };

    return (
        <>
            <CustomHead pageTitle={t('matching')} pageSlug={'matching'} />
            <div className="gap-y-6 w-full p-12 items-center flex flex-col justify-content">
                <div>
                    <h1 className="text-center font-bold text-4xl mb-2">{t('matching')}</h1>
                    <div className="text-center mb-14 w-[30rem]">{t('matching_instructions')}</div>
                    <div className="flex justify-around w-full mb-8">
                        <button
                            className={
                                'bg-ve-collab-orange border text-white py-3 px-6 rounded-lg shadow-xl'
                            }
                            onClick={getMatchingCandidates}
                        >
                            <span>{t('find_partners')}</span>
                        </button>
                    </div>
                    {isLoading ? (
                        <LoadingAnimation />
                    ) : (
                        <div className="max-h-[30rem] overflow-y-auto content-scrollbar">
                            {matchedUserSnippets.map((snippet, index) => (
                                <li key={index} className="flex py-2">
                                    <div className="flex">
                                        <div className="flex justify-center items-center mx-4 font-bold text-3xl">
                                            {index + 1}
                                        </div>
                                        <div
                                            className="flex cursor-pointer"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                router.push(`/profile/user/${snippet.username}`);
                                            }}
                                        >
                                            <div>
                                                <AuthenticatedImage
                                                    imageId={snippet.profile_pic}
                                                    alt={t('profile_picture')}
                                                    width={60}
                                                    height={60}
                                                    className="rounded-full"
                                                ></AuthenticatedImage>
                                            </div>
                                            <div>
                                                <BoxHeadline
                                                    title={
                                                        snippet.first_name + ' ' + snippet.last_name
                                                    }
                                                />
                                                <div className="mx-2 px-1 my-1 text-gray-600">
                                                    {snippet.institution}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export async function getStaticProps({ locale }: GetStaticPropsContext) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common', 'community'])),
        },
    };
}
