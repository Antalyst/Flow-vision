import { T as getDefaultExportFromNamespaceIfNotNamed, V as dist } from './nitro.mjs';
import * as cookie$1 from 'cookie';

var main = {};

var createBrowserClient$1 = {};

const require$$0$1 = /*@__PURE__*/getDefaultExportFromNamespaceIfNotNamed(dist);

var version = {};

Object.defineProperty(version, "__esModule", { value: true });
version.VERSION = void 0;
version.VERSION = '0.10.2';

var utils = {};

var helpers = {};

const require$$0 = /*@__PURE__*/getDefaultExportFromNamespaceIfNotNamed(cookie$1);

var __createBinding = (helpers && helpers.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (helpers && helpers.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (helpers && helpers.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(helpers, "__esModule", { value: true });
helpers.serialize = helpers.parse = void 0;
helpers.parseCookieHeader = parseCookieHeader;
helpers.serializeCookieHeader = serializeCookieHeader;
helpers.isBrowser = isBrowser;
helpers.memoryLocalStorageAdapter = memoryLocalStorageAdapter;
const cookie = __importStar(require$$0);
/**
 * @deprecated Since v0.4.0: Please use {@link parseCookieHeader}. `parse` will
 * not be available for import starting v1.0.0 of `@supabase/ssr`.
 */
helpers.parse = cookie.parse;
/**
 * @deprecated Since v0.4.0: Please use {@link serializeCookieHeader}.
 * `serialize` will not be available for import starting v1.0.0 of
 * `@supabase/ssr`.
 */
helpers.serialize = cookie.serialize;
/**
 * Parses the `Cookie` HTTP header into an array of cookie name-value objects.
 *
 * @param header The `Cookie` HTTP header. Decodes cookie names and values from
 * URI encoding first.
 */
function parseCookieHeader(header) {
    const parsed = cookie.parse(header);
    return Object.keys(parsed ?? {}).map((name) => ({
        name,
        value: parsed[name],
    }));
}
/**
 * Converts the arguments to a valid `Set-Cookie` header. Non US-ASCII chars
 * and other forbidden cookie chars will be URI encoded.
 *
 * @param name Name of cookie.
 * @param value Value of cookie.
 */
function serializeCookieHeader(name, value, options) {
    return cookie.serialize(name, value, options);
}
function isBrowser() {
    return ("undefined" !== "undefined");
}
/**
 * Returns a localStorage-like object that stores the key-value pairs in
 * memory.
 */
function memoryLocalStorageAdapter(store = {}) {
    return {
        getItem: (key) => {
            return store[key] || null;
        },
        setItem: (key, value) => {
            store[key] = value;
        },
        removeItem: (key) => {
            delete store[key];
        },
    };
}

var constants = {};

Object.defineProperty(constants, "__esModule", { value: true });
constants.DEFAULT_COOKIE_OPTIONS = void 0;
constants.DEFAULT_COOKIE_OPTIONS = {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    // https://developer.chrome.com/blog/cookie-max-age-expires
    // https://httpwg.org/http-extensions/draft-ietf-httpbis-rfc6265bis.html#name-cookie-lifetime-limits
    maxAge: 400 * 24 * 60 * 60,
};

var chunker = {};

(function (exports$1) {
	Object.defineProperty(exports$1, "__esModule", { value: true });
	exports$1.MAX_CHUNK_SIZE = void 0;
	exports$1.isChunkLike = isChunkLike;
	exports$1.createChunks = createChunks;
	exports$1.combineChunks = combineChunks;
	exports$1.deleteChunks = deleteChunks;
	exports$1.MAX_CHUNK_SIZE = 3180;
	const CHUNK_LIKE_REGEX = /^(.*)[.](0|[1-9][0-9]*)$/;
	function isChunkLike(cookieName, key) {
	    if (cookieName === key) {
	        return true;
	    }
	    const chunkLike = cookieName.match(CHUNK_LIKE_REGEX);
	    if (chunkLike && chunkLike[1] === key) {
	        return true;
	    }
	    return false;
	}
	/**
	 * create chunks from a string and return an array of object
	 */
	function createChunks(key, value, chunkSize) {
	    const resolvedChunkSize = chunkSize ?? exports$1.MAX_CHUNK_SIZE;
	    let encodedValue = encodeURIComponent(value);
	    if (encodedValue.length <= resolvedChunkSize) {
	        return [{ name: key, value }];
	    }
	    const chunks = [];
	    while (encodedValue.length > 0) {
	        let encodedChunkHead = encodedValue.slice(0, resolvedChunkSize);
	        const lastEscapePos = encodedChunkHead.lastIndexOf("%");
	        // Check if the last escaped character is truncated.
	        if (lastEscapePos > resolvedChunkSize - 3) {
	            // If so, reslice the string to exclude the whole escape sequence.
	            // We only reduce the size of the string as the chunk must
	            // be smaller than the chunk size.
	            encodedChunkHead = encodedChunkHead.slice(0, lastEscapePos);
	        }
	        let valueHead = "";
	        // Check if the chunk was split along a valid unicode boundary.
	        while (encodedChunkHead.length > 0) {
	            try {
	                // Try to decode the chunk back and see if it is valid.
	                // Stop when the chunk is valid.
	                valueHead = decodeURIComponent(encodedChunkHead);
	                break;
	            }
	            catch (error) {
	                if (error instanceof URIError &&
	                    encodedChunkHead.at(-3) === "%" &&
	                    encodedChunkHead.length > 3) {
	                    encodedChunkHead = encodedChunkHead.slice(0, encodedChunkHead.length - 3);
	                }
	                else {
	                    throw error;
	                }
	            }
	        }
	        chunks.push(valueHead);
	        encodedValue = encodedValue.slice(encodedChunkHead.length);
	    }
	    return chunks.map((value, i) => ({ name: `${key}.${i}`, value }));
	}
	// Get fully constructed chunks
	async function combineChunks(key, retrieveChunk) {
	    const value = await retrieveChunk(key);
	    if (value) {
	        return value;
	    }
	    let values = [];
	    for (let i = 0;; i++) {
	        const chunkName = `${key}.${i}`;
	        const chunk = await retrieveChunk(chunkName);
	        if (!chunk) {
	            break;
	        }
	        values.push(chunk);
	    }
	    if (values.length > 0) {
	        return values.join("");
	    }
	    return null;
	}
	async function deleteChunks(key, retrieveChunk, removeChunk) {
	    const value = await retrieveChunk(key);
	    if (value) {
	        await removeChunk(key);
	    }
	    for (let i = 0;; i++) {
	        const chunkName = `${key}.${i}`;
	        const chunk = await retrieveChunk(chunkName);
	        if (!chunk) {
	            break;
	        }
	        await removeChunk(chunkName);
	    }
	}
	
} (chunker));

var base64url = {};

/**
 * Avoid modifying this file. It's part of
 * https://github.com/supabase-community/base64url-js.  Submit all fixes on
 * that repo!
 */
Object.defineProperty(base64url, "__esModule", { value: true });
base64url.stringToBase64URL = stringToBase64URL;
base64url.stringFromBase64URL = stringFromBase64URL;
base64url.codepointToUTF8 = codepointToUTF8;
base64url.stringToUTF8 = stringToUTF8;
base64url.stringFromUTF8 = stringFromUTF8;
/**
 * An array of characters that encode 6 bits into a Base64-URL alphabet
 * character.
 */
const TO_BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_".split("");
/**
 * An array of characters that can appear in a Base64-URL encoded string but
 * should be ignored.
 */
const IGNORE_BASE64URL = " \t\n\r=".split("");
/**
 * An array of 128 numbers that map a Base64-URL character to 6 bits, or if -2
 * used to skip the character, or if -1 used to error out.
 */
const FROM_BASE64URL = (() => {
    const charMap = new Array(128);
    for (let i = 0; i < charMap.length; i += 1) {
        charMap[i] = -1;
    }
    for (let i = 0; i < IGNORE_BASE64URL.length; i += 1) {
        charMap[IGNORE_BASE64URL[i].charCodeAt(0)] = -2;
    }
    for (let i = 0; i < TO_BASE64URL.length; i += 1) {
        charMap[TO_BASE64URL[i].charCodeAt(0)] = i;
    }
    return charMap;
})();
/**
 * Converts a JavaScript string (which may include any valid character) into a
 * Base64-URL encoded string. The string is first encoded in UTF-8 which is
 * then encoded as Base64-URL.
 *
 * @param str The string to convert.
 */
function stringToBase64URL(str) {
    const base64 = [];
    let queue = 0;
    let queuedBits = 0;
    const emitter = (byte) => {
        queue = (queue << 8) | byte;
        queuedBits += 8;
        while (queuedBits >= 6) {
            const pos = (queue >> (queuedBits - 6)) & 63;
            base64.push(TO_BASE64URL[pos]);
            queuedBits -= 6;
        }
    };
    stringToUTF8(str, emitter);
    if (queuedBits > 0) {
        queue = queue << (6 - queuedBits);
        queuedBits = 6;
        while (queuedBits >= 6) {
            const pos = (queue >> (queuedBits - 6)) & 63;
            base64.push(TO_BASE64URL[pos]);
            queuedBits -= 6;
        }
    }
    return base64.join("");
}
/**
 * Converts a Base64-URL encoded string into a JavaScript string. It is assumed
 * that the underlying string has been encoded as UTF-8.
 *
 * @param str The Base64-URL encoded string.
 */
function stringFromBase64URL(str) {
    const conv = [];
    const emit = (codepoint) => {
        conv.push(String.fromCodePoint(codepoint));
    };
    const state = {
        utf8seq: 0,
        codepoint: 0,
    };
    let queue = 0;
    let queuedBits = 0;
    for (let i = 0; i < str.length; i += 1) {
        const codepoint = str.charCodeAt(i);
        const bits = FROM_BASE64URL[codepoint];
        if (bits > -1) {
            // valid Base64-URL character
            queue = (queue << 6) | bits;
            queuedBits += 6;
            while (queuedBits >= 8) {
                stringFromUTF8((queue >> (queuedBits - 8)) & 0xff, state, emit);
                queuedBits -= 8;
            }
        }
        else if (bits === -2) {
            // ignore spaces, tabs, newlines, =
            continue;
        }
        else {
            throw new Error(`Invalid Base64-URL character "${str.at(i)}" at position ${i}`);
        }
    }
    return conv.join("");
}
/**
 * Converts a Unicode codepoint to a multi-byte UTF-8 sequence.
 *
 * @param codepoint The Unicode codepoint.
 * @param emit      Function which will be called for each UTF-8 byte that represents the codepoint.
 */
function codepointToUTF8(codepoint, emit) {
    if (codepoint <= 0x7f) {
        emit(codepoint);
        return;
    }
    else if (codepoint <= 0x7ff) {
        emit(0xc0 | (codepoint >> 6));
        emit(0x80 | (codepoint & 0x3f));
        return;
    }
    else if (codepoint <= 0xffff) {
        emit(0xe0 | (codepoint >> 12));
        emit(0x80 | ((codepoint >> 6) & 0x3f));
        emit(0x80 | (codepoint & 0x3f));
        return;
    }
    else if (codepoint <= 0x10ffff) {
        emit(0xf0 | (codepoint >> 18));
        emit(0x80 | ((codepoint >> 12) & 0x3f));
        emit(0x80 | ((codepoint >> 6) & 0x3f));
        emit(0x80 | (codepoint & 0x3f));
        return;
    }
    throw new Error(`Unrecognized Unicode codepoint: ${codepoint.toString(16)}`);
}
/**
 * Converts a JavaScript string to a sequence of UTF-8 bytes.
 *
 * @param str  The string to convert to UTF-8.
 * @param emit Function which will be called for each UTF-8 byte of the string.
 */
function stringToUTF8(str, emit) {
    for (let i = 0; i < str.length; i += 1) {
        let codepoint = str.charCodeAt(i);
        if (codepoint > 0xd7ff && codepoint <= 0xdbff) {
            // most UTF-16 codepoints are Unicode codepoints, except values in this
            // range where the next UTF-16 codepoint needs to be combined with the
            // current one to get the Unicode codepoint
            const highSurrogate = ((codepoint - 0xd800) * 0x400) & 0xffff;
            const lowSurrogate = (str.charCodeAt(i + 1) - 0xdc00) & 0xffff;
            codepoint = (lowSurrogate | highSurrogate) + 0x10000;
            i += 1;
        }
        codepointToUTF8(codepoint, emit);
    }
}
/**
 * Converts a UTF-8 byte to a Unicode codepoint.
 *
 * @param byte  The UTF-8 byte next in the sequence.
 * @param state The shared state between consecutive UTF-8 bytes in the
 *              sequence, an object with the shape `{ utf8seq: 0, codepoint: 0 }`.
 * @param emit  Function which will be called for each codepoint.
 */
function stringFromUTF8(byte, state, emit) {
    if (state.utf8seq === 0) {
        if (byte <= 0x7f) {
            emit(byte);
            return;
        }
        // count the number of 1 leading bits until you reach 0
        for (let leadingBit = 1; leadingBit < 6; leadingBit += 1) {
            if (((byte >> (7 - leadingBit)) & 1) === 0) {
                state.utf8seq = leadingBit;
                break;
            }
        }
        if (state.utf8seq === 2) {
            state.codepoint = byte & 31;
        }
        else if (state.utf8seq === 3) {
            state.codepoint = byte & 15;
        }
        else if (state.utf8seq === 4) {
            state.codepoint = byte & 7;
        }
        else {
            throw new Error("Invalid UTF-8 sequence");
        }
        state.utf8seq -= 1;
    }
    else if (state.utf8seq > 0) {
        if (byte <= 0x7f) {
            throw new Error("Invalid UTF-8 sequence");
        }
        state.codepoint = (state.codepoint << 6) | (byte & 63);
        state.utf8seq -= 1;
        if (state.utf8seq === 0) {
            emit(state.codepoint);
        }
    }
}

(function (exports$1) {
	var __createBinding = (utils && utils.__createBinding) || (Object.create ? (function(o, m, k, k2) {
	    if (k2 === undefined) k2 = k;
	    var desc = Object.getOwnPropertyDescriptor(m, k);
	    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
	      desc = { enumerable: true, get: function() { return m[k]; } };
	    }
	    Object.defineProperty(o, k2, desc);
	}) : (function(o, m, k, k2) {
	    if (k2 === undefined) k2 = k;
	    o[k2] = m[k];
	}));
	var __exportStar = (utils && utils.__exportStar) || function(m, exports$1) {
	    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports$1, p)) __createBinding(exports$1, m, p);
	};
	Object.defineProperty(exports$1, "__esModule", { value: true });
	__exportStar(helpers, exports$1);
	__exportStar(constants, exports$1);
	__exportStar(chunker, exports$1);
	__exportStar(base64url, exports$1);
	
} (utils));

