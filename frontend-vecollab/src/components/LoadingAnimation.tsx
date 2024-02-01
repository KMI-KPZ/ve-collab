import styles from "@/components/LoadingAnimation.module.css"

export default function LoadingAnimation() {
    return (
        <div className="flex w-full justify-center items-center">
            <div className={styles.loader}>
                <div className={styles.circle}></div>
                <div className={styles.circle}></div>
                <div className={styles.circle}></div>
                <div className={styles.circle}></div>
            </div>
        </div>
    )
}