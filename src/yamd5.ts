/*******************************************************************************

YaMD5 - Yet another MD5 hasher.
home: https://github.com/knackstedt/yamd5.ts
Forked from: https://github.com/gorhill/yamd5.js

I needed an MD5 hasher, and as usual I want small code base, and fast.

Originally found md5-o-matic [1]. It was fast but did not work with Unicode
strings. Also, eventually realized it was really based on code from
Joseph Myers [2] with no proper credits given (not nice).

Then I found SparkMD5 [3], which works with Unicode strings, but at a steep
cost to performance. Also, glancing at the code I saw avoidable redundancies
causing the code base to be much larger than needed.

So from this point I set out to write my own version, YaMD5 (sorry, I am
not good with naming projects), of course heavily relying on the original
code from Joseph Myers [2], and bits from SparkMD5 -- I started to work from
SparkMD5 implementation, so there might be bits of code original to SparkMD5
code left in a few places (like say, MD5.end()).

Advantages of YaMD5:

- Can handle Unicode strings
- Natively incremental
- Small code base
- Fastest MD5 hasher out there so far for large input [4]
- Even faster than versions supporting only simpler ascii strings


 [1] https://github.com/trentmillar/md5-o-matic
 [2] http://www.myersdaily.org/joseph/javascript/md5-text.html
 [3] https://github.com/satazor/SparkMD5
 [4] http://jsperf.com/md5-shootout/75

So with that said, I don't know what license covers Joseph Myers' code (need
to find out). In any case, concerning whatever original code I contributed in
there:

The MIT License (MIT)

Copyright (C) 2014 Raymond Hill

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

**/

let singleton: MD5;


/*
* Fastest md5 implementation around (JKM md5)
* Credits: Joseph Myers
*
* @see http://www.myersdaily.org/joseph/javascript/md5-text.html
* @see http://jsperf.com/md5-shootout/7
*/
export class MD5 {
    private dataLength = 0;
    private state = new Int32Array(4);
    private buffer = new ArrayBuffer(68);
    private bufferLength = 0;
    private buffer8 = new Uint8Array(this.buffer, 0, 68);
    private buffer32 = new Uint32Array(this.buffer, 0, 17);

    private readonly stateIdentity = new Int32Array([1732584193, -271733879, -1732584194, 271733878]);
    private readonly buffer32Identity = new Int32Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

    private hexChars = '0123456789abcdef';


    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence

