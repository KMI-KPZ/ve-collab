import { IMaterialNode } from '@/interfaces/material/materialInterfaces';
import Link from 'next/link';

interface Props {
    previewChildren: JSX.Element | JSX.Element[];
    contentChildren: JSX.Element | JSX.Element[];
    prevNode?: IMaterialNode | null;
    nextNode?: IMaterialNode | null;
    bubbleSlug?: string;
    categorySlug?: string;
}

export default function MainLearningContentLayout({
    previewChildren,
    contentChildren,
    prevNode,
    nextNode,
    bubbleSlug,
    categorySlug,
}: Props) {
    return (
        <div className={'flex h-full'}>
            <div className={'w-1/4 pr-2 h-full border-r border-gray-400 overflow-hidden'}>
                <div className={'mx-4 mt-10 mb-4 text-5xl font-bold'}>
                    <h1>Inhalte</h1>
                </div>
                <ul className={'h-screen overflow-y-auto content-scrollbar'}>{previewChildren}</ul>
            </div>
            <div className={'w-3/4'}>
                <div className={'mt-10 overflow-y-auto overflow-x-clip content-scrollbar'}>
                    {contentChildren}
                </div>
                <div className="flex mx-4 my-10">
                    {prevNode && (
                        <Link
                            className="mr-auto"
                            href={`/content/${bubbleSlug}/${categorySlug}/${prevNode.text}`}
                        >
                            <button
                                className={'bg-ve-collab-orange text-white py-2 px-5 rounded-lg'}
                            >
                                zurück zu: {prevNode.text}
                            </button>
                        </Link>
                    )}
                    {nextNode && (
                        <Link
                            className="ml-auto"
                            href={`/content/${bubbleSlug}/${categorySlug}/${nextNode.text}`}
                        >
                            <button
                                className={'bg-ve-collab-orange text-white py-2 px-5 rounded-lg'}
                            >
                                weiter zu: {nextNode.text}
                            </button>
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
