import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function Test() {
    const [fileList, setFileList] = useState<string[]>([]);

    useEffect(() => {
        setFileList([
            'adlcp_rootv1p2.xsd',
            'ims_xml.xsd',
            'imscp_rootv1p1p2.xsd',
            'imsmanifest.xml',
            'imsmd_rootv1p2p1.xsd',
            'shared/scormfunctions.js',
            'sco/MakeFriends.html',
            'sco/MakeFriends2.html',
        ]);
    }, []);

    const handleDownload = async () => {
        const zip = new JSZip();
        const folder = zip.folder('ve-collab-project-scorm');

        // Add files to zip
        for (const fileName of fileList) {
            const response = await fetch(`/public/ContentPackagingMyExample/${fileName}`);
            const blob = await response.blob();
            if (folder) {
                folder.file(fileName, blob);
            } else {
                console.error('Folder is null');
            }
        }

        // Generate and download the zip file
        zip.generateAsync({ type: 'blob' }).then((content) => {
            saveAs(content, 've-collab-project-scorm.zip');
        });
    };

    return (
        <div className="flex flex-col items-center space-y-4 p-4">
            <h2 className="text-xl font-semibold">Download All Files</h2>
            <button onClick={handleDownload}>Download ZIP</button>
        </div>
    );
}
