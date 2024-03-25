import styles from "@/components/LoadingAnimation.module.css"

export default function LoadingAnimation({size} : {size?: 'normal' | 'small'}) {
    return (
        <div className="flex w-full justify-center items-center">
            <div className={`${styles.loader} ${size == 'small' ? styles.loaderSmall : ""}`}>
                <div className={`${styles.circle} ${size == 'small' ? styles.circleSmall : ""}`}></div>
                <div className={`${styles.circle} ${size == 'small' ? styles.circleSmall : ""}`}></div>
                <div className={`${styles.circle} ${size == 'small' ? styles.circleSmall : ""}`}></div>
                <div className={`${styles.circle} ${size == 'small' ? styles.circleSmall : ""}`}></div>
            </div>
        </div>
    )
}