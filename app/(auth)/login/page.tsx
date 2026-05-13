"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "El correo es requerido")
    .email("Ingresa un correo válido"),
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (_data: LoginForm) => {
    // Mock: simulate login delay and redirect
    await new Promise((resolve) => setTimeout(resolve, 800));
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-stone-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo / Hero */}
        <div className="text-center mb-10">
          <div className="text-7xl mb-4 animate-pulse-gentle">💜</div>
          <h1 className="text-3xl font-bold text-zinc-800 mb-2">
            Finanzas de Sofi
          </h1>
          <p className="text-zinc-500 text-base">
            Tu dinero, tu control
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-3xl shadow-md p-6 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="sofi@email.com"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-rose-500 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-rose-500 mt-1">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Entrando...
              </span>
            ) : (
              "Entrar"
            )}
          </Button>
        </div>

        {/* Forgot password */}
        <div className="text-center mt-4">
          <button className="text-sm text-violet-600 hover:underline">
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        {/* Privacy note */}
        <p className="text-center text-xs text-zinc-400 mt-8 px-4 leading-relaxed">
          🔒 Tus datos se guardan de forma segura y privada. Solo tú tienes acceso.
        </p>
      </div>
    </div>
  );
}
