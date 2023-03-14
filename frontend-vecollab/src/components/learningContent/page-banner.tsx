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
    const text = "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua";

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

