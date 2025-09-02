"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanAnsiCodes = cleanAnsiCodes;
/**
 * Clean ANSI escape codes from text
 */
function cleanAnsiCodes(text) {
    if (!text)
        return "";
    const escChar = String.fromCharCode(27);
    let cleaned = text.replace(new RegExp(`${escChar}\\[[0-9;]*[mG]`, "g"), "");
    // Remove control characters using String.fromCharCode to avoid regex control chars
    const controlChars = [];
    for (let i = 0; i <= 31; i++)
        controlChars.push(String.fromCharCode(i));
    for (let i = 127; i <= 159; i++)
        controlChars.push(String.fromCharCode(i));
    for (const char of controlChars) {
        cleaned = cleaned.split(char).join("");
    }
    return cleaned;
}
