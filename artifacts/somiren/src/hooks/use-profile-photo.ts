import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WorkspaceProfilePhoto } from "@workspace/api-client-react";
import { mediaRequest, uploadPrivateFile } from "@/lib/private-media";
import { getActiveLanguage } from "@/lib/workspace-locale";

export const workspaceProfilePhotoQueryKey = ["workspace", "me", "photo"] as const;

const MAX_PROFILE_PHOTO_SIZE = 5 * 1024 * 1024;
const PROFILE_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function validateProfilePhoto(file: File): void {
  const english = getActiveLanguage() === "en";
  if (!PROFILE_PHOTO_TYPES.has(file.type.toLowerCase())) {
    throw new Error(english
      ? "Choose a JPEG, PNG or WebP image. SVG files are not accepted."
      : "Choisissez une image JPEG, PNG ou WebP. Les fichiers SVG ne sont pas acceptés.");
  }
  if (file.size <= 0) throw new Error(english ? "The image file is empty." : "Le fichier image est vide.");
  if (file.size > MAX_PROFILE_PHOTO_SIZE) {
    throw new Error(english ? "The photo must be no larger than 5 MB." : "La photo doit peser 5 Mo maximum.");
  }
}

export function useProfilePhoto() {
  const queryClient = useQueryClient();
  const photoQuery = useQuery({
    queryKey: workspaceProfilePhotoQueryKey,
    queryFn: () => mediaRequest<WorkspaceProfilePhoto>("/workspace/me/photo"),
    staleTime: 4 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      validateProfilePhoto(file);
      const assetId = await uploadPrivateFile(file, "profile-photo");
      return mediaRequest<{ updated: true }>("/workspace/me/photo", {
        method: "PUT",
        body: JSON.stringify({ assetId }),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workspaceProfilePhotoQueryKey });
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => mediaRequest<{ removed: true }>("/workspace/me/photo", { method: "DELETE" }),
    onSuccess: async () => {
      queryClient.setQueryData<WorkspaceProfilePhoto>(workspaceProfilePhotoQueryKey, previous => ({
        photo: null,
        removed: true,
        referencePortrait: previous?.referencePortrait ?? false,
      }));
      await queryClient.invalidateQueries({ queryKey: workspaceProfilePhotoQueryKey });
    },
  });

  return {
    photo: photoQuery.data?.photo ?? null,
    removed: photoQuery.data?.removed ?? false,
    referencePortrait: photoQuery.data?.referencePortrait === true,
    isReady: photoQuery.isSuccess,
    isLoading: photoQuery.isLoading,
    error: photoQuery.error,
    refresh: () => photoQuery.refetch(),
    uploadPhoto: (file: File) => uploadMutation.mutateAsync(file),
    isUploading: uploadMutation.isPending,
    uploadError: uploadMutation.error,
    removePhoto: () => removeMutation.mutateAsync(),
    isRemoving: removeMutation.isPending,
    removeError: removeMutation.error,
  };
}