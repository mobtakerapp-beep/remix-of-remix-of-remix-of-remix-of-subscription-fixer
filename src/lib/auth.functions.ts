import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const signUpSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
  teacherName: z.string().trim().max(120).optional().default(""),
  school: z.string().trim().max(120).optional().default(""),
});

export type SignUpResult =
  | { ok: true }
  | { ok: false; code: "email_exists" | "weak_password" | "invalid" | "failed"; message: string };

/**
 * Creates the account server-side with the email already confirmed, so users
 * never have to open a confirmation email. The client signs in right after.
 */
export const signUpDirect = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => signUpSchema.parse(input))
  .handler(async ({ data }): Promise<SignUpResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        teacher_name: data.teacherName,
        school: data.school,
      },
    });

    if (!error) return { ok: true };

    const msg = (error.message || "").toLowerCase();
    if (msg.includes("already been registered") || msg.includes("already registered") || msg.includes("exists")) {
      return {
        ok: false,
        code: "email_exists",
        message: "هذا البريد مسجّل بالفعل. سجّل دخولك بدلاً من إنشاء حساب.",
      };
    }
    if (msg.includes("weak") || msg.includes("pwned") || msg.includes("password")) {
      return {
        ok: false,
        code: "weak_password",
        message: "كلمة المرور ضعيفة أو مسرّبة. اختر كلمة مرور أقوى (٨ أحرف مع أرقام ورموز).",
      };
    }
    console.error("[signUpDirect]", error);
    return { ok: false, code: "failed", message: "تعذّر إنشاء الحساب، حاول مرة أخرى." };
  });
