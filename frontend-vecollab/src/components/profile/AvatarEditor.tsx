import { useTranslation } from 'next-i18next';
import { useState, useCallback, useRef, SyntheticEvent } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop, convertToPixelCrop, Crop } from 'react-image-crop';
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
        return new Promise((_, reject) => {
            reject();
        });
    }
}

interface Props {
    sourceImg: string;
    onFinishUpload: (blob: Blob) => void;
}

const ASPECT = 1;

/*
the cropping overlay that is rendered and draggable over the image
*/
function AvatarEditor({ sourceImg, onFinishUpload }: Props) {
    const { t } = useTranslation('community');

    const imgRef = useRef<HTMLImageElement | null>(null);
    const [crop, setCrop] = useState<Crop>();

    // once the image has loaded and its rendered dimensions are known,
    // center a square crop selection on top of it
    const onLoad = useCallback((e: SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        setCrop(centerCrop(makeAspectCrop({ unit: '%', width: 90 }, ASPECT, width, height), width, height));
    }, []);

    // callback of the button that fires the image cropping,
    // and passes the finished upload to the parent callback
    const uploadImage = async () => {
        if (!imgRef.current || !crop) return;
        const pixelCrop = convertToPixelCrop(crop, imgRef.current.width, imgRef.current.height);
        const blobImg = await getCroppedImg(imgRef.current, pixelCrop);
        onFinishUpload(blobImg);
    };

    return (
        <div className="my-2">
            <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                aspect={ASPECT}
                circularCrop={true}
                keepSelection={true}
                minWidth={100}
            >
                <img ref={imgRef} src={sourceImg} onLoad={onLoad} alt="" />
            </ReactCrop>
            <div className="mt-2">
                <button
                    type="button"
                    className={'bg-ve-collab-orange text-white py-2 px-5 mt-2 rounded-lg'}
                    onClick={uploadImage}
                >
                    {t('upload')}
                </button>
            </div>
        </div>
    );
}

export default AvatarEditor;
