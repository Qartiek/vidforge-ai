import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";

const TOKEN_TTL_MS = 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await db.passwordResetToken.deleteMany({ where: { userId } });
  await db.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } });
  return token;
}

export async function resetPassword(token: string, password: string) {
  if (!token || password.length < 8 || password.length > 128) throw new Error("Invalid reset request");
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!record || record.usedAt || record.expiresAt <= new Date()) throw new Error("Reset link is invalid or expired");

  const passwordHash = await bcrypt.hash(password, 12);
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    db.session.deleteMany({ where: { userId: record.userId } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) throw new Error("Password reset email is not configured");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Reset your VidForge AI password",
      text: `Reset your VidForge AI password using this link (valid for 1 hour):\n\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>Reset your VidForge AI password</h2><p>This link is valid for 1 hour.</p><p><a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#111;color:#fff;text-decoration:none;border-radius:8px">Reset password</a></p><p>If you did not request this, you can safely ignore this email.</p></div>`,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("PASSWORD_RESET_EMAIL_FAILED", response.status, detail);
    throw new Error("Unable to send password reset email");
  }
}