    md5cycle(x: Int32Array, k: Uint32Array) {
        let a = x[0],
            b = x[1],
            c = x[2],
            d = x[3];
        // ff()
        a += (b & c | ~b & d) + k[0] - 680876936 | 0;
        a = (a << 7 | a >>> 25) + b | 0;
        d += (a & b | ~a & c) + k[1] - 389564586 | 0;
        d = (d << 12 | d >>> 20) + a | 0;
        c += (d & a | ~d & b) + k[2] + 606105819 | 0;
        c = (c << 17 | c >>> 15) + d | 0;
        b += (c & d | ~c & a) + k[3] - 1044525330 | 0;
        b = (b << 22 | b >>> 10) + c | 0;
        a += (b & c | ~b & d) + k[4] - 176418897 | 0;
        a = (a << 7 | a >>> 25) + b | 0;
        d += (a & b | ~a & c) + k[5] + 1200080426 | 0;
        d = (d << 12 | d >>> 20) + a | 0;
        c += (d & a | ~d & b) + k[6] - 1473231341 | 0;
        c = (c << 17 | c >>> 15) + d | 0;
        b += (c & d | ~c & a) + k[7] - 45705983 | 0;
        b = (b << 22 | b >>> 10) + c | 0;
        a += (b & c | ~b & d) + k[8] + 1770035416 | 0;
        a = (a << 7 | a >>> 25) + b | 0;
        d += (a & b | ~a & c) + k[9] - 1958414417 | 0;
        d = (d << 12 | d >>> 20) + a | 0;
        c += (d & a | ~d & b) + k[10] - 42063 | 0;
        c = (c << 17 | c >>> 15) + d | 0;
        b += (c & d | ~c & a) + k[11] - 1990404162 | 0;
        b = (b << 22 | b >>> 10) + c | 0;
        a += (b & c | ~b & d) + k[12] + 1804603682 | 0;
        a = (a << 7 | a >>> 25) + b | 0;
        d += (a & b | ~a & c) + k[13] - 40341101 | 0;
        d = (d << 12 | d >>> 20) + a | 0;
        c += (d & a | ~d & b) + k[14] - 1502002290 | 0;
        c = (c << 17 | c >>> 15) + d | 0;
        b += (c & d | ~c & a) + k[15] + 1236535329 | 0;
        b = (b << 22 | b >>> 10) + c | 0;
        // gg()
        a += (b & d | c & ~d) + k[1] - 165796510 | 0;
        a = (a << 5 | a >>> 27) + b | 0;
        d += (a & c | b & ~c) + k[6] - 1069501632 | 0;
        d = (d << 9 | d >>> 23) + a | 0;
        c += (d & b | a & ~b) + k[11] + 643717713 | 0;
        c = (c << 14 | c >>> 18) + d | 0;
        b += (c & a | d & ~a) + k[0] - 373897302 | 0;
        b = (b << 20 | b >>> 12) + c | 0;
        a += (b & d | c & ~d) + k[5] - 701558691 | 0;
        a = (a << 5 | a >>> 27) + b | 0;
        d += (a & c | b & ~c) + k[10] + 38016083 | 0;
        d = (d << 9 | d >>> 23) + a | 0;
        c += (d & b | a & ~b) + k[15] - 660478335 | 0;
        c = (c << 14 | c >>> 18) + d | 0;
        b += (c & a | d & ~a) + k[4] - 405537848 | 0;
        b = (b << 20 | b >>> 12) + c | 0;
        a += (b & d | c & ~d) + k[9] + 568446438 | 0;
        a = (a << 5 | a >>> 27) + b | 0;
        d += (a & c | b & ~c) + k[14] - 1019803690 | 0;
        d = (d << 9 | d >>> 23) + a | 0;
        c += (d & b | a & ~b) + k[3] - 187363961 | 0;
        c = (c << 14 | c >>> 18) + d | 0;
        b += (c & a | d & ~a) + k[8] + 1163531501 | 0;
        b = (b << 20 | b >>> 12) + c | 0;
        a += (b & d | c & ~d) + k[13] - 1444681467 | 0;
        a = (a << 5 | a >>> 27) + b | 0;
        d += (a & c | b & ~c) + k[2] - 51403784 | 0;
        d = (d << 9 | d >>> 23) + a | 0;
        c += (d & b | a & ~b) + k[7] + 1735328473 | 0;
        c = (c << 14 | c >>> 18) + d | 0;
        b += (c & a | d & ~a) + k[12] - 1926607734 | 0;
        b = (b << 20 | b >>> 12) + c | 0;
        // hh()
        a += (b ^ c ^ d) + k[5] - 378558 | 0;
        a = (a << 4 | a >>> 28) + b | 0;
        d += (a ^ b ^ c) + k[8] - 2022574463 | 0;
        d = (d << 11 | d >>> 21) + a | 0;
        c += (d ^ a ^ b) + k[11] + 1839030562 | 0;
        c = (c << 16 | c >>> 16) + d | 0;
        b += (c ^ d ^ a) + k[14] - 35309556 | 0;
        b = (b << 23 | b >>> 9) + c | 0;
        a += (b ^ c ^ d) + k[1] - 1530992060 | 0;
        a = (a << 4 | a >>> 28) + b | 0;
        d += (a ^ b ^ c) + k[4] + 1272893353 | 0;
        d = (d << 11 | d >>> 21) + a | 0;
        c += (d ^ a ^ b) + k[7] - 155497632 | 0;
        c = (c << 16 | c >>> 16) + d | 0;
        b += (c ^ d ^ a) + k[10] - 1094730640 | 0;
        b = (b << 23 | b >>> 9) + c | 0;
        a += (b ^ c ^ d) + k[13] + 681279174 | 0;
        a = (a << 4 | a >>> 28) + b | 0;
        d += (a ^ b ^ c) + k[0] - 358537222 | 0;
        d = (d << 11 | d >>> 21) + a | 0;
        c += (d ^ a ^ b) + k[3] - 722521979 | 0;
        c = (c << 16 | c >>> 16) + d | 0;
        b += (c ^ d ^ a) + k[6] + 76029189 | 0;
        b = (b << 23 | b >>> 9) + c | 0;
        a += (b ^ c ^ d) + k[9] - 640364487 | 0;
        a = (a << 4 | a >>> 28) + b | 0;
        d += (a ^ b ^ c) + k[12] - 421815835 | 0;
        d = (d << 11 | d >>> 21) + a | 0;
        c += (d ^ a ^ b) + k[15] + 530742520 | 0;
        c = (c << 16 | c >>> 16) + d | 0;
        b += (c ^ d ^ a) + k[2] - 995338651 | 0;
        b = (b << 23 | b >>> 9) + c | 0;
        // ii()
        a += (c ^ (b | ~d)) + k[0] - 198630844 | 0;
        a = (a << 6 | a >>> 26) + b | 0;
        d += (b ^ (a | ~c)) + k[7] + 1126891415 | 0;
        d = (d << 10 | d >>> 22) + a | 0;
        c += (a ^ (d | ~b)) + k[14] - 1416354905 | 0;
        c = (c << 15 | c >>> 17) + d | 0;
        b += (d ^ (c | ~a)) + k[5] - 57434055 | 0;
        b = (b << 21 | b >>> 11) + c | 0;
        a += (c ^ (b | ~d)) + k[12] + 1700485571 | 0;
        a = (a << 6 | a >>> 26) + b | 0;
        d += (b ^ (a | ~c)) + k[3] - 1894986606 | 0;
        d = (d << 10 | d >>> 22) + a | 0;
        c += (a ^ (d | ~b)) + k[10] - 1051523 | 0;
        c = (c << 15 | c >>> 17) + d | 0;
        b += (d ^ (c | ~a)) + k[1] - 2054922799 | 0;
        b = (b << 21 | b >>> 11) + c | 0;
        a += (c ^ (b | ~d)) + k[8] + 1873313359 | 0;
        a = (a << 6 | a >>> 26) + b | 0;
        d += (b ^ (a | ~c)) + k[15] - 30611744 | 0;
        d = (d << 10 | d >>> 22) + a | 0;
        c += (a ^ (d | ~b)) + k[6] - 1560198380 | 0;
        c = (c << 15 | c >>> 17) + d | 0;
        b += (d ^ (c | ~a)) + k[13] + 1309151649 | 0;
        b = (b << 21 | b >>> 11) + c | 0;
        a += (c ^ (b | ~d)) + k[4] - 145523070 | 0;
        a = (a << 6 | a >>> 26) + b | 0;
        d += (b ^ (a | ~c)) + k[11] - 1120210379 | 0;
        d = (d << 10 | d >>> 22) + a | 0;
        c += (a ^ (d | ~b)) + k[2] + 718787259 | 0;
        c = (c << 15 | c >>> 17) + d | 0;
        b += (d ^ (c | ~a)) + k[9] - 343485551 | 0;
        b = (b << 21 | b >>> 11) + c | 0;

        x[0] = a + x[0] | 0;
        x[1] = b + x[1] | 0;
        x[2] = c + x[2] | 0;
        x[3] = d + x[3] | 0;
    };

