import PostTitle from './post-title'

interface Props {
  title: string
}

export default function PostHeader({title}: Props) {
  return (
      <PostTitle>{title}</PostTitle>
  )
}
