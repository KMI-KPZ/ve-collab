import { BackendPostAuthor } from "@/interfaces/api/apiInterfaces";
import AuthenticatedImage from "../AuthenticatedImage";
import SmallTimestamp from "../SmallTimestamp";

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
    if (authorName == "") authorName = author.username

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
                <div className='font-bold'>{authorName}</div>
                <SmallTimestamp timestamp={date} className='text-xs text-gray-500' />
            </div>
        </>
    )
}