    constructor() {
        this.init();
    }

    /**
     * MD5 hash a unicode string via a singleton MD5 instance.
     * @param str string to hash
     * @param raw whether to return a hex string (default) or a byte array
     * @returns MD5 hash of the input string
     */
    static hashStr(str: string, raw?: false): string
    static hashStr(str: string, raw: true): Int32Array
    static hashStr(str: string, raw = false): string | Int32Array {
        return singleton
            .init()
            .appendStr(str)
            .digest(raw as any);
    };

    /**
     * MD5 hash an ASCII string via a singleton MD5 instance.
     * @param str string to hash
     * @param raw whether to return a hex string (default) or a byte array
     * @returns MD5 hash of the input string
     */
    static hashAsciiStr(str: string, raw?: false): string
    static hashAsciiStr(str: string, raw: true): Int32Array
    static hashAsciiStr(str: string, raw = false): string | Int32Array {
        return singleton
            .init()
            .appendAsciiStr(str)
            .digest(raw as any);
    };

    /**
     * Reset internal state to start hashing values.
     * @returns self
     */
    init() {
        this.dataLength = 0;
        this.state = new Int32Array(4);
        this.buffer = new ArrayBuffer(68)
        this.bufferLength = 0;
        this.buffer8 = new Uint8Array(this.buffer, 0, 68);
        this.buffer32 = new Uint32Array(this.buffer, 0, 17);
        this.state.set(this.stateIdentity);
        return this;
    };