var cookies = {};

Object.defineProperty(cookies, "__esModule", { value: true });
cookies.createStorageFromOptions = createStorageFromOptions;
cookies.applyServerStorage = applyServerStorage;
const cookie_1 = require$$0;
const utils_1$1 = utils;
const BASE64_PREFIX = "base64-";
/**
 * Creates a storage client that handles cookies correctly for browser and
 * server clients with or without properly provided cookie methods.
 *
 * @param options The options passed to createBrowserClient or createServer client.
 *
 * @param isServerClient Whether it's called from createServerClient.
 */
function createStorageFromOptions(options, isServerClient) {
    const cookies = options.cookies ?? null;
    const cookieEncoding = options.cookieEncoding;
    const setItems = {};
    const removedItems = {};
    let getAll;
    let setAll;
    if (cookies) {
        if ("get" in cookies) {
            // Just get is not enough, because the client needs to see what cookies
            // are already set and unset them if necessary. To attempt to fix this
            // behavior for most use cases, we pass "hints" which is the keys of the
            // storage items. They are then converted to their corresponding cookie
            // chunk names and are fetched with get. Only 5 chunks are fetched, which
            // should be enough for the majority of use cases, but does not solve
            // those with very large sessions.
            const getWithHints = async (keyHints) => {
                // optimistically find the first 5 potential chunks for the specified key
                const chunkNames = keyHints.flatMap((keyHint) => [
                    keyHint,
                    ...Array.from({ length: 5 }).map((_, i) => `${keyHint}.${i}`),
                ]);
                const chunks = [];
                for (let i = 0; i < chunkNames.length; i += 1) {
                    const value = await cookies.get(chunkNames[i]);
                    if (!value && typeof value !== "string") {
                        continue;
                    }
                    chunks.push({ name: chunkNames[i], value });
                }
                // TODO: detect and log stale chunks error
                return chunks;
            };
            getAll = async (keyHints) => await getWithHints(keyHints);
            if ("set" in cookies && "remove" in cookies) {
                setAll = async (setCookies) => {
                    for (let i = 0; i < setCookies.length; i += 1) {
                        const { name, value, options } = setCookies[i];
                        if (value) {
                            await cookies.set(name, value, options);
                        }
                        else {
                            await cookies.remove(name, options);
                        }
                    }
                };
            }
            else if (isServerClient) {
                setAll = async () => {
                    console.warn("@supabase/ssr: createServerClient was configured without set and remove cookie methods, but the client needs to set cookies. This can lead to issues such as random logouts, early session termination or increased token refresh requests. If in NextJS, check your middleware.ts file, route handlers and server actions for correctness. Consider switching to the getAll and setAll cookie methods instead of get, set and remove which are deprecated and can be difficult to use correctly.");
                };
            }
            else {
                throw new Error("@supabase/ssr: createBrowserClient requires configuring a getAll and setAll cookie method (deprecated: alternatively both get, set and remove can be used)");
            }
        }
        else if ("getAll" in cookies) {
            getAll = async () => await cookies.getAll();
            if ("setAll" in cookies) {
                setAll = cookies.setAll;
            }
            else if (isServerClient) {
                setAll = async () => {
                    console.warn("@supabase/ssr: createServerClient was configured without the setAll cookie method, but the client needs to set cookies. This can lead to issues such as random logouts, early session termination or increased token refresh requests. If in NextJS, check your middleware.ts file, route handlers and server actions for correctness.");
                };
            }
            else {
                throw new Error("@supabase/ssr: createBrowserClient requires configuring both getAll and setAll cookie methods (deprecated: alternatively both get, set and remove can be used)");
            }
        }
        else {
            // neither get nor getAll is present on cookies, only will occur if pure JavaScript is used, but cookies is an object
            throw new Error(`@supabase/ssr: ${isServerClient ? "createServerClient" : "createBrowserClient"} requires configuring getAll and setAll cookie methods (deprecated: alternatively use get, set and remove).${(0, utils_1$1.isBrowser)() ? " As this is called in a browser runtime, consider removing the cookies option object to use the document.cookie API automatically." : ""}`);
        }
    }
    else if (!isServerClient && (0, utils_1$1.isBrowser)()) {
        // The environment is browser, so use the document.cookie API to implement getAll and setAll.
        const noHintGetAll = () => {
            const parsed = (0, cookie_1.parse)(document.cookie);
            return Object.keys(parsed).map((name) => ({
                name,
                value: parsed[name] ?? "",
            }));
        };
        getAll = () => noHintGetAll();
        setAll = (setCookies) => {
            setCookies.forEach(({ name, value, options }) => {
                document.cookie = (0, cookie_1.serialize)(name, value, options);
            });
        };
    }
    else if (isServerClient) {
        throw new Error("@supabase/ssr: createServerClient must be initialized with cookie options that specify getAll and setAll functions (deprecated, not recommended: alternatively use get, set and remove)");
    }
    else {
        // getting cookies when there's no window but we're in browser mode can be OK, because the developer probably is not using auth functions
        getAll = () => {
            return [];
        };
        // this is NOT OK because the developer is using auth functions that require setting some state, so that must error out
        setAll = () => {
            throw new Error("@supabase/ssr: createBrowserClient in non-browser runtimes (including Next.js pre-rendering mode) was not initialized cookie options that specify getAll and setAll functions (deprecated: alternatively use get, set and remove), but they were needed");
        };
    }
    if (!isServerClient) {
        // This is the storage client to be used in browsers. It only
        // works on the cookies abstraction, unlike the server client
        // which only uses cookies to read the initial state. When an
        // item is set, cookies are both cleared and set to values so
        // that stale chunks are not left remaining.
        return {
            getAll, // for type consistency
            setAll, // for type consistency
            setItems, // for type consistency
            removedItems, // for type consistency
            storage: {
                isServer: false,
                getItem: async (key) => {
                    const allCookies = await getAll([key]);
                    const chunkedCookie = await (0, utils_1$1.combineChunks)(key, async (chunkName) => {
                        const cookie = allCookies?.find(({ name }) => name === chunkName) || null;
                        if (!cookie) {
                            return null;
                        }
                        return cookie.value;
                    });
                    if (!chunkedCookie) {
                        return null;
                    }
                    let decoded = chunkedCookie;
                    if (chunkedCookie.startsWith(BASE64_PREFIX)) {
                        decoded = (0, utils_1$1.stringFromBase64URL)(chunkedCookie.substring(BASE64_PREFIX.length));
                    }
                    return decoded;
                },
                setItem: async (key, value) => {
                    const allCookies = await getAll([key]);
                    const cookieNames = allCookies?.map(({ name }) => name) || [];
                    const removeCookies = new Set(cookieNames.filter((name) => (0, utils_1$1.isChunkLike)(name, key)));
                    let encoded = value;
                    if (cookieEncoding === "base64url") {
                        encoded = BASE64_PREFIX + (0, utils_1$1.stringToBase64URL)(value);
                    }
                    const setCookies = (0, utils_1$1.createChunks)(key, encoded);
                    setCookies.forEach(({ name }) => {
                        removeCookies.delete(name);
                    });
                    const removeCookieOptions = {
                        ...utils_1$1.DEFAULT_COOKIE_OPTIONS,
                        ...options?.cookieOptions,
                        maxAge: 0,
                    };
                    const setCookieOptions = {
                        ...utils_1$1.DEFAULT_COOKIE_OPTIONS,
                        ...options?.cookieOptions,
                        maxAge: utils_1$1.DEFAULT_COOKIE_OPTIONS.maxAge,
                    };
                    // the NextJS cookieStore API can get confused if the `name` from
                    // options.cookieOptions leaks
                    delete removeCookieOptions.name;
                    delete setCookieOptions.name;
                    const allToSet = [
                        ...[...removeCookies].map((name) => ({
                            name,
                            value: "",
                            options: removeCookieOptions,
                        })),
                        ...setCookies.map(({ name, value }) => ({
                            name,
                            value,
                            options: setCookieOptions,
                        })),
                    ];
                    if (allToSet.length > 0) {
                        await setAll(allToSet, {});
                    }
                },
                removeItem: async (key) => {
                    const allCookies = await getAll([key]);
                    const cookieNames = allCookies?.map(({ name }) => name) || [];
                    const removeCookies = cookieNames.filter((name) => (0, utils_1$1.isChunkLike)(name, key));
                    const removeCookieOptions = {
                        ...utils_1$1.DEFAULT_COOKIE_OPTIONS,
                        ...options?.cookieOptions,
                        maxAge: 0,
                    };
                    // the NextJS cookieStore API can get confused if the `name` from
                    // options.cookieOptions leaks
                    delete removeCookieOptions.name;
                    if (removeCookies.length > 0) {
                        await setAll(removeCookies.map((name) => ({
                            name,
                            value: "",
                            options: removeCookieOptions,
                        })), {});
                    }
                },
            },
        };
    }
    // This is the server client. It only uses getAll to read the initial
    // state. Any subsequent changes to the items is persisted in the
    // setItems and removedItems objects. createServerClient *must* use
    // getAll, setAll and the values in setItems and removedItems to
    // persist the changes *at once* when appropriate (usually only when
    // the TOKEN_REFRESHED, USER_UPDATED or SIGNED_OUT events are fired by
    // the Supabase Auth client).
    return {
        getAll,
        setAll,
        setItems,
        removedItems,
        storage: {
            // to signal to the libraries that these cookies are
            // coming from a server environment and their value
            // should not be trusted
            isServer: true,
            getItem: async (key) => {
                if (typeof setItems[key] === "string") {
                    return setItems[key];
                }
                if (removedItems[key]) {
                    return null;
                }
                const allCookies = await getAll([key]);
                const chunkedCookie = await (0, utils_1$1.combineChunks)(key, async (chunkName) => {
                    const cookie = allCookies?.find(({ name }) => name === chunkName) || null;
                    if (!cookie) {
                        return null;
                    }
                    return cookie.value;
                });
                if (!chunkedCookie) {
                    return null;
                }
                let decoded = chunkedCookie;
                if (typeof chunkedCookie === "string" &&
                    chunkedCookie.startsWith(BASE64_PREFIX)) {
                    decoded = (0, utils_1$1.stringFromBase64URL)(chunkedCookie.substring(BASE64_PREFIX.length));
                }
                return decoded;
            },
            setItem: async (key, value) => {
                // We don't have an `onAuthStateChange` event that can let us know that
                // the PKCE code verifier is being set. Therefore, if we see it being
                // set, we need to apply the storage (call `setAll` so the cookie is
                // set properly).
                if (key.endsWith("-code-verifier")) {
                    await applyServerStorage({
                        getAll,
                        setAll,
                        // pretend only that the code verifier was set
                        setItems: { [key]: value },
                        // pretend that nothing was removed
                        removedItems: {},
                    }, {
                        cookieOptions: options?.cookieOptions ?? null,
                        cookieEncoding,
                    });
                }
                setItems[key] = value;
                delete removedItems[key];
            },
            removeItem: async (key) => {
                // Intentionally not applying the storage when the key is the PKCE code
                // verifier, as usually right after it's removed other items are set,
                // so application of the storage will be handled by the
                // `onAuthStateChange` callback that follows removal -- usually as part
                // of the `exchangeCodeForSession` call.
                delete setItems[key];
                removedItems[key] = true;
            },
        },
    };
}
/**
 * When createServerClient needs to apply the created storage to cookies, it
 * should call this function which handles correcly setting cookies for stored
 * and removed items in the storage.
 */
