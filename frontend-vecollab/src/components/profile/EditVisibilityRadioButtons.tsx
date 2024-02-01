import { ChangeEvent } from 'react';

interface Props {
    name: string;
    visibility: string;
    onChange(e: ChangeEvent<HTMLInputElement>): void;
}

export default function EditVisibilityRadioButtons({ name, visibility, onChange }: Props) {
    return (
        <div className="flex justify-between">
            <div>
                <input
                    type="radio"
                    name={name}
                    value={'public'}
                    id="public"
                    checked={visibility === 'public'}
                    onChange={onChange}
                />
                <label className="mx-2" htmlFor="public">
                    öffentlich
                </label>
            </div>
            <div className="">
                <input
                    type="radio"
                    name={name}
                    value={'follower'}
                    id="follower"
                    checked={visibility === 'follower'}
                    onChange={onChange}
                />
                <label className="mx-2" htmlFor="follower">
                    nur Follower
                </label>
            </div>
            <div className="">
                <input
                    type="radio"
                    name={name}
                    value={'private'}
                    id="private"
                    checked={visibility === 'private'}
                    onChange={onChange}
                />
                <label className="mx-2" htmlFor="private">
                    privat
                </label>
            </div>
        </div>
    );
}
