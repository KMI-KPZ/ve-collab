// renders the headline above the input fields in the edit form
export default function EditProfileHeadline({ name }: { name: string }) {
    return <div className={'mb-1 font-bold text-slate-900 text-lg'}>{name}</div>;
}
