import Image from "next/image"
import blueBackground from "@/images/footer/KAVAQ_Footer_rounded.png"
import CategoryBox from "./category-box"

interface Props {
    categories: {
        edges: [
            {
                node: {
                    name: string,
                    slug: string
                }
            }
        ]
    }
}

export default function PageBanner({ categories }: Props) {
    const title = "Materialien zu VE";
    const text = "Hello and welcome to our ve-collab qualification offer! This section is centrally filled with lerning opportunities and can be extended by our community. The learning resources you will find here are sorted across the disciplines as well as discipline-specific. Here you can get an overview of VEs and learn more about the individual topics. ";

    return (
        <>
            <div className={"w-full h-96 mt-2 relative rounded-2xl z-10"}>
                <Image fill src={blueBackground} alt={""} />
                <div className={"absolute top-10 bottom-10 left-20 right-20 text-center"}>
                    <h1 className={"text-7xl text-white font-bold"}>{title}</h1>
                    <p className={"relative top-5 text-base text-white"}> {text}</p>
                </div>
            </div>
            <ul className={"w-full flex relative -mt-14 justify-center z-20"}>
                {categories.edges.map(({ node }) => (
                    <CategoryBox key={node.slug} slug={node.slug} categoryName={node.name} />
                ))}
            </ul>
        </>
    )
}

