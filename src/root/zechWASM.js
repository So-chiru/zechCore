import * as wasm from './zechWASM_bg.wasm';

const lTextDecoder = typeof TextDecoder === 'undefined' ? require('util').TextDecoder : TextDecoder;

let cachedTextDecoder = new lTextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachegetUint8Memory0 = null;
function getUint8Memory0() {
    if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasm.memory.buffer) {
        cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachegetUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

let WASM_VECTOR_LEN = 0;

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1);
    getUint8Memory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

let cachegetInt32Memory0 = null;
function getInt32Memory0() {
    if (cachegetInt32Memory0 === null || cachegetInt32Memory0.buffer !== wasm.memory.buffer) {
        cachegetInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachegetInt32Memory0;
}
/**
*/
export class Sha3Hasher {

    static __wrap(ptr) {
        const obj = Object.create(Sha3Hasher.prototype);
        obj.ptr = ptr;

        return obj;
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_sha3hasher_free(ptr);
    }
    /**
    */
    constructor() {
        var ret = wasm.sha3hasher_new();
        return Sha3Hasher.__wrap(ret);
    }
    /**
    * @param {Uint8Array} input_bytes
    */
    update(input_bytes) {
        var ptr0 = passArray8ToWasm0(input_bytes, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        wasm.sha3hasher_update(this.ptr, ptr0, len0);
    }
    /**
    * @returns {string}
    */
    hex_digest() {
        try {
            wasm.sha3hasher_hex_digest(8, this.ptr);
            var r0 = getInt32Memory0()[8 / 4 + 0];
            var r1 = getInt32Memory0()[8 / 4 + 1];
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_free(r0, r1);
        }
    }
}

export const __wbindgen_throw = function(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
};

