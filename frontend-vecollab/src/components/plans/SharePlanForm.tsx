import { BackendSearchResponse, BackendUserSnippet } from '@/interfaces/api/apiInterfaces';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { Dispatch, SetStateAction, useState } from 'react';
import AsyncCreatableSelect from 'react-select/async-creatable';
import { AlertState } from '../common/dialogs/Alert';

interface Props {
    closeDialogCallback: () => void;
    planId: string;
    setAlert: Dispatch<SetStateAction<AlertState>>;
}

export default function SharePlanForm({
    closeDialogCallback,
    planId,
    setAlert,
}: Props) {
    const { data: session } = useSession();

    const [shareUsername, setShareUsername] = useState('');
    const [shareAccessRight, setShareAccessRight] = useState('write');
    const [searchResultProfileSnippets, setSearchResultProfileSnippets] = useState<
        BackendUserSnippet[]
    >([]);

    const sharePlan = async () => {
        const payload = {
            plan_id: planId,
            username: shareUsername,
            read: shareAccessRight === 'read' || shareAccessRight === 'write',
            write: shareAccessRight === 'write',
        };

        await fetchPOST('/planner/grant_access', payload, session?.accessToken).then((data) => {
            setAlert({message: 'Plan freigegeben', autoclose: 2000, onClose: () => setAlert({open: false})})
        });
    };

    const loadOptions = (
        inputValue: string,
        callback: (options: { label: string; value: string }[]) => void
    ) => {
        // a little less api queries, only start searching for recommendations from 2 letter inputs
        if (inputValue.length > 1) {
            fetchGET(`/search?users=true&query=${inputValue}`, session?.accessToken).then(
                (data: BackendSearchResponse) => {
                    callback(
                        data.users.map((user) => ({
                            label: user.first_name + ' ' + user.last_name + ' - ' + user.username,
                            value: user.username,
                        }))
                    );
                    setSearchResultProfileSnippets(data.users);
                }
            );
        }
    };

    return (
        <>
            <p className="my-2">Suche nach Nutzenden, um ihnen den Plan freizugeben:</p>
            <AsyncCreatableSelect
                loadOptions={loadOptions}
                onChange={(e) => setShareUsername(e!.value)}
                value={{
                    label: searchResultProfileSnippets.find(
                        (user) => user.username === shareUsername
                    )
                        ? `${
                              searchResultProfileSnippets.find(
                                  (user) => user.username === shareUsername
                              )?.first_name
                          } ${
                              searchResultProfileSnippets.find(
                                  (user) => user.username === shareUsername
                              )?.last_name
                          } - ${shareUsername}`
                        : `${shareUsername}`,
                    value: shareUsername,
                }}
                placeholder={'Suche nach Nutzer:innen...'}
                getOptionLabel={(option) => option.label}
                formatCreateLabel={(inputValue) => (
                    <span>
                        kein Treffer? <b>{inputValue}</b> trotzdem verwenden
                    </span>
                )}
            />
            <div className="flex justify-between my-8 mx-6">
                <div>
                    <label className="mx-2">
                        <input
                            className="mx-2"
                            type="radio"
                            name="access"
                            id="readInput"
                            value="read"
                            defaultChecked={shareAccessRight === 'read'}
                            onChange={(e) => setShareAccessRight(e.target.value)}
                        />
                        Lesen
                    </label>
                </div>
                <div>
                    <label className="mx-2">
                        <input
                            className="mx-2"
                            type="radio"
                            name="access"
                            id="writeInput"
                            value={'write'}
                            defaultChecked={shareAccessRight === 'write'}
                            onChange={(e) => setShareAccessRight(e.target.value)}
                        />
                        Lesen & Schreiben
                    </label>
                </div>
            </div>
            <div className="flex absolute bottom-0 w-full">
                <button
                    className={
                        'bg-transparent border border-gray-500 py-3 px-6 mr-auto rounded-lg shadow-lg'
                    }
                    onClick={closeDialogCallback}
                >
                    <span>Abbrechen</span>
                </button>
                <button
                    className={
                        'bg-ve-collab-orange border text-white py-3 px-6 rounded-lg shadow-xl'
                    }
                    onClick={(e) => {
                        sharePlan();
                        closeDialogCallback();
                    }}
                >
                    <span>Absenden</span>
                </button>
            </div>
        </>
    );
}
