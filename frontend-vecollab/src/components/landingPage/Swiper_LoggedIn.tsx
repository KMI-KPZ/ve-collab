import { MouseEvent, useState } from 'react';
import { useCookies } from 'react-cookie';
import { Navigation, Pagination, A11y } from 'swiper/modules';
import Image from 'next/image';
import H2 from '../common/H2';
import Link from 'next/link';
import ButtonSecondary from '../common/buttons/ButtonSecondary';
import { BackendUser } from '@/interfaces/api/apiInterfaces';
import { MdClose, MdEdit } from 'react-icons/md';

import { Swiper as SwiperJS, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';

import veCollabLogo from '@/images/veCollabLogo.png';

const FIRST_VISIT = 'first_visit';

interface Props {
    className: string;
    profileInformation: BackendUser;
}

Swiper_LoggedIn.auth = true;
export default function Swiper_LoggedIn({ className, profileInformation }: Props) {
    const [cookies, setCookie] = useCookies([FIRST_VISIT]);
    const [firstVisit, setFirstVisit] = useState(
        cookies[FIRST_VISIT] === undefined || cookies[FIRST_VISIT] === true
    );

    const onClick = (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();

        // determine tomorrows Date for cookie expires attribute
        const expiryTomorrow = new Date();
        expiryTomorrow.setDate(expiryTomorrow.getDate() + 1);

        setCookie(FIRST_VISIT, 'false', { expires: expiryTomorrow });
        setFirstVisit(false);
    };

    const learningLeafStyle = `block absolute px-4 py-1 min-w-24 max-w-48 rounded-full bg-white
    flex font-konnect items-center justify-center text-center text-ve-collab-blue drop-shadow-lg
    hover:text-ve-collab-orange hover:border-ve-collab-orange transition ease-in-out delay-150 duration-300
    hover:-translate-y-105 hover:scale-110`;

    if (!firstVisit) return null;

    return (
        <div className="w-11/12 min-w-96 py-2 m-auto mb-8 bg-white rounded-md relative">
            <div className="w-fit absolute top-3 right-3">
                <button onClick={onClick} className="">
                    <MdClose size={20} />
                </button>
            </div>

            <SwiperJS
                modules={[Navigation, Pagination, A11y]}
                navigation
                spaceBetween={25}
                slidesPerView={1}
            >
                <SwiperSlide>
                    <div className="min-h-64 mx-12 my-2">
                        <H2 className="mb-4">Profil vervollständigen</H2>

                        <p className="mb-1">
                            Die Vervollständigung des Profils hilft anderen Benutzer:innen, dich für
                            einen VE zu finden. Folgende Daten sind zum Beispiel noch nicht
                            ausgefüllt:
                        </p>

                        <ul className="ml-6 mb-6 flex *:p-2 *:shadow *:rounded-md *:m-2">
                            {profileInformation.profile.institutions.length == 0 && (
                                <li>Institutionen</li>
                            )}

                            {profileInformation.profile.bio == '' && <li>Bio</li>}

                            {(profileInformation.profile.ve_contents.length == 0 ||
                                profileInformation.profile.ve_contents.every((a) => a == '')) && (
                                <li>VE Contents</li>
                            )}

                            {(profileInformation.profile.ve_goals.length == 0 ||
                                profileInformation.profile.ve_goals.every((a) => a == '')) && (
                                <li>VE Ziele</li>
                            )}

                            {(profileInformation.profile.ve_interests.length == 0 ||
                                profileInformation.profile.ve_interests.every((a) => a == '')) && (
                                <li>VE Interessen</li>
                            )}
                        </ul>

                        <Link href={'/profile/edit'} className="absolute bottom-0">
                            <ButtonSecondary onClick={() => {}}>
                                <MdEdit className="inline mr-1" /> bearbeiten
                            </ButtonSecondary>
                        </Link>
                    </div>
                </SwiperSlide>

                <SwiperSlide>
                    <div className="mb-4 mx-12 my-2">
                        <H2>Tour</H2>
                        <video
                            width="320"
                            height="240"
                            controls
                            preload="none"
                            className="w-full h-auto m-auto rounded-md"
                        >
                            <source src="/videos/screencast-web.webm" type="video/webm" />
                            Your browser does not support the video tag.
                        </video>
                    </div>
                </SwiperSlide>

                <SwiperSlide>
                    <div className="mx-12 my-2 items-center">
                        <H2>Empfohlenes Lernmaterial</H2>
                        <p className="mb-1">
                            Für den Einstieg in die Erstellung und Bearbeitung eines VE empfehlen
                            wir folgende Lernmaterialien
                        </p>
                        <div className="relative w-32 mx-auto mt-[2rem]">
                            <div
                                className="w-32 h-32 z-10 block relative rounded-full
    bg-footer-pattern bg-center bg-cover drop-shadow-lg opacity-85 flex justify-center items-center #
    transition ease-in-out delay-150 duration-300 hover:-translate-y-1 hover:scale-110"
                            >
                                <Image
                                    src={veCollabLogo}
                                    alt="Ve Collab Logo"
                                    width={75}
                                    className="hover:scale-110 drop-shadow-[0_0_8px_#fff]"
                                ></Image>
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
                                href={'/learning-material//3/Tools'}
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
