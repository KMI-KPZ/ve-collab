import { sanitizedText } from './sanitizedText'

interface Props {
    text: string
}
export default function TimelinePostText({text}: Props): JSX.Element {
    return (
        <div className="network-post-value" dangerouslySetInnerHTML={{ __html: sanitizedText(text)}} />
    )
}