async function applyServerStorage({ getAll, setAll, setItems, removedItems, }, options) {
    const cookieEncoding = options.cookieEncoding;
    const cookieOptions = options.cookieOptions ?? null;
    const allCookies = await getAll([
        ...(setItems ? Object.keys(setItems) : []),
        ...(removedItems ? Object.keys(removedItems) : []),
    ]);
    const cookieNames = allCookies?.map(({ name }) => name) || [];
    const removeCookies = Object.keys(removedItems).flatMap((itemName) => {
        return cookieNames.filter((name) => (0, utils_1$1.isChunkLike)(name, itemName));
    });
    const setCookies = Object.keys(setItems).flatMap((itemName) => {
        const removeExistingCookiesForItem = new Set(cookieNames.filter((name) => (0, utils_1$1.isChunkLike)(name, itemName)));
        let encoded = setItems[itemName];
        if (cookieEncoding === "base64url") {
            encoded = BASE64_PREFIX + (0, utils_1$1.stringToBase64URL)(encoded);
        }
        const chunks = (0, utils_1$1.createChunks)(itemName, encoded);
        chunks.forEach((chunk) => {
            removeExistingCookiesForItem.delete(chunk.name);
        });
        removeCookies.push(...removeExistingCookiesForItem);
        return chunks;
    });
    const removeCookieOptions = {
        ...utils_1$1.DEFAULT_COOKIE_OPTIONS,
        ...cookieOptions,
        maxAge: 0,
    };
    const setCookieOptions = {
        ...utils_1$1.DEFAULT_COOKIE_OPTIONS,
        ...cookieOptions,
        maxAge: utils_1$1.DEFAULT_COOKIE_OPTIONS.maxAge,
    };
    // the NextJS cookieStore API can get confused if the `name` from
    // options.cookieOptions leaks
    delete removeCookieOptions.name;
    delete setCookieOptions.name;
    await setAll([
        ...removeCookies.map((name) => ({
            name,
            value: "",
            options: removeCookieOptions,
        })),
        ...setCookies.map(({ name, value }) => ({
            name,
            value,
            options: setCookieOptions,
        })),
    ], {
        "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
        Expires: "0",
        Pragma: "no-cache",
    });
}

