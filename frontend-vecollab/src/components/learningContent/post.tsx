import PostBody from "./post-body";
import PostHeader from "./post-header";
import Tags from "./tags";
import {Tag} from "@/interfaces"

interface Props {
    post: {
        title: string,
        content: string,
        tags: {
            edges: [
                {
                    node: Tag
                }
            ]
        }
    }
}

export default function Post(postJson: Props) {
    const {post} = postJson;
    return (
        <article>
            <PostHeader
                title={post.title}
            />
            <PostBody content={post.content} />
            <footer>
                {post.tags.edges.length > 0 && <Tags tags={post.tags} />}
            </footer>
        </article>
    )
}