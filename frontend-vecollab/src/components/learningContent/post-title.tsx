interface Props {
  children: string
}

export default function PostTitle({ children }: Props) {
  return (
    <h1
      className="text-6xl mt-10 font-bold tracking-tighter leading-tight mb-12 text-center"
      dangerouslySetInnerHTML={{ __html: children }}
    />
  )
}
