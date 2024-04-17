import Link from 'next/link';
import { useRouter } from 'next/router';
import { BiAlignMiddle } from 'react-icons/bi';

interface Props {
    categoryName: string;
    slug: string;
}

export default function CategoryBox({ categoryName, slug }: Props) {
    const router = useRouter();
    const browserBubbleSlug = router.query.bubble;
    const browserCategorySlug = router.query.category;

    return (
        <li>
            <Link scroll={false} href={'/content/' + browserBubbleSlug + '/' + slug}>
                <div
                    className={
                        'w-44 h-24 flex mx-2 px-0 hover:ring hover:ring-ve-collab-orange rounded-lg justify-center cursor-pointer' +
                        (browserCategorySlug === slug
                            ? ' bg-ve-collab-orange-light '
                            : ' bg-white ')
                    }
                >
                    <div className="flex flex-col">
                        <div className="flex justify-center h-7 mt-2">
                            <BiAlignMiddle className={'mb-1'} size={28} color={'#00748f'} />
                        </div>
                        <p className={'font-bold text-center flex flex-grow items-center'}>
                            {categoryName}
                        </p>
                    </div>
                </div>
            </Link>
        </li>
    );
}
