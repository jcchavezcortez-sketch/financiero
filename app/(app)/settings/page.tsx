"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  LogOut,
  Download,
  Trash2,
  ChevronRight,
  User,
  Target,
  Database,
  Shield,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { mockUser } from "@/lib/mock-data";
import { CURRENCIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  getCurrentUser,
  getProfile,
  getUserSettings,
  upsertProfile,
  upsertUserSettings,
  signOut,
} from "@/lib/supabase/queries";

const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const profileSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  currency: z.string().min(1),
  payday: z.string().refine((v) => {
    const n = Number(v);
    return !isNaN(n) && n >= 1 && n <= 31;
  }, "Día inválido (1-31)"),
});

const goalsSchema = z.object({
  savingsGoal: z.string().refine(
    (v) => !isNaN(Number(v)) && Number(v) >= 0,
    "Ingresa un monto válido"
  ),
});

type ProfileForm = z.infer<typeof profileSchema>;
type GoalsForm = z.infer<typeof goalsSchema>;

export default function SettingsPage() {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState(mockUser.email);
  const [userName, setUserName] = useState(mockUser.name);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: mockUser.name,
      currency: mockUser.currency,
      payday: String(mockUser.payday),
    },
  });

  const goalsForm = useForm<GoalsForm>({
    resolver: zodResolver(goalsSchema),
    defaultValues: {
      savingsGoal: String(mockUser.savingsGoal),
    },
  });

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    Promise.all([getCurrentUser(), getProfile(), getUserSettings()]).then(
      ([user, profile, settings]) => {
        if (user?.email) setUserEmail(user.email);
        if (profile) {
          setUserName(profile.name);
          profileForm.reset({
            name: profile.name,
            currency: profile.currency ?? "PEN",
            payday: profile.payday ? String(profile.payday) : "1",
          });
        }
        if (settings?.savings_goal) {
          goalsForm.reset({ savingsGoal: String(settings.savings_goal) });
        }
      }
    );
  }, []);

  const saveProfile = profileForm.handleSubmit(async (data) => {
    if (!isSupabaseConfigured) {
      await new Promise((r) => setTimeout(r, 400));
      setSaved("profile");
      setTimeout(() => setSaved(null), 2000);
      return;
    }
    try {
      await upsertProfile({
        name: data.name,
        currency: data.currency,
        payday: Number(data.payday),
      });
      setUserName(data.name);
      setSaved("profile");
      setTimeout(() => setSaved(null), 2000);
    } catch {
      // silently handle
    }
  });

  const saveGoals = goalsForm.handleSubmit(async (data) => {
    if (!isSupabaseConfigured) {
      await new Promise((r) => setTimeout(r, 400));
      setSaved("goals");
      setTimeout(() => setSaved(null), 2000);
      return;
    }
    try {
      await upsertUserSettings({ savings_goal: Number(data.savingsGoal) });
      setSaved("goals");
      setTimeout(() => setSaved(null), 2000);
    } catch {
      // silently handle
    }
  });

  const handleExport = () => {
    const data = "fecha,descripcion,categoria,cuenta,tipo,monto\n";
    const blob = new Blob([data], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "finanzas-juani-export.csv";
    link.click();
  };

  const handleLogout = async () => {
    setShowLogoutDialog(false);
    if (isSupabaseConfigured) {
      await signOut();
    }
    router.push("/login");
    router.refresh();
  };

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-zinc-800">Configuración</h1>
      </div>

      {/* Profile Preview */}
      <div className="px-5 mb-6">
        <div className="bg-white rounded-3xl border border-zinc-100 p-5 flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="text-xl font-bold bg-violet-100 text-violet-700">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-bold text-zinc-800">{userName}</p>
            <p className="text-sm text-zinc-500">{userEmail}</p>
          </div>
        </div>
      </div>

      {/* Mi Perfil Section */}
      <div className="px-5 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <User className="size-4 text-violet-600" />
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
            Mi perfil
          </h2>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-100 p-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input {...profileForm.register("name")} />
            {profileForm.formState.errors.name && (
              <p className="text-xs text-rose-500">
                {profileForm.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Moneda principal</Label>
            <Select
              defaultValue={profileForm.getValues("currency")}
              onValueChange={(v) => profileForm.setValue("currency", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.symbol} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Día de sueldo</Label>
            <Input type="number" min={1} max={31} {...profileForm.register("payday")} />
            {profileForm.formState.errors.payday && (
              <p className="text-xs text-rose-500">
                {profileForm.formState.errors.payday.message}
              </p>
            )}
          </div>
          <Button
            className={cn("w-full transition-all", saved === "profile" && "bg-emerald-500")}
            onClick={saveProfile}
            disabled={profileForm.formState.isSubmitting}
          >
            {saved === "profile"
              ? "✓ Guardado"
              : profileForm.formState.isSubmitting
              ? "Guardando..."
              : "Guardar cambios"}
          </Button>
        </div>
      </div>

      {/* Goals Section */}
      <div className="px-5 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Target className="size-4 text-violet-600" />
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
            Metas
          </h2>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-100 p-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Meta de ahorro mensual</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">
                S/
              </span>
              <Input
                type="number"
                className="pl-10"
                {...goalsForm.register("savingsGoal")}
              />
            </div>
            {goalsForm.formState.errors.savingsGoal && (
              <p className="text-xs text-rose-500">
                {goalsForm.formState.errors.savingsGoal.message}
              </p>
            )}
          </div>
          <Button
            className={cn("w-full", saved === "goals" && "bg-emerald-500")}
            onClick={saveGoals}
            disabled={goalsForm.formState.isSubmitting}
          >
            {saved === "goals"
              ? "✓ Guardado"
              : goalsForm.formState.isSubmitting
              ? "Guardando..."
              : "Guardar meta"}
          </Button>
        </div>
      </div>

      {/* Data Section */}
      <div className="px-5 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Database className="size-4 text-violet-600" />
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
            Datos
          </h2>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          <button
            onClick={handleExport}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-zinc-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Download className="size-4 text-emerald-600" />
              </div>
              <span className="text-sm font-medium text-zinc-700">
                Exportar mis datos
              </span>
            </div>
            <ChevronRight className="size-4 text-zinc-400" />
          </button>
          <Separator />
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-rose-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
                <Trash2 className="size-4 text-rose-600" />
              </div>
              <span className="text-sm font-medium text-rose-600">
                Eliminar todos mis datos
              </span>
            </div>
            <ChevronRight className="size-4 text-rose-300" />
          </button>
        </div>
      </div>

      {/* Privacy Section */}
      <div className="px-5 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="size-4 text-violet-600" />
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
            Privacidad
          </h2>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-100 p-4">
          <p className="text-sm text-zinc-600 leading-relaxed">
            🔒 Tus datos financieros están protegidos con Row Level Security en
            Supabase. Solo tú tienes acceso a tus movimientos y saldos.
          </p>
        </div>
      </div>

      {/* Logout */}
      <div className="px-5 mb-8">
        <Button
          variant="outline"
          className="w-full text-zinc-700 gap-2"
          onClick={() => setShowLogoutDialog(true)}
        >
          <LogOut className="size-4" />
          Cerrar sesión
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar todos los datos?</DialogTitle>
            <DialogDescription>
              Esta acción es irreversible. Se eliminarán todas tus cuentas,
              movimientos y configuraciones. ¿Estás seguro?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowDeleteDialog(false);
                router.push("/login");
              }}
            >
              Sí, eliminar todo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar sesión</DialogTitle>
            <DialogDescription>
              ¿Seguro que quieres salir de tu cuenta?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogoutDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleLogout}>Cerrar sesión</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
