/**
 * Android SPA entry point.
 *
 * Mounted by android-template/index.html. Boots TanStack Router in
 * client-only mode (no SSR shell). Wraps the whole tree in an error
 * boundary so any render-time crash shows a recovery screen instead of
 * the dreaded black WebView.
 */
import { StrictMode, Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import "./styles.css";

declare global {
  interface Window {
    __TK_MOUNTED__?: boolean;
    __tkStep?: (s: string) => void;
    __tkReady?: () => void;
    __tkFatal?: (err: unknown) => void;
  }
}

const tkStep = (s: string) => {
  try {
    window.__tkStep?.(s);
  } catch {
    /* noop */
  }
};
const tkFatal = (err: unknown) => {
  try {
    window.__tkFatal?.(err);
  } catch {
    console.error("[TempoKey] fatal handler failed", err);
  }
};

class RootErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error("[TempoKey] react boundary", error);
    tkFatal(error);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
          <div className="max-w-sm text-center">
            <h1 className="text-xl font-semibold">TempoKey a rencontré un problème</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Une erreur inattendue s’est produite. Vous pouvez redémarrer l’application.
            </p>
            <pre className="mt-4 max-h-40 overflow-auto rounded-md bg-muted p-3 text-left text-xs">
              {this.state.error.message}
            </pre>
            <button
              onClick={() => location.reload()}
              className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Redémarrer
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function boot() {
  try {
    tkStep("js-loaded");

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
    });

    tkStep("router-init");
    const router = createRouter({
      routeTree,
      context: { queryClient },
      defaultPreloadStaleTime: 0,
      defaultErrorComponent: ({ error, reset }) => (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="max-w-sm text-center">
            <h1 className="text-lg font-semibold">Cette vue n’a pas pu s’afficher</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
            <button
              onClick={reset}
              className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Réessayer
            </button>
          </div>
        </div>
      ),
    });

    tkStep("react-mount");
    const el = document.getElementById("app");
    if (!el) throw new Error("Missing #app root element");
    const root = createRoot(el);
    root.render(
      <StrictMode>
        <RootErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </RootErrorBoundary>
      </StrictMode>,
    );

    // Hide the bootstrap overlay on next frame, once React has committed.
    requestAnimationFrame(() => {
      window.__TK_MOUNTED__ = true;
      tkStep("ui-rendered");
      window.__tkReady?.();
    });
  } catch (err) {
    console.error("[TempoKey] boot failed", err);
    tkFatal(err);
  }
}

boot();