Object.defineProperty(createBrowserClient$1, "__esModule", { value: true });
createBrowserClient$1.createBrowserClient = createBrowserClient;
const supabase_js_1$1 = require$$0$1;
const version_1$1 = version;
const utils_1 = utils;
const cookies_1$1 = cookies;
let cachedBrowserClient;
function createBrowserClient(supabaseUrl, supabaseKey, options) {
    // singleton client is created only if isSingleton is set to true, or if isSingleton is not defined and we detect a browser
    const shouldUseSingleton = options?.isSingleton === true ||
        ((!options || !("isSingleton" in options)) && (0, utils_1.isBrowser)());
    if (shouldUseSingleton && cachedBrowserClient) {
        return cachedBrowserClient;
    }
    if (!supabaseUrl || !supabaseKey) {
        throw new Error(`@supabase/ssr: Your project's URL and API key are required to create a Supabase client!\n\nCheck your Supabase project's API settings to find these values\n\nhttps://supabase.com/dashboard/project/_/settings/api`);
    }
    const { storage } = (0, cookies_1$1.createStorageFromOptions)({
        ...options,
        cookieEncoding: options?.cookieEncoding ?? "base64url",
    }, false);
    const client = (0, supabase_js_1$1.createClient)(supabaseUrl, supabaseKey, {
        // TODO: resolve type error
        ...options,
        global: {
            ...options?.global,
            headers: {
                ...options?.global?.headers,
                "X-Client-Info": `supabase-ssr/${version_1$1.VERSION} createBrowserClient`,
            },
        },
        auth: {
            ...options?.auth,
            ...(options?.cookieOptions?.name
                ? { storageKey: options.cookieOptions.name }
                : null),
            flowType: "pkce",
            autoRefreshToken: options?.auth?.autoRefreshToken ?? (0, utils_1.isBrowser)(),
            detectSessionInUrl: options?.auth?.detectSessionInUrl ?? (0, utils_1.isBrowser)(),
            persistSession: options?.auth?.persistSession ?? true,
            storage,
            ...(options?.cookies &&
                "encode" in options.cookies &&
                options.cookies.encode === "tokens-only"
                ? {
                    userStorage: options?.auth?.userStorage ?? window.localStorage,
                }
                : null),
        },
    });
    if (shouldUseSingleton) {
        cachedBrowserClient = client;
    }
    return client;
}

