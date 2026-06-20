import { Link } from "@tanstack/react-router";
import { Settings, FolderSync } from "lucide-react";
import logoAsset from "@/assets/tempokey-logo.png.asset.json";

export function WorkspaceHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-[var(--surface)] shadow-[0_1px_0_0_color-mix(in_oklab,var(--primary)_8%,transparent)]">
      <div className="flex items-center gap-2 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="Accueil">
          <img src={logoAsset.url} alt="TempoKey" className="h-8 w-8 object-contain" />
          <span className="font-display text-[15px] font-semibold tracking-tight">TempoKey</span>
        </Link>
        <div className="flex-1" />
        <Link
          to="/"
          aria-label="Changer de bibliothèque"
          className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <FolderSync className="h-5 w-5" />
        </Link>
        <Link
          to="/settings"
          aria-label="Paramètres"
          className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}
