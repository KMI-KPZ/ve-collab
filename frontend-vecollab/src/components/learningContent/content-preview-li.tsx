import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface Props {
    title: string;
    slug: string;
    snippet: string;
    imgFilename: string;
}

export default function LearningContentPreview({ title, slug, snippet, imgFilename }: Props) {
    const router = useRouter();
    const browserCategorySlug = router.query.category;
    const browserSlug = router.query.slug;

    return (
        <li className={' m-1 border hover:border-ve-collab-orange rounded-xl'}>
            <Link scroll={false} href={'/content/' + browserCategorySlug + '/' + slug}>
                <div
                    className={
                        'mx-4 my-2 flex' +
                        (browserSlug === slug ? ' bg-ve-collab-orange-light rounded-xl' : '')
                    }
                >
                    <Image
                        className={'rounded-xl'}
                        width={100}
                        height={100}
                        src={imgFilename}
                        alt={''}
                    ></Image>
                    <div className={'mx-4 flex items-center'}>
                        <div className={'h-12 w-56'}>
                            {' '}
                            {/* TODO this should not be fixed width, but instead force same width as parent to truncate text correctly depending on screen size*/}
                            <div className={'font-bold truncate'}>{title}</div>
                            <div className={'text-gray-500 truncate'}>{snippet}</div>
                        </div>
                    </div>
                </div>
            </Link>
        </li>
    );
}