var createServerClient$1 = {};

Object.defineProperty(createServerClient$1, "__esModule", { value: true });
createServerClient$1.createServerClient = createServerClient;
const supabase_js_1 = require$$0$1;
const version_1 = version;
const cookies_1 = cookies;
const helpers_1 = helpers;
function createServerClient(supabaseUrl, supabaseKey, options) {
    if (!supabaseUrl || !supabaseKey) {
        throw new Error(`Your project's URL and Key are required to create a Supabase client!\n\nCheck your Supabase project's API settings to find these values\n\nhttps://supabase.com/dashboard/project/_/settings/api`);
    }
    const { storage, getAll, setAll, setItems, removedItems } = (0, cookies_1.createStorageFromOptions)({
        ...options,
        cookieEncoding: options?.cookieEncoding ?? "base64url",
    }, true);
    const client = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey, {
        // TODO: resolve type error
        ...options,
        global: {
            ...options?.global,
            headers: {
                ...options?.global?.headers,
                "X-Client-Info": `supabase-ssr/${version_1.VERSION} createServerClient`,
            },
        },
        auth: {
            ...(options?.cookieOptions?.name
                ? { storageKey: options.cookieOptions.name }
                : null),
            ...options?.auth,
            flowType: "pkce",
            autoRefreshToken: false,
            detectSessionInUrl: false,
            persistSession: true,
            skipAutoInitialize: true,
            storage,
            ...(options?.cookies &&
                "encode" in options.cookies &&
                options.cookies.encode === "tokens-only"
                ? {
                    userStorage: options?.auth?.userStorage ?? (0, helpers_1.memoryLocalStorageAdapter)(),
                }
                : null),
        },
    });
    client.auth.onAuthStateChange(async (event) => {
        // The SIGNED_IN event is fired very often, but we don't need to
        // apply the storage each time it fires, only if there are changes
        // that need to be set -- which is if setItems / removeItems have
        // data.
        const hasStorageChanges = Object.keys(setItems).length > 0 || Object.keys(removedItems).length > 0;
        if (hasStorageChanges &&
            (event === "SIGNED_IN" ||
                event === "TOKEN_REFRESHED" ||
                event === "USER_UPDATED" ||
                event === "PASSWORD_RECOVERY" ||
                event === "SIGNED_OUT" ||
                event === "MFA_CHALLENGE_VERIFIED")) {
            await (0, cookies_1.applyServerStorage)({ getAll, setAll, setItems, removedItems }, {
                cookieOptions: options?.cookieOptions ?? null,
                cookieEncoding: options?.cookieEncoding ?? "base64url",
            });
        }
    });
    return client;
}

