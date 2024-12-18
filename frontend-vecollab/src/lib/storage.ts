type StorageItem = {
    value: any;
    expiry?: number;
};

export default class LocalStorage {
    /**
     *
     * @param key string
     * @param value any
     * @param ttl number Time to live in milliseconds
     */
    static addItem(key: string, value: any, ttl?: number) {
        const item: StorageItem = {
            value: value,
        };
        if (ttl) {
            item.expiry = new Date().getTime() + ttl;
        }
        localStorage.setItem(key, JSON.stringify(item));
    }
    static getItem(key: string) {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) return null;

        const item = JSON.parse(itemStr) as StorageItem;
        if ('expiry' in item && new Date().getTime() > item.expiry!) {
            localStorage.removeItem(key);
            return null;
        }

        return item.value;
    }
}
