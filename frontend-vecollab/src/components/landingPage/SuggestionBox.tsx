import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { MdArrowRight } from 'react-icons/md';
import H2 from '../common/H2';

interface Props {
    className?: string;
}

SuggestionBox.auth = true;
export default function SuggestionBox({ className }: Props) {
    const { t } = useTranslation(['community', 'common']);

    const WrapperBox = ({ children }: { children: React.ReactNode }) => {
        return (
            <div className="w-full m-6 rounded-md bg-white p-6 relative overflow-hidden drop-shadow-lg">
                <div className="bg-ve-collab-orange-light w-[272px] h-[272px] -bottom-[136px] -right-[136px] absolute -z-10 rotate-45"></div>
                <div className="bg-ve-collab-orange/75 w-[232px] h-[232px] -bottom-[116px] -right-[116px] absolute -z-10 rotate-45"></div>
                {children}
            </div>
        );
    };

    const SuggestedMaterials = () => {
        return (
            <>
                <H2>{t('suggested_materials')}</H2>
                <ul className="d1ivide-y *:px-4 *:py-2 *:rounded-full *:shadow *:my-2 *:text-ve-collab-blue">
                    <li className="hover:bg-slate-50 hover:text-ve-collab-orange transition ease-in-out">
                        <Link
                            href={
                                '/learning-material/1/Einf%C3%BChrung/Was%20ist%20ein%20Virtueller%20Austausch'
                            }
                        >
                            Was ist ein virtueller Austausch
                        </Link>
                    </li>
                    <li className="hover:bg-slate-50 hover:text-ve-collab-orange transition ease-in-out">
                        <Link
                            href={
                                '/learning-material/1/Beispiele%20aus%20der%20Praxis/VE-Beispiele%20aus%20der%20Praxis'
                            }
                        >
                            VE-Beispiele aus der Praxis
                        </Link>
                    </li>
                    <li className="hover:bg-slate-50 hover:text-ve-collab-orange transition ease-in-out">
                        <Link href={'/learning-material/3/Tools'}>Tools</Link>
                    </li>
                    <li className="hover:bg-slate-50 hover:text-ve-collab-orange transition ease-in-out">
                        <Link
                            href={
                                '/learning-material/4/Interaktion%20und%20kollaboratives%20Arbeiten'
                            }
                        >
                            Interaktion und kollaboratives Arbeiten
                        </Link>
                    </li>
                </ul>
                <div className="px-4 py-2 mt-6 ml-auto w-fit hover:bg-white/25 rounded-full transition easy-in-out">
                    <Link href={`/learning-material`} onClick={(e) => e.preventDefault()}>
                        {t('common:all')} <MdArrowRight size={24} className="inline mx-1" />
                    </Link>
                </div>
            </>
        );
    };
    const SuggestedUser = () => {
        return (
            <>
                <H2>{t('suggested_user')}</H2>
            </>
        );
    };
    const SuggestedGPP = () => {
        return (
            <>
                <H2>{t('suggested_gpp')}</H2>
            </>
        );
    };

    const getModule = (idx?: number) => {
        const modules = [<SuggestedMaterials />, <SuggestedUser />, <SuggestedGPP />];
        return (
            <>{modules[typeof idx !== 'undefined' ? idx : new Date().getDate() % modules.length]}</>
        );
    };

    return <WrapperBox>{getModule(0)}</WrapperBox>;
}