var types = {};

Object.defineProperty(types, "__esModule", { value: true });

(function (exports$1) {
	var __createBinding = (main && main.__createBinding) || (Object.create ? (function(o, m, k, k2) {
	    if (k2 === undefined) k2 = k;
	    var desc = Object.getOwnPropertyDescriptor(m, k);
	    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
	      desc = { enumerable: true, get: function() { return m[k]; } };
	    }
	    Object.defineProperty(o, k2, desc);
	}) : (function(o, m, k, k2) {
	    if (k2 === undefined) k2 = k;
	    o[k2] = m[k];
	}));
	var __exportStar = (main && main.__exportStar) || function(m, exports$1) {
	    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports$1, p)) __createBinding(exports$1, m, p);
	};
	Object.defineProperty(exports$1, "__esModule", { value: true });
	// Check if this package is being used as one of the deprecated auth-helpers packages
	if (typeof process !== "undefined" && process.env?.npm_package_name) {
	    const packageName = process.env.npm_package_name;
	    const deprecatedPackages = [
	        "@supabase/auth-helpers-nextjs",
	        "@supabase/auth-helpers-react",
	        "@supabase/auth-helpers-remix",
	        "@supabase/auth-helpers-sveltekit",
	    ];
	    if (deprecatedPackages.includes(packageName)) {
	        console.warn(`
╔════════════════════════════════════════════════════════════════════════════╗
║ ⚠️  IMPORTANT: Package Consolidation Notice                                ║
║                                                                            ║
║ The ${packageName.padEnd(35)} package name is deprecated.  ║
║                                                                            ║
║ You are now using @supabase/ssr - a unified solution for all frameworks.  ║
║                                                                            ║
║ The auth-helpers packages have been consolidated into @supabase/ssr       ║
║ to provide better maintenance and consistent APIs across frameworks.      ║
║                                                                            ║
║ Please update your package.json to use @supabase/ssr directly:            ║
║   npm uninstall ${packageName.padEnd(42)} ║
║   npm install @supabase/ssr                                               ║
║                                                                            ║
║ For more information, visit:                                              ║
║ https://supabase.com/docs/guides/auth/server-side                         ║
╚════════════════════════════════════════════════════════════════════════════╝
    `);
	    }
	}
	__exportStar(createBrowserClient$1, exports$1);
	__exportStar(createServerClient$1, exports$1);
	__exportStar(types, exports$1);
	__exportStar(utils, exports$1);
	
} (main));

export { main as m };
//# sourceMappingURL=index2.mjs.map
