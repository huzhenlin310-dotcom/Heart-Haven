import { useCallback, useEffect, useRef, useState } from "react";
import { UPDATE_CHECK_INTERVAL_MS, UPDATE_SUMMARY_FALLBACK } from "../constants";
import { readUpdateFingerprint, writeUpdateFingerprint } from "../utils/storage";
import {
  clearAppCaches,
  getCurrentCodeFingerprint,
  getLatestUpdateSummary
} from "../utils/updates";

export function useServiceWorkerUpdates() {
  const pendingWorkerRef = useRef<ServiceWorker | null>(null);
  const refreshingRef = useRef(false);
  const [summary, setSummary] = useState("");

  const showPrompt = useCallback((worker: ServiceWorker | null, updateSummary?: string) => {
    pendingWorkerRef.current = worker;
    setSummary(updateSummary || UPDATE_SUMMARY_FALLBACK);
    getLatestUpdateSummary()
      .then((latestSummary) => {
        if (latestSummary) setSummary(latestSummary);
      })
      .catch(() => undefined);
  }, []);

  const checkForCodeUpdates = useCallback(() => {
    if (summary) return;

    getCurrentCodeFingerprint()
      .then((fingerprint) => {
        const savedFingerprint = readUpdateFingerprint();
        if (!savedFingerprint) {
          writeUpdateFingerprint(fingerprint);
          return;
        }
        if (savedFingerprint !== fingerprint) {
          writeUpdateFingerprint(fingerprint);
          showPrompt(null);
        }
      })
      .catch(() => undefined);
  }, [showPrompt, summary]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;

    function handleControllerChange() {
      if (!refreshingRef.current) return;
      window.location.reload();
    }

    function handleLoad() {
      navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
      navigator.serviceWorker.register("service-worker.js").then((registration) => {
        if (registration.waiting && navigator.serviceWorker.controller) {
          showPrompt(registration.waiting);
        }

        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener("statechange", () => {
            if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
              showPrompt(installingWorker);
            }
          });
        });

        const intervalId = window.setInterval(() => {
          registration.update().catch(() => undefined);
          checkForCodeUpdates();
        }, UPDATE_CHECK_INTERVAL_MS);

        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState !== "visible") return;
          registration.update().catch(() => undefined);
          checkForCodeUpdates();
        });

        checkForCodeUpdates();

        return () => window.clearInterval(intervalId);
      }).catch(() => undefined);
    }

    window.addEventListener("load", handleLoad);
    return () => {
      window.removeEventListener("load", handleLoad);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, [checkForCodeUpdates, showPrompt]);

  const applyUpdate = useCallback(() => {
    const worker = pendingWorkerRef.current;
    if (!worker) {
      clearAppCaches().finally(() => window.location.reload());
      return;
    }

    refreshingRef.current = true;
    worker.postMessage({ type: "SKIP_WAITING" });
    window.setTimeout(() => window.location.reload(), 5000);
  }, []);

  return {
    updateSummary: summary,
    applyUpdate
  };
}
