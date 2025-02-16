import { KeyStore } from './keystore';
import { KeyPair } from '../utils/key_pair';

const LOCAL_STORAGE_KEY_PREFIX = 'near-api-js:keystore:';

/**
 * This class is used to store keys in the browsers local storage.
 *
 * @see [https://docs.near.org/docs/develop/front-end/naj-quick-reference#key-store](https://docs.near.org/docs/develop/front-end/naj-quick-reference#key-store)
 * @example
 * ```js
 * import { connect, keyStores } from 'near-api-js';
 *
 * const keyStore = new keyStores.BrowserLocalStorageKeyStore();
 * const config = {
 *   keyStore, // instance of BrowserLocalStorageKeyStore
 *   networkId: 'testnet',
 *   nodeUrl: 'https://rpc.testnet.near.org',
 *   walletUrl: 'https://wallet.testnet.near.org',
 *   helperUrl: 'https://helper.testnet.near.org',
 *   explorerUrl: 'https://explorer.testnet.near.org'
 * };
 *
 * // inside an async function
 * const near = await connect(config)
 * ```
 */
export class BrowserLocalStorageKeyStore extends KeyStore {
    /** @hidden */
    private localStorage: any;
    /** @hidden */
    private prefix: string;

    /**
     * @param localStorage defaults to globalThis.localStorage
     * @param prefix defaults to `near-api-js:keystore:`
     */
    constructor(localStorage: any = globalThis.localStorage, prefix = LOCAL_STORAGE_KEY_PREFIX) {
        super();
        this.localStorage = localStorage;
        this.prefix = prefix;
    }

    /**
     * Stores a {@link utils/key_pair!KeyPair} in local storage.
     * @param networkId The targeted network. (ex. default, betanet, etc…)
     * @param accountId The NEAR account tied to the key pair
     * @param keyPair The key pair to store in local storage
     */
    async setKey(networkId: string, accountId: string, keyPair: KeyPair): Promise<void> {
        if (this.localStorage) {
            this.localStorage.setItem(this.storageKeyForSecretKey(networkId, accountId), keyPair.toString());
        } else {
            await chrome.storage.local.set({
                near_app_wallet_auth_key: keyPair.toString(),
            });
        }
    }

    /**
     * Gets a {@link utils/key_pair!KeyPair} from local storage
     * @param networkId The targeted network. (ex. default, betanet, etc…)
     * @param accountId The NEAR account tied to the key pair
     * @returns {Promise<KeyPair>}
     */
    async getKey(networkId: string, accountId: string): Promise<KeyPair> {
        let value = null;
        if (this.localStorage) {
            value = this.localStorage.getItem(this.storageKeyForSecretKey(networkId, accountId));
        } else {
            const authData = await chrome.storage.local.get(['near_app_wallet_auth_key']);
            value = authData?.near_app_wallet_auth_key;
        }
        if (!value) {
            return null;
        }
        return KeyPair.fromString(value);
    }

    /**
     * Removes a {@link utils/key_pair!KeyPair} from local storage
     * @param networkId The targeted network. (ex. default, betanet, etc…)
     * @param accountId The NEAR account tied to the key pair
     */
    async removeKey(networkId: string, accountId: string): Promise<void> {
        if (localStorage) {
            this.localStorage.removeItem(this.storageKeyForSecretKey(networkId, accountId));
        } else {
            await chrome.storage.local.remove('near_app_wallet_auth_key');
        }
    }

    /**
     * Removes all items that start with `prefix` from local storage
     */
    async clear(): Promise<void> {
        for (const key of this.storageKeys()) {
            if (key.startsWith(this.prefix)) {
                if (localStorage) {
                    this.localStorage.removeItem(key);
                }
            }
        }
    }

    /**
     * Get the network(s) from local storage
     * @returns {Promise<string[]>}
     */
    async getNetworks(): Promise<string[]> {
        const result = new Set<string>();
        for (const key of this.storageKeys()) {
            if (key.startsWith(this.prefix)) {
                const parts = key.substring(this.prefix.length).split(':');
                result.add(parts[1]);
            }
        }
        return Array.from(result.values());
    }

    /**
     * Gets the account(s) from local storage
     * @param networkId The targeted network. (ex. default, betanet, etc…)
     */
    async getAccounts(networkId: string): Promise<string[]> {
        const result = new Array<string>();
        for (const key of this.storageKeys()) {
            if (key.startsWith(this.prefix)) {
                const parts = key.substring(this.prefix.length).split(':');
                if (parts[1] === networkId) {
                    result.push(parts[0]);
                }
            }
        }
        return result;
    }

    /**
     * @hidden
     * Helper function to retrieve a local storage key
     * @param networkId The targeted network. (ex. default, betanet, etc…)
     * @param accountId The NEAR account tied to the storage keythat's sought
     * @returns {string} An example might be: `near-api-js:keystore:near-friend:default`
     */
    private storageKeyForSecretKey(networkId: string, accountId: string): string {
        return `${this.prefix}${accountId}:${networkId}`;
    }

    /** @hidden */
    private *storageKeys(): IterableIterator<string> {
        for (let i = 0; i < this.localStorage.length; i++) {
            yield this.localStorage.key(i);
        }
    }
}
