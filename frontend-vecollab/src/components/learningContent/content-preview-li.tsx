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
    const browserBubbleSlug = router.query.bubble;
    const browserCategorySlug = router.query.category;
    const browserSlug = router.query.slug;

    return (
        <li className={' m-1 border hover:border-ve-collab-orange rounded-xl'}>
            <Link
                scroll={false}
                href={
                    '/content/' + browserBubbleSlug + '/' + browserCategorySlug + '/' + slug
                }
            >
                <div
                    className={
                        'mx-4 my-2 flex' +
                        (browserSlug === slug ? ' bg-ve-collab-orange-light rounded-xl' : '')
                    }
                >
                    <Image
                        className="rounded-xl max-w-[80px] max-h-[60px]"
                        width={80}
                        height={60}
                        src={imgFilename}
                        alt={''}
                    ></Image>
                    <div className="flex items-center mx-4 w-3/4 py-1 truncate hover:overflow-visible hover:whitespace-normal hover:h-auto">
                        <div>
                            <div className="font-bold">{title}</div>
                            <div className="text-gray-500">
                                {snippet != '' ? snippet : 'Keine Beschreibung vorhanden'}
                            </div>
                        </div>
                    </div>
                </div>
            </Link>
        </li>
    );
}
