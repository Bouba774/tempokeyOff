import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Music2, Settings2 } from "lucide-react";

export type AudioPermissionDialogVariant = "request" | "denied" | "blocked";

type Props = {
  open: boolean;
  variant: AudioPermissionDialogVariant;
  onCancel: () => void;
  onConfirm: () => void;
  onOpenSettings?: () => void;
};

/**
 * Material 3-flavoured consent dialog shown before TempoKey triggers the
 * Android audio file picker. Three states:
 *  - "request": first time, explain why and ask Continue / Cancel.
 *  - "denied":  user declined once, offer Retry / Cancel.
 *  - "blocked": never-ask-again, offer Open settings / Cancel.
 */
export function AudioPermissionDialog({
  open,
  variant,
  onCancel,
  onConfirm,
  onOpenSettings,
}: Props) {
  const isBlocked = variant === "blocked";
  const title =
    variant === "request"
      ? "Accès à la bibliothèque musicale"
      : "Accès refusé";
  const description =
    variant === "request"
      ? "TempoKey a besoin d'accéder à vos fichiers audio afin d'analyser les BPM, tonalités et organiser votre bibliothèque."
      : "TempoKey ne peut pas analyser votre bibliothèque sans accès aux fichiers audio.";

  const confirmLabel = isBlocked
    ? "Ouvrir les paramètres"
    : variant === "denied"
      ? "Réessayer"
      : "Continuer";

  return (
    <AlertDialog open={open} onOpenChange={(o) => (!o ? onCancel() : null)}>
      <AlertDialogContent className="max-w-sm rounded-3xl">
        <AlertDialogHeader>
          <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-[var(--surface-elevated)] text-[var(--primary)]">
            {isBlocked ? (
              <Settings2 className="h-6 w-6" />
            ) : (
              <Music2 className="h-6 w-6" />
            )}
          </div>
          <AlertDialogTitle className="text-center text-lg font-semibold">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-sm leading-relaxed">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-2 flex-col gap-2 sm:flex-col">
          <AlertDialogAction
            onClick={() => (isBlocked ? onOpenSettings?.() : onConfirm())}
            className="h-11 w-full rounded-2xl"
          >
            {confirmLabel}
          </AlertDialogAction>
          <AlertDialogCancel onClick={onCancel} className="h-11 w-full rounded-2xl">
            Annuler
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}