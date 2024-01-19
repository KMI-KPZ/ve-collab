import Link from 'next/link';
import { useRouter } from 'next/router';
import { BiAlignMiddle } from 'react-icons/bi';

interface Props {
    categoryName: string;
    slug: string;
}

export default function CategoryBox({ categoryName, slug }: Props) {
    const router = useRouter();
    const browserCategorySlug = router.query.category;

    return (
        <li>
            <Link scroll={false} href={'/content/' + slug}>
                <div
                    className={
                        'w-32 h-24 flex mx-2 px-0 hover:ring hover:ring-ve-collab-orange rounded-lg justify-center items-center ' +
                        (browserCategorySlug === slug
                            ? ' bg-ve-collab-orange-light '
                            : ' bg-white ')
                    }
                >
                    <div>
                        <div className="flex justify-center">
                            <BiAlignMiddle className={'mb-1'} size={28} color={'#00748f'} />
                        </div>
                        <p className={'mt-1 font-bold'}>{categoryName}</p>
                    </div>
                </div>
            </Link>
        </li>
    );
}
