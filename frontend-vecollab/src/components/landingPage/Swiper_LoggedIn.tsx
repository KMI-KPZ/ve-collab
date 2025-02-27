import { MouseEvent, useState } from 'react';
import { useCookies } from 'react-cookie';
import { Navigation, Pagination, A11y } from 'swiper/modules';
import Image from 'next/image';
import H2 from '../common/H2';
import Link from 'next/link';
import ButtonSecondary from '../common/buttons/ButtonSecondary';
import { BackendUser } from '@/interfaces/api/apiInterfaces';
import { MdClose, MdEdit, MdPlayCircle } from 'react-icons/md';

import { Swiper as SwiperJS, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';

import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';

const COOKIE = 'firstvisit-home';

interface Props {
    className?: string;
    profileInformation: BackendUser;
}

Swiper_LoggedIn.auth = true;
export default function Swiper_LoggedIn({ className, profileInformation }: Props) {
    const { t } = useTranslation(['community', 'common']);
    const router = useRouter();

    const [cookies, setCookie] = useCookies([COOKIE]);
    const [firstVisit, setFirstVisit] = useState(
        cookies[COOKIE] === undefined || cookies[COOKIE] === true
    );

    const onClick = (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();

        // determine tomorrows Date for cookie expires attribute
        const expiryTomorrow = new Date();
        expiryTomorrow.setDate(expiryTomorrow.getDate() + 1);

        setCookie(COOKIE, 'false', { expires: expiryTomorrow });
        setFirstVisit(false);
    };

    const learningLeafStyle = `block absolute px-4 py-1 min-w-24 max-w-48 rounded-full bg-white
    flex font-konnect items-center justify-center text-center text-ve-collab-blue drop-shadow-lg
    hover:text-ve-collab-orange hover:border-ve-collab-orange transition ease-in-out delay-150 duration-300
    hover:-translate-y-105 hover:scale-110`;

    const getProfilePropertiesToComplete = () => (
        <>
            {profileInformation.profile.institutions.length == 0 && <li>{t('institutions')}</li>}

            {profileInformation.profile.bio == '' && <li>{t('bio')}</li>}

            {(profileInformation.profile.ve_contents.length == 0 ||
                profileInformation.profile.ve_contents.every((a) => a == '')) && (
                <li>{t('ve_contents')}</li>
            )}

            {(profileInformation.profile.ve_goals.length == 0 ||
                profileInformation.profile.ve_goals.every((a) => a == '')) && (
                <li>{t('ve_goals')}</li>
            )}

            {(profileInformation.profile.ve_interests.length == 0 ||
                profileInformation.profile.ve_interests.every((a) => a == '')) && (
                <li>{t('ve_topics')}</li>
            )}
        </>
    );

    const hasIncompleteProfile = (): boolean => {
        return (
            getProfilePropertiesToComplete().props.children.findIndex((a: any) => a !== false) > -1
        );
    };

    if (firstVisit === false) return null;

    return (
        <div className="w-11/12 min-w-96 py-2 m-auto mb-8 bg-white rounded-md relative drop-shadow">
            <div className="w-fit absolute top-3 right-3 z-10">
                <button onClick={onClick}>
                    <MdClose size={20} />
                </button>
            </div>

            <SwiperJS
                modules={[Navigation, Pagination, A11y]}
                navigation
                spaceBetween={25}
                slidesPerView={1}
            >
                {hasIncompleteProfile() && (
                    <SwiperSlide>
                        <div className="min-h-64 mx-12 my-2">
                            <H2 className="mb-4">{t('complete_profile')}</H2>

                            <p className="mb-1">{t('complete_profile_text')}</p>

                            <ul className="ml-6 mb-6 flex *:p-2 *:shadow *:rounded-md *:m-2">
                                {getProfilePropertiesToComplete()}
                            </ul>

                            <Link href={'/profile/edit'} className="absolute bottom-0">
                                <ButtonSecondary onClick={() => {}}>
                                    <MdEdit className="inline mr-1" /> {t('common:edit')}
                                </ButtonSecondary>
                            </Link>
                        </div>
                    </SwiperSlide>
                )}

                <SwiperSlide>
                    <div className="mb-4 mx-12 my-2">
                        <H2>{t('common:video_tutorials')}</H2>
                        <div
                            className={`mx-auto group m-4 w-[320px] h-[240px] rounded-md shadow relative flex items-center justify-center cursor-pointer absolute transition ease-in-out hover:scale-105`}
                            onClick={(e) => {
                                router.push('/help');
                            }}
                        >
                            <Image
                                src={'/images/video-thumbnails/screencast.png'}
                                alt={t('common:video_tutorials')}
                                width={320}
                                height={144}
                                className="w-full h-auto absolute rounded-md"
                            />
                            <MdPlayCircle
                                className="absolute text-gray-500 hover:text-gray-800"
                                size={32}
                            />
                        </div>
                    </div>
                </SwiperSlide>

                <SwiperSlide>
                    <div className="mx-12 my-2 items-center">
                        <H2>{t('recommended_materials')}</H2>
                        <p className="mb-1">{t('recommended_materials_text')}</p>
                        {/* disclaimer message if language is set to non-german */}
                        {router.locale !== 'de' && (
                            <div className="text-gray-500 text-sm">
                                {t('common:materials_only_german')}
                            </div>
                        )}
                        <div className="relative w-32 mx-auto mt-[3.5rem]">
                            <div className="w-32 h-32 z-10 relative text-white font-bold rounded-full bg-footer-pattern bg-center bg-cover drop-shadow-lg opacity-85 flex justify-center items-center">
                                VE Collab
                            </div>

                            <Link
                                href={
                                    '/learning-material/1/Einf%C3%BChrung/Was%20ist%20ein%20Virtueller%20Austausch'
                                }
                                className={`${learningLeafStyle} -top-[1rem] -left-[5rem]`}
                            >
                                Einführung
                            </Link>

                            <Link
                                href={
                                    '/learning-material/1/Beispiele%20aus%20der%20Praxis/VE-Beispiele%20aus%20der%20Praxis'
                                }
                                className={`${learningLeafStyle} top-[0rem] -right-[6.5rem]`}
                            >
                                VE-Beispiele
                            </Link>

                            <Link
                                href={'/learning-material/3/Tools'}
                                className={`${learningLeafStyle} bottom-[1rem] -left-[5.5rem]`}
                            >
                                Tools
                            </Link>

                            <Link
                                href={
                                    '/learning-material/4/Interaktion%20und%20kollaboratives%20Arbeiten'
                                }
                                className={`${learningLeafStyle} -bottom-[2.2rem] -right-[9.5rem]`}
                            >
                                Kollaboratives Arbeiten
                            </Link>
                        </div>
                    </div>
                </SwiperSlide>
            </SwiperJS>
        </div>
    );
}
