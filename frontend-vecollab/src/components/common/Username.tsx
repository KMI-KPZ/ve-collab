export default function printUsername({
    username,
    first_name,
    last_name,
}: {
    username: string;
    first_name: string;
    last_name: string;
}) {
    if (first_name || last_name) {
        return <>{first_name.concat(' ', last_name)}</>;
    }
    return <span className="capitalize">{username?.replaceAll('_', ' ')}</span>;
}
