import { Music2, ShieldCheck, X } from "lucide-react";
import { useEffect } from "react";

interface Props {
  open: boolean;
  onContinue: () => void;
  onCancel: () => void;
}

/**
 * Explanatory sheet shown BEFORE the Android system permission dialog,
 * per Material guidelines. Pure presentation — the actual permission
 * request is triggered by the parent after `onContinue`.
 */
export function PermissionExplainModal({ open, onContinue, onCancel }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="perm-title"
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Fermer"
          onClick={onCancel}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-accent/40 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div
          className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Music2 className="h-7 w-7" />
        </div>

        <h2 id="perm-title" className="text-center text-lg font-semibold tracking-tight">
          Accès à votre bibliothèque musicale
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground leading-relaxed">
          TempoKey a besoin d'accéder à votre bibliothèque musicale afin
          d'analyser les BPM, tonalités et harmonies de vos morceaux.
        </p>

        <div className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-[var(--surface-elevated)]/60 p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Vos fichiers restent sur votre appareil. Aucun envoi vers un
            serveur, aucune télémétrie sur le contenu audio.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 rounded-xl border border-border bg-transparent text-sm font-medium hover:bg-accent/40 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="h-11 rounded-xl text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            style={{ background: "var(--gradient-primary)" }}
            autoFocus
          >
            Continuer
          </button>
        </div>
      </div>
    </div>
  );
}
