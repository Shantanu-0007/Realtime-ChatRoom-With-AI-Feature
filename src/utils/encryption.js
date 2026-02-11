import CryptoJS from "crypto-js";

// App-level secret (keep same for all users)
// In real apps → env variable
const APP_SECRET = "CHAT_APP_SUPER_SECRET_256_BIT";

/**
 * Deterministic AES key for private chat
 * Same key generated on both clients
 */
export const getChatKey = (uid1, uid2) => {
  const base = [uid1, uid2].sort().join("_") + APP_SECRET;
  return CryptoJS.SHA256(base).toString();
};

export const encryptMessage = (plainText, key) => {
  return CryptoJS.AES.encrypt(plainText, key).toString();
};

export const decryptMessage = (cipherText, key) => {
  try {
    return CryptoJS.AES.decrypt(cipherText, key).toString(
      CryptoJS.enc.Utf8
    );
  } catch {
    return "⚠️ Unable to decrypt message";
  }
};
