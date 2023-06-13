import { FormEvent } from 'react';
import EditProfileHeader from './EditProfileHeader';
import EditProfileVerticalSpacer from './EditProfileVerticalSpacer';
import EditProfileHeadline from './EditProfileHeadline';
import SlateBox from '../Layout/SlateBox';
import EditProfilePlusMinusButtons from './EditProfilePlusMinusButtons';
import EditProfileItemRow from './EditProfileItemRow';
import Swapper from './Swapper';

interface Props {
    updateProfileData(evt: FormEvent): Promise<void>;
    orcid: string | null | undefined;
    importOrcidProfile(evt: FormEvent): Promise<void>;
}

export default function EditProfileVeWindow({
    updateProfileData,
    orcid,
    importOrcidProfile,
}: Props) {
    return (
        <form onSubmit={updateProfileData}>
            <EditProfileHeader orcid={orcid} importOrcidProfile={importOrcidProfile} />
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'VE-Schaufenster'} />
                <Swapper
                    key={0}
                    index={0}
                    arrayLength={3}
                    swapCallback={(e) => {}}
                    deleteCallback={(e) => {}}
                >
                    <div className="w-full">
                        <SlateBox>
                            <div className="mt-2 flex">
                                <div className={'flex items-center w-1/3'}>
                                    <label htmlFor={'plan'} className="px-2 py-2">
                                        Plan wählen
                                    </label>
                                </div>
                                <select
                                    name="plan"
                                    className="w-2/3 border border-gray-500 rounded-lg h-12 p-2 bg-white"
                                >
                                    <option value="1">Lorem Ipsum Dolor Si Amet1</option>
                                    <option value="2">Lorem Ipsum Dolor Si Amet2</option>
                                    <option value="3">Lorem Ipsum Dolor Si Amet3</option>
                                    <option value="4">Lorem Ipsum Dolor Si Amet4</option>
                                </select>
                            </div>
                            <EditProfileItemRow
                                label={'Titel'}
                                value={''}
                                onChange={(e) => {}}
                                labelElementWidth="w-1/3"
                                inputElemenWidth="w-2/3"
                                placeholder="optional, anderer Titel im Schaufenster"
                            />
                            <EditProfileItemRow
                                label={'Beschreibung'}
                                value={''}
                                onChange={(e) => {}}
                                labelElementWidth="w-1/3"
                                inputElemenWidth="w-2/3"
                                placeholder="optional, andere Beschreibung im Schaufenster"
                            />
                        </SlateBox>
                    </div>
                </Swapper>
                <Swapper
                    key={1}
                    index={1}
                    arrayLength={3}
                    swapCallback={(e) => {}}
                    deleteCallback={(e) => {}}
                >
                    <div className="w-full">
                        <SlateBox>
                            <div className="mt-2 flex">
                                <div className={'flex items-center w-1/3'}>
                                    <label htmlFor={'plan'} className="px-2 py-2">
                                        Plan wählen
                                    </label>
                                </div>
                                <select
                                    name="plan"
                                    className="w-2/3 border border-gray-500 rounded-lg h-12 p-2 bg-white"
                                >
                                    <option value="1">Lorem Ipsum Dolor Si Amet1</option>
                                    <option value="2">Lorem Ipsum Dolor Si Amet2</option>
                                    <option value="3">Lorem Ipsum Dolor Si Amet3</option>
                                    <option value="4">Lorem Ipsum Dolor Si Amet4</option>
                                </select>
                            </div>
                            <EditProfileItemRow
                                label={'Titel'}
                                value={''}
                                onChange={(e) => {}}
                                labelElementWidth="w-1/3"
                                inputElemenWidth="w-2/3"
                                placeholder="optional, anderer Titel im Schaufenster"
                            />
                            <EditProfileItemRow
                                label={'Beschreibung'}
                                value={''}
                                onChange={(e) => {}}
                                labelElementWidth="w-1/3"
                                inputElemenWidth="w-2/3"
                                placeholder="optional, andere Beschreibung im Schaufenster"
                            />
                        </SlateBox>
                    </div>
                </Swapper>
                <Swapper
                    key={2}
                    index={2}
                    arrayLength={3}
                    swapCallback={(e) => {}}
                    deleteCallback={(e) => {}}
                >
                    <div className="w-full">
                        <SlateBox>
                            <div className="mt-2 flex">
                                <div className={'flex items-center w-1/3'}>
                                    <label htmlFor={'plan'} className="px-2 py-2">
                                        Plan wählen
                                    </label>
                                </div>
                                <select
                                    name="plan"
                                    className="w-2/3 border border-gray-500 rounded-lg h-12 p-2 bg-white"
                                >
                                    <option value="1">Lorem Ipsum Dolor Si Amet1</option>
                                    <option value="2">Lorem Ipsum Dolor Si Amet2</option>
                                    <option value="3">Lorem Ipsum Dolor Si Amet3</option>
                                    <option value="4">Lorem Ipsum Dolor Si Amet4</option>
                                </select>
                            </div>
                            <EditProfileItemRow
                                label={'Titel'}
                                value={''}
                                onChange={(e) => {}}
                                labelElementWidth="w-1/3"
                                inputElemenWidth="w-2/3"
                                placeholder="optional, anderer Titel im Schaufenster"
                            />
                            <EditProfileItemRow
                                label={'Beschreibung'}
                                value={''}
                                onChange={(e) => {}}
                                labelElementWidth="w-1/3"
                                inputElemenWidth="w-2/3"
                                placeholder="optional, andere Beschreibung im Schaufenster"
                            />
                        </SlateBox>
                    </div>
                </Swapper>
                <EditProfilePlusMinusButtons plusCallback={(e) => {}} />
            </EditProfileVerticalSpacer>
        </form>
    );
}
