import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const COOKIE_NAME = "mutatech_session";

function base32Decode(base32: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  const result: number[] = [];

  for (const char of base32.toUpperCase().replace(/=+$/, "")) {
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }

  for (let i = 0; i + 8 <= bits.length; i += 8) {
    result.push(parseInt(bits.substring(i, i + 8), 2));
  }

  return Buffer.from(result);
}

function generateTOTP(
  secretBase32: string,
  timeStep = 30,
  digits = 6,
  timeOffset = 0
): string {
  const key = base32Decode(secretBase32);
  const counter = Math.floor(Date.now() / 1000 / timeStep) + timeOffset;

  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuffer.writeUInt32BE(counter % 0x100000000, 4);

  const hmac = crypto.createHmac("sha1", key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (code % Math.pow(10, digits)).toString().padStart(digits, "0");
}

export async function POST(request: NextRequest) {
  const secret = process.env.TOTP_SECRET;
  const accessToken = process.env.ACCESS_TOKEN;

  if (!secret || !accessToken) {
    return NextResponse.json(
      { error: "Configuration serveur manquante" },
      { status: 500 }
    );
  }

  let code: string | undefined;
  try {
    const body = await request.json();
    code = body.code;
  } catch {
    return NextResponse.json(
      { valid: false, error: "Requête invalide" },
      { status: 400 }
    );
  }

  if (!code || typeof code !== "string" || !/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { valid: false, error: "Code invalide" },
      { status: 400 }
    );
  }

  const isValid = [-1, 0, 1].some(
    (offset) => generateTOTP(secret, 30, 6, offset) === code
  );

  if (!isValid) {
    return NextResponse.json({ valid: false });
  }

  const response = NextResponse.json({ valid: true });
  response.cookies.set(COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
