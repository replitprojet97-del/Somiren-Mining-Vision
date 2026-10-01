import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiBase } from "@/lib/api";
import { readApiError } from "@/lib/api-error";
import { getActiveLanguage } from "@/lib/workspace-locale";

export type TwoFactorStatus = {
  enabled: boolean;
  available: boolean;
  recoveryCodesRemaining: number;
};

export type TwoFactorSetup = {
  secret: string;
  otpauthUrl: string;
  expiresAt: string;
};

type RecoveryCodesResponse = { recoveryCodes: string[] };

async function twoFactorRequest<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getApiBase()}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  } catch {
    throw new Error(getActiveLanguage() === "en"
      ? "Unable to connect. Check your connection and try again."
      : "Connexion impossible. Vérifiez votre connexion réseau et réessayez.");
  }
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event("workspace:unauthorized"));
    const apiError = await readApiError(response);
    const english = getActiveLanguage() === "en";
    const message = response.status === 429
      ? english ? "Too many attempts. Please try again later." : "Trop de tentatives. Réessayez plus tard."
      : response.status === 503
        ? english ? "Two-factor authentication is currently unavailable. No changes were made." : "L’authentification à deux facteurs est indisponible pour le moment. Aucun changement n'a été effectué."
        : response.status === 409
          ? english
            ? path.endsWith("/setup") ? "Two-factor authentication is already enabled." : "Two-factor authentication is not enabled."
            : path.endsWith("/setup") ? "L’authentification à deux facteurs est déjà activée." : "L’authentification à deux facteurs n’est pas activée."
          : response.status === 400
            ? english ? "The verification code or request is invalid. Check the code and try again." : "Le code de vérification ou la demande est invalide. Vérifiez le code et réessayez."
            : response.status === 401
              ? english
                ? path.endsWith("/setup") ? "The current password is incorrect." : "The password or verification code is incorrect."
                : path.endsWith("/setup") ? "Le mot de passe actuel est incorrect." : "Le mot de passe ou le code de vérification est incorrect."
              : english ? "The request could not be completed. Please try again." : "La demande n'a pas pu aboutir. Réessayez.";
    throw Object.assign(new Error(message), { status: apiError.status });
  }
  return response.status === 204 ? (null as T) : response.json();
}

const postJson = (body: unknown): RequestInit => ({
  method: "POST",
  body: JSON.stringify(body),
});

export function useTwoFactor(actorId: number | null | undefined) {
  const queryClient = useQueryClient();
  const statusQuery = useQuery({
    queryKey: ["workspace", "security", "two-factor", actorId],
    queryFn: () => twoFactorRequest<TwoFactorStatus>("/workspace/security/2fa"),
    enabled: actorId != null,
    retry: false,
  });

  const invalidateSecurityData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["workspace", "security", "two-factor", actorId] }),
      queryClient.invalidateQueries({ queryKey: ["workspace", "activity"] }),
      queryClient.invalidateQueries({ queryKey: ["workspace", "sessions"] }),
      queryClient.invalidateQueries({ queryKey: ["workspace", "me"] }),
    ]);
  }, [actorId, queryClient]);

  const setup = useCallback((password: string) =>
    twoFactorRequest<TwoFactorSetup>("/workspace/security/2fa/setup", postJson({ password })), []);
  const enable = useCallback(async (code: string) => {
    const result = await twoFactorRequest<{ enabled: true; recoveryCodes: string[] }>(
      "/workspace/security/2fa/enable",
      postJson({ code }),
    );
    void invalidateSecurityData();
    return result;
  }, [invalidateSecurityData]);
  const disable = useCallback(async ({ password, code }: { password: string; code: string }) => {
    const result = await twoFactorRequest<{ enabled: false }>(
      "/workspace/security/2fa/disable",
      postJson({ password, code }),
    );
    void invalidateSecurityData();
    return result;
  }, [invalidateSecurityData]);
  const regenerateRecoveryCodes = useCallback(async ({ password, code }: { password: string; code: string }) => {
    const result = await twoFactorRequest<RecoveryCodesResponse>(
      "/workspace/security/2fa/recovery-codes",
      postJson({ password, code }),
    );
    void invalidateSecurityData();
    return result;
  }, [invalidateSecurityData]);

  return {
    statusQuery,
    setup,
    enable,
    disable,
    regenerateRecoveryCodes,
  };
}