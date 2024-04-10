import { BackendSearchResponse, BackendUserSnippet } from '@/interfaces/api/apiInterfaces';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { FormEvent, useState } from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';
import AsyncCreatableSelect from 'react-select/async-creatable';

interface Props {
    closeDialogCallback: () => void;
}
export default function NewChatForm({ closeDialogCallback }: Props) {
    const { data: session, status } = useSession();

    const [partners, setPartners] = useState(['']);
    const [partnerProfileSnippets, setPartnerProfileSnippets] = useState<{
        [Key: string]: BackendUserSnippet;
    }>({});
    const [optionalRoomName, setOptionalRoomName] = useState<string>('');

    const modifyPartner = (index: number, value: string) => {
        let newPartners = [...partners];
        newPartners[index] = value;
        setPartners(newPartners);
    };

    const addInputField = (e: FormEvent) => {
        e.preventDefault();
        setPartners([...partners, '']);
    };

    const removeInputField = (e: FormEvent) => {
        e.preventDefault();
        let copy = [...partners];
        copy.pop();
        setPartners(copy);
    };

    const loadOptions = (
        inputValue: string,
        callback: (options: { label: string; value: string }[]) => void
    ) => {
        // a little less api queries, only start searching for recommendations from 2 letter inputs
        if (inputValue.length > 1) {
            fetchGET(`/search?users=true&query=${inputValue}`, session?.accessToken).then(
                (data: BackendSearchResponse) => {
                    console.log(data);
                    callback(
                        data.users.map((user) => ({
                            label: user.first_name + ' ' + user.last_name + ' - ' + user.username,
                            value: user.username,
                        }))
                    );
                }
            );
        }
    };

    const createNewRoom = () => {
        console.log(partners);
        console.log(optionalRoomName);
        fetchPOST(
            '/chatroom/create_or_get',
            {
                members: partners, // current user will be added by backend
                name: optionalRoomName !== '' ? optionalRoomName : null,
            },
            session?.accessToken
        ).then((data) => {
            console.log(data);
        });
    };

    return (
        <div className="relative h-[47vh]">
            <div className="min-w-[20vw] h-[40vh] overflow-y-auto content-scrollbar relative px-2">
                <h1 className="my-4">Füge Personen zum Chat hinzu</h1>
                {partners.map((partner, index) => (
                    <div key={index} className="my-2">
                        <AsyncCreatableSelect  // TODO dont use Creatable here, only existing users should be chooseable
                            instanceId={index.toString()}
                            defaultOptions={[
                                {
                                    label: `${
                                        partnerProfileSnippets[partner]
                                            ? partnerProfileSnippets[partner].first_name
                                            : ''
                                    } ${
                                        partnerProfileSnippets[partner]
                                            ? partnerProfileSnippets[partner].last_name
                                            : ''
                                    } - ${partner}`,
                                    value: partner,
                                },
                            ]}
                            loadOptions={loadOptions}
                            onChange={(e) => modifyPartner(index, e!.value)}
                            value={{
                                label: `${
                                    partnerProfileSnippets[partner]
                                        ? partnerProfileSnippets[partner].first_name
                                        : ''
                                } ${
                                    partnerProfileSnippets[partner]
                                        ? partnerProfileSnippets[partner].last_name
                                        : ''
                                } - ${partner}`,
                                value: partner,
                            }}
                            placeholder={'Suche nach Nutzer:innen...'}
                            getOptionLabel={(option) => option.label}
                            formatCreateLabel={(inputValue) => (
                                <span>
                                    kein Treffer? <b>{inputValue}</b> trotzdem verwenden
                                </span>
                            )}
                        />
                    </div>
                ))}
                <div className={'w-3/4 mx-7 mt-3 flex justify-end'}>
                    <button onClick={removeInputField}>
                        <RxMinus size={20} />
                    </button>
                    <button onClick={addInputField}>
                        <RxPlus size={20} />
                    </button>
                </div>
                <div>
                    <h1 className="my-4">Optional: Gib dem Chat einen Namen</h1>
                    <input
                        type="text"
                        className="border border-gray-300 rounded-md w-full px-2 py-1"
                        value={optionalRoomName}
                        onChange={(e) => setOptionalRoomName(e.target.value)}
                    />
                </div>
            </div>
            <div className="flex absolute bottom-0 w-full">
                <button
                    className={
                        'w-40 h-12 bg-transparent border border-gray-500 py-3 px-6 mr-auto rounded-lg shadow-lg'
                    }
                    onClick={closeDialogCallback}
                >
                    <span>Abbrechen</span>
                </button>
                <button
                    className={
                        'w-40 h-12 bg-ve-collab-orange border text-white py-3 px-6 rounded-lg shadow-xl'
                    }
                    onClick={(e) => {
                        createNewRoom();
                        closeDialogCallback();
                    }}
                >
                    <span>Absenden</span>
                </button>
            </div>
        </div>
    );
}
