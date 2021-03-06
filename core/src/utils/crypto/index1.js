import aesjs from 'aes-js';
import bigInt from 'big-integer';
import {
  bigIntToBytes,
  bytesToBigInt,
  getRandomBytes,
  concatBytes,
  xorBytes,
} from '../../utils/common/index.js';
import { SHA1 } from './sha1/index.js';
import { SHA256 } from './sha256/index.js';
import { PBKDF2 } from './pbkdf2/index.js';

const AES = aesjs.AES;
AES.Counter = aesjs.Counter;
AES.CTR = aesjs.ModeOfOperation.ctr;

const createArray = aesjs._arrayTest.createArray;
const copyArray = aesjs._arrayTest.copyArray;

class ModeOfOperationIGE {
  constructor(key, iv) {
    this.description = 'Infinite Garble Extension';
    this.name = 'ige';

    this._aes = new AES(key);
    this._iv = iv;
    this._ivp = null;
  }

  encrypt(plaintext) {
    if (plaintext.length % 16 !== 0) {
      throw new Error('invalid plaintext size (must be multiple of 16 bytes)');
    }

    const ciphertext = createArray(plaintext.length);
    let block = createArray(16);

    if (this._ivp === null) {
      this._ivp = this._iv.slice(0, 16);
      this._iv2p = this._iv.slice(16, 32);
    }

    for (let i = 0; i < plaintext.length; i += 16) {
      const nextIv2p = plaintext.slice(i, i + 16);

      copyArray(plaintext, block, 0, i, i + 16);
      block = xorBytes(block, this._ivp);
      block = this._aes.encrypt(block);
      block = xorBytes(block, this._iv2p);
      copyArray(block, ciphertext, i);

      this._ivp = ciphertext.slice(i, i + 16);
      this._iv2p = nextIv2p;
    }

    return ciphertext;
  }

  decrypt(ciphertext) {
    if (ciphertext.length % 16 !== 0) {
      throw new Error('invalid ciphertext size (must be multiple of 16 bytes)');
    }

    const plaintext = createArray(ciphertext.length);
    let block = createArray(16);

    if (this._ivp === null) {
      this._ivp = this._iv.slice(0, 16);
      this._iv2p = this._iv.slice(16, 32);
    }

    for (let i = 0; i < ciphertext.length; i += 16) {
      const nextIvp = ciphertext.slice(i, i + 16);

      copyArray(ciphertext, block, 0, i, i + 16);
      block = xorBytes(block, this._iv2p);
      block = this._aes.decrypt(block);
      block = xorBytes(block, this._ivp);
      copyArray(block, plaintext, i);

      this._ivp = nextIvp;
      this._iv2p = plaintext.slice(i, i + 16);
    }
    return plaintext;
  }
}

AES.IGE = ModeOfOperationIGE;

class RSA {
  constructor(publicKey) {
    this.exponent = publicKey.exponent;
    this.modulus = publicKey.modulus;
  }

  encrypt(bytes) {
    const encryptedBigInt = bytesToBigInt(bytes).modPow(
      bigInt(this.exponent, 16),
      bigInt(this.modulus, 16)
    );

    return bigIntToBytes(encryptedBigInt, 256);
  }
}

async function getSRPParams({ g, p, salt1, salt2, gB, password }) {
  const H = SHA256;
  const SH = (data, salt) => {
    return SHA256(concatBytes(salt, data, salt));
  };
  const PH1 = async (password, salt1, salt2) => {
    return await SH(await SH(password, salt1), salt2);
  };
  const PH2 = async (password, salt1, salt2) => {
    return await SH(
      await PBKDF2(await PH1(password, salt1, salt2), salt1, 100000),
      salt2
    );
  };

  const encoder = new TextEncoder();

  const gBigInt = bigInt(g);
  const gBytes = bigIntToBytes(gBigInt, 256);
  const pBigInt = bytesToBigInt(p);
  const aBigInt = bytesToBigInt(getRandomBytes(256));
  const gABigInt = gBigInt.modPow(aBigInt, pBigInt);
  const gABytes = bigIntToBytes(gABigInt);
  const gBBytes = bytesToBigInt(gB);
  const [k, u, x] = await Promise.all([
    H(concatBytes(p, gBytes)),
    H(concatBytes(gABytes, gB)),
    PH2(encoder.encode(password), salt1, salt2),
  ]);
  const kBigInt = bytesToBigInt(k);
  const uBigInt = bytesToBigInt(u);
  const xBigInt = bytesToBigInt(x);
  const vBigInt = gBigInt.modPow(xBigInt, pBigInt);
  const kVBigInt = kBigInt.multiply(vBigInt).mod(pBigInt);
  let tBigInt = gBBytes.subtract(kVBigInt).mod(pBigInt);
  if (tBigInt.isNegative()) {
    tBigInt = tBigInt.add(pBigInt);
  }
  const sABigInt = tBigInt.modPow(
    aBigInt.add(uBigInt.multiply(xBigInt)),
    pBigInt
  );
  const sABytes = bigIntToBytes(sABigInt);
  const kA = await H(sABytes);
  const M1 = await H(
    concatBytes(
      xorBytes(await H(p), await H(gBytes)),
      await H(salt1),
      await H(salt2),
      gABytes,
      gB,
      kA
    )
  );

  return { A: gABytes, M1 };
}

export { AES, RSA, SHA1, SHA256, getSRPParams };
