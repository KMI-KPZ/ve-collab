import { fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { Dispatch, SetStateAction, useState } from 'react';

interface Props {
    closeDialogCallback: () => void;
    planId: string,
    setSuccessPopupOpen: Dispatch<SetStateAction<boolean>>;
    setSuccessMessage: Dispatch<SetStateAction<string>>;
}

export default function SharePlanForm({
    closeDialogCallback,
    planId,
    setSuccessPopupOpen,
    setSuccessMessage
}: Props) {
    const { data: session } = useSession();

    const [shareUsername, setShareUsername] = useState('');
    const [shareAccessRight, setShareAccessRight] = useState('write');

    const sharePlan = async () => {
        const payload = {
            plan_id: planId,
            username: shareUsername,
            read: shareAccessRight === 'read' || shareAccessRight === 'write',
            write: shareAccessRight === 'write',
        };

        await fetchPOST('/planner/grant_access', payload, session?.accessToken).then((data) => {
            // render success message that disappears after 2 seconds
            setSuccessPopupOpen(true);
            setSuccessMessage("Plan freigegeben")
            setTimeout(() => {
                setSuccessPopupOpen(false);
            }, 2000);
        });
    };

    return (
        <>
            <input
                type="text"
                className="border border-gray-500 rounded-lg w-full h-12 p-2"
                placeholder="Nutzernamen eingeben"
                value={shareUsername}
                onChange={(e) => setShareUsername(e.target.value)}
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
