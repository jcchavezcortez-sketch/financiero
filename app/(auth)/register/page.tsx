"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const registerSchema = z.object({
  email: z.string().min(1, "El correo es requerido").email("Correo inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  confirm: z.string().min(1, "Confirma tu contraseña"),
}).refine((d) => d.password === d.confirm, {
  message: "Las contraseñas no coinciden",
  path: ["confirm"],
});
type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterForm) => {
    setServerError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });
    if (error) {
      setServerError(error.message);
      return;
    }
    router.push("/onboarding");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-stone-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="text-7xl mb-4">✨</div>
          <h1 className="text-3xl font-bold text-zinc-800 mb-2">Crear cuenta</h1>
          <p className="text-zinc-500 text-base">Empieza a controlar tu dinero</p>
        </div>

        <div className="bg-white rounded-3xl shadow-md p-6 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" type="email" placeholder="juani@email.com" autoComplete="email" {...register("email")} />
            {errors.email && <p className="text-xs text-rose-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" placeholder="Mínimo 8 caracteres" autoComplete="new-password" {...register("password")} />
            {errors.password && <p className="text-xs text-rose-500">{errors.password.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirmar contraseña</Label>
            <Input id="confirm" type="password" placeholder="Repite tu contraseña" autoComplete="new-password" {...register("confirm")} />
            {errors.confirm && <p className="text-xs text-rose-500">{errors.confirm.message}</p>}
          </div>

          {serverError && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
              <p className="text-sm text-rose-700">{serverError}</p>
            </div>
          )}

          <Button className="w-full" size="lg" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
          </Button>
        </div>

        <p className="text-center mt-5 text-sm text-zinc-500">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-violet-600 font-semibold hover:underline">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
