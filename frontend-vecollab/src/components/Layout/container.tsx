interface Props {
  children: JSX.Element
}

export default function Container({ children }: Props) {
  return <div className="container mx-auto mb-20 px-5">{children}</div>
}
