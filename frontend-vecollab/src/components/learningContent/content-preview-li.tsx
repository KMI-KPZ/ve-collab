import Link from 'next/link';
import { useRouter } from 'next/router';
import { RxDot } from 'react-icons/rx';

interface Props {
    title: string;
    slug: string;
    snippet: string;
}

export default function LearningContentPreview({ title, slug, snippet }: Props) {
    const router = useRouter();
    const browserBubbleSlug = router.query.bubble;
    const browserCategorySlug = router.query.category;
    const browserSlug = router.query.slug;

    return (
        <li>
            <Link
                scroll={false}
                href={
                    '/learning-material/' +
                    browserBubbleSlug +
                    '/' +
                    browserCategorySlug +
                    '/' +
                    slug
                }
            >
                <div className={'my-2 mx-3 flex items-center'}>
                    <RxDot />
                    <div
                        className={
                            'flex items-center mx-4 py-1 px-2 rounded-md border-b-2 hover:border-b-2 hover:border-ve-collab-orange' +
                            (browserSlug === slug
                                ? ' border-ve-collab-orange-light'
                                : ' border-transparent')
                        }
                    >
                        <div>
                            <div className="font-bold">{title}</div>
                        </div>
                    </div>
                </div>
            </Link>
        </li>
    );
}
