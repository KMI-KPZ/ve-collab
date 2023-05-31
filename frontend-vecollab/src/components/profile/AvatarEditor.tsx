import { useState, useCallback, useRef } from 'react';
import ReactCrop, { Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

/*
take the original image and cut it to the size/dimensions that are specified
by the crop and return the transformed image as a blob
*/
export function getCroppedImg(image: HTMLImageElement | null, crop: Crop): Promise<Blob> {
    if (image !== null) {
        // transform the image
        const canvas = document.createElement('canvas');
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;
        canvas.width = crop.width;
        canvas.height = crop.height;
        const ctx = canvas.getContext('2d');

        const pixelRatio = window.devicePixelRatio;
        canvas.width = crop.width * pixelRatio;
        canvas.height = crop.height * pixelRatio;
        if (ctx !== null) {
            ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
            ctx.imageSmoothingQuality = 'high';

            ctx.drawImage(
                image,
                crop.x * scaleX,
                crop.y * scaleY,
                crop.width * scaleX,
                crop.height * scaleY,
                0,
                0,
                crop.width,
                crop.height
            );
        }

        // blob it
        return new Promise((resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (blob !== null) {
                        resolve(blob);
                    } else {
                        reject(blob);
                    }
                },
                'image/jpeg',
                1
            );
        });
    } else {
        return new Promise((resolve, reject) => {
            reject();
        });
    }
}

interface Props {
    sourceImg: string;
    onFinishUpload: (blob: Blob) => void;
};

/*
the cropping overlay that is rendered and draggable over the image
*/
function AvatarEditor({ sourceImg, onFinishUpload }: Props) {
    const imgRef = useRef<HTMLImageElement | null>(null);
    const [crop, setCrop] = useState<Crop>({
        unit: '%',
        width: 0,
        height: 100,
        x: 25,
        y: 0,
        aspect: 1,
    });

    // callback when the image is loaded to set the crop
    // atop of it.
    const onLoad = useCallback((img: HTMLImageElement) => {
        imgRef.current = img;
        setCrop({ height: 100, unit: '%', width: 0, aspect: 1, x: 25, y: 0 });
        return false; // necessary as per ReactCrop docu because crop is modified in this callback
    }, []);

    // callback of the button that fires the image cropping,
    // and passes the finished upload to the parent callback
    const uploadImage = async () => {
        const blobImg = await getCroppedImg(imgRef.current, crop);
        onFinishUpload(blobImg);
    };

    return (
        <div className="my-2">
            <ReactCrop
                src={sourceImg}
                onImageLoaded={onLoad}
                crop={crop}
                onChange={(c: Crop) => setCrop(c)}
                onComplete={(c: Crop) => setCrop(c)}
                circularCrop={true}
                keepSelection={true}
                minWidth={100}
            />
            <button
                type="button"
                className={'bg-ve-collab-orange text-white py-2 px-5 mt-2 rounded-lg'}
                onClick={uploadImage}
            >
                Hochladen
            </button>
        </div>
    );
}

export default AvatarEditor;
