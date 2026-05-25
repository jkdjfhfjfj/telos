import speakeasy from "speakeasy";
import QRCode from "qrcode";

export function generateTotpSecret(email: string): { secret: string; otpauthUrl: string } {
  const generated = speakeasy.generateSecret({
    name: `Telos Wallet (${email})`,
    issuer: "Telos Wallet",
    length: 20,
  });
  return {
    secret: generated.base32,
    otpauthUrl: generated.otpauth_url ?? "",
  };
}

export async function generateQrCode(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl);
}

export function verifyTotpCode(secret: string, code: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token: code,
    window: 2,
  });
}
