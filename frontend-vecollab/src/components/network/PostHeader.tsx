import { BackendPostAuthor } from "@/interfaces/api/apiInterfaces";
import AuthenticatedImage from "../AuthenticatedImage";
import SmallTimestamp from "../SmallTimestamp";
import Link from "next/link";

interface Props {
    author: BackendPostAuthor,
    date: string
}

export default function PostHeader({
    author,
    date
}: Props) {

    let authorName = ""
    if (author.first_name != "") authorName = `${author.first_name} `
    if (author.last_name != "") authorName = `${authorName}${author.last_name}`
    if (author.username && authorName == "") authorName = author.username

    return (
        <>
            <AuthenticatedImage
                imageId={author.profile_pic}
                alt={'Benutzerbild'}
                width={40}
                height={40}
                className="rounded-full mr-3"
            ></AuthenticatedImage>
            <div className="flex flex-col">
                <Link href={`/profile?username=${author.username}`} className='font-bold'>{authorName}</Link>
                {date && (
                    <SmallTimestamp timestamp={date} className='text-xs text-gray-500' />
                )}
            </div>
        </>
    )
}