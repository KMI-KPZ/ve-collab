export default function printUsername(
    {
        username,
        first_name,
        last_name,
    }: {
        username: string;
        first_name: string;
        last_name: string;
    },
    htmlize?: boolean
): string | JSX.Element {
    if (first_name || last_name) {
        if (htmlize === false) return first_name.concat(' ', last_name);
        return <>{first_name.concat(' ', last_name)}</>;
    }
    if (htmlize === false) return username?.replaceAll('_', ' ');
    return <span className="capitalize">{username?.replaceAll('_', ' ')}</span>;
}
