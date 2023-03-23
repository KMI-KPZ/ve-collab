interface Props {
    children: JSX.Element | JSX.Element[]
}

export default function WhiteBox({children}: Props){
    return (
        <div className={"p-4 my-8 bg-white rounded-3xl shadow-2xl"}>
            {children}
        </div>
    )
}