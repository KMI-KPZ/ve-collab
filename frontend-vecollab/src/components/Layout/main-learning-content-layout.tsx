interface Props {
    previewChildren: JSX.Element | JSX.Element[];
    contentChildren: JSX.Element | JSX.Element[];
}

export default function MainLearningContentLayout({ previewChildren, contentChildren }: Props) {
    return (
        <div className={'flex h-screen'}>
            <div className={'w-1/4 pr-2 h-screen border-r border-gray-400 overflow-hidden'}>
                <div className={'mx-4 mt-10 mb-4 text-5xl font-bold'}>
                    <h1>Inhalte</h1>
                </div>
                <ul className={"h-screen overflow-y-auto content-scrollbar"}>
                    {previewChildren}
                </ul>
            </div>
            <div className={"w-3/4 h-screen border-r overflow-y-auto content-scrollbar"}>
                <div className={"mt-10"}>
                    {contentChildren}
                </div>
            </div>
        </div>
    );
}
