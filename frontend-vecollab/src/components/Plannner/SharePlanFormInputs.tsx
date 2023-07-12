import { Dispatch, SetStateAction } from 'react';

interface Props {
    shareUsername: string;
    setShareUsername: Dispatch<SetStateAction<string>>;
    shareAccessRight: string;
    setShareAccessRight: Dispatch<SetStateAction<string>>;
}

export default function SharePlanFormInputs({
    shareUsername,
    setShareUsername,
    shareAccessRight,
    setShareAccessRight,
}: Props) {
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
        </>
    );
}