    // Char to code point to to array conversion:
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/charCodeAt#Example.3A_Fixing_charCodeAt_to_handle_non-Basic-Multilingual-Plane_characters_if_their_presence_earlier_in_the_string_is_unknown
    /**
     * Add a unicode string the the current hashing context.
     * @param str 
     * @returns self
     */
    appendStr(str: string) {
        const buf8 = this.buffer8;
        const buf32 = this.buffer32;
        let bufLen = this.bufferLength;
        let code;
        for (let i = 0; i < str.length; i++) {
            code = str.charCodeAt(i);
            if (code < 128) {
                buf8[bufLen++] = code;
            } 
            else if (code < 0x800) {
                buf8[bufLen++] = (code >>> 6) + 0xC0;
                buf8[bufLen++] = code & 0x3F | 0x80;
            } 
            else if (code < 0xD800 || code > 0xDBFF) {
                buf8[bufLen++] = (code >>> 12) + 0xE0;
                buf8[bufLen++] = (code >>> 6 & 0x3F) | 0x80;
                buf8[bufLen++] = (code & 0x3F) | 0x80;
            } 
            else {
                code = ((code - 0xD800) * 0x400) + (str.charCodeAt(++i) - 0xDC00) + 0x10000;
                if (code > 0x10FFFF) {
                    throw 'Unicode standard supports code points up to U+10FFFF';
                }
                buf8[bufLen++] = (code >>> 18) + 0xF0;
                buf8[bufLen++] = (code >>> 12 & 0x3F) | 0x80;
                buf8[bufLen++] = (code >>> 6 & 0x3F) | 0x80;
                buf8[bufLen++] = (code & 0x3F) | 0x80;
            }
            if (bufLen >= 64) {
                this.dataLength += 64;
                this.md5cycle(this.state, buf32);
                bufLen -= 64;
                buf32[0] = buf32[16];
            }
        }
        this.bufferLength = bufLen;
        return this;
    }

    /**
     * Add an ASCII string the the current hashing context.
     * @param str 
     * @returns self
     */
    appendAsciiStr(str: string) {
        const buf8 = this.buffer8;
        const buf32 = this.buffer32;
        let bufLen = this.bufferLength;
        let i, j = 0;
        for (; ;) {
            i = Math.min(str.length - j, 64 - bufLen);
            while (i--) {
                buf8[bufLen++] = str.charCodeAt(j++);
            }
            if (bufLen < 64) {
                break;
            }
            this.dataLength += 64;
            this.md5cycle(this.state, buf32);
            bufLen = 0;
        }
        this.bufferLength = bufLen;
        return this;
    }

    /**
     * Append a Byte array to the hash context
     * @param input array to append
     * @returns self
     */
    appendByteArray(input: Uint8Array) {
        const buf8 = this.buffer8;
        const buf32 = this.buffer32;
        let bufLen = this.bufferLength;
        let i, j = 0;
        for (; ;) {
            i = Math.min(input.length - j, 64 - bufLen);
            while (i--) {
                buf8[bufLen++] = input[j++];
            }
            if (bufLen < 64) {
                break;
            }
            this.dataLength += 64;
            this.md5cycle(this.state, buf32);
            bufLen = 0;
        }
        this.bufferLength = bufLen;
        return this;
    }

    /**
     * Digest the hashing context into a checksum.
     * @param raw Whether to return the checksum as a hex string or byte array.
     * @returns 
     */
    digest(raw: false): string
    digest(raw: true): Int32Array
    digest(raw: boolean = false): string | Int32Array {
        let bufLen = this.bufferLength;
        this.dataLength += bufLen;
        const buf8 = this.buffer8;
        buf8[bufLen] = 0x80;
        buf8[bufLen + 1] = buf8[bufLen + 2] = buf8[bufLen + 3] = 0;
        const buf32 = this.buffer32;
        let i = (bufLen >> 2) + 1;
        buf32.set(this.buffer32Identity.subarray(i), i);
        if (bufLen > 55) {
            this.md5cycle(this.state, buf32);
            buf32.set(this.buffer32Identity);
        }
        // Do the final computation based on the tail and length
        // Beware that the final length may not fit in 32 bits so we take care of that
        const dataBitsLen = this.dataLength * 8;
        if (dataBitsLen <= 0xFFFFFFFF) {
            buf32[14] = dataBitsLen;
        }
        else {
            // TODO: Evaluate if this regex is necessary.
            const matches = dataBitsLen.toString(16).match(/(.*?)(.{0,8})$/);
            const lo = parseInt(matches![2], 16);
            const hi = parseInt(matches![1], 16) || 0;
            buf32[14] = lo;
            buf32[15] = hi;
        }
        this.md5cycle(this.state, buf32);

        return !!raw ? this.state : this.hex(this.state);
    }

    private hex(x: Int32Array) {
        const hc = this.hexChars;
        const ho = [];
        let n, offset, j;
        for (let i = 0; i < 4; i++) {
            offset = i * 8;
            n = x[i];
            for (j = 0; j < 8; j += 2) {
                ho[offset + 1 + j] = hc.charAt(n & 0x0F);
                n >>>= 4;
                ho[offset + 0 + j] = hc.charAt(n & 0x0F);
                n >>>= 4;
            }
        }
        return ho.join('');
    };
}
singleton = new MD5();

// Self-test
// In some cases the fast add32 function cannot be used..
if (MD5.hashStr('hello') !== '5d41402abc4b2a76b9719d911017c592') {
    console.error('YaMD5> this javascript engine does not support YaMD5. Sorry.');
}
