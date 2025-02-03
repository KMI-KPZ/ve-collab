import styles from '@/components/common/LoadingAnimation.module.css';

export default function LoadingAnimation({
    size,
    className = '',
}: {
    size?: 'big' | 'normal' | 'small';
    className?: string;
}) {
    const circleStyle =
        size == 'big' ? styles.circleBig : size == 'small' ? styles.circleSmall : '';

    return (
        <div className={`flex w-full justify-center items-center ${className}`}>
            <div
                className={`${styles.loader} ${size == 'small' ? styles.loaderSmall : ''} ${
                    size == 'big' ? styles.loaderBig : ''
                }`}
            >
                <div className={`${styles.circle} ${circleStyle}`}></div>
                <div className={`${styles.circle} ${circleStyle}`}></div>
                <div className={`${styles.circle} ${circleStyle}`}></div>
                <div className={`${styles.circle} ${circleStyle}`}></div>
            </div>
        </div>
    );
}
