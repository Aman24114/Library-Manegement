"use client";

import { IKImage, ImageKitProvider, IKUpload, IKVideo } from "imagekitio-next";
import config from "@/lib/config";
import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Destructure the environment variables from your config
const {
  env: {
    imagekit: { publicKey, urlEndpoint },
    apiEndpoint,
  },
} = config;

// Authenticator function that calls your custom API endpoint.
// Adjust the HTTP method if your endpoint expects a POST instead of GET.
const authenticator = async () => {
  try {
    const response = await fetch(`${apiEndpoint}/api/auth/imagekit`, {
      method: "GET", // Change to "POST" if needed
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Authentication error:", errorText);
      throw new Error(`Request failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const { signature, expire, token } = data;
    return { token, expire, signature };
  } catch (error: any) {
    console.error("Authenticator failed:", error);
    throw new Error(`Authentication request failed: ${error.message}`);
  }
};

interface Props {
  type: "image" | "video";
  accept: string;
  placeholder: string;
  folder: string;
  variant: "dark" | "light";
  onFileChange: (filePath: string) => void;
  value?: string;
}

const FileUpload = ({
  type,
  accept,
  placeholder,
  folder,
  variant,
  onFileChange,
  value,
}: Props) => {
  const ikUploadRef = useRef(null);
  const [file, setFile] = useState<{ filePath: string | null }>({
    filePath: value ?? null,
  });
  const [progress, setProgress] = useState(0);

  // Style classes based on variant
  const styles = {
    button: variant === "dark" ? "bg-dark-300" : "bg-light-600 border-gray-100 border",
    placeholder: variant === "dark" ? "text-light-100" : "text-slate-500",
    text: variant === "dark" ? "text-light-100" : "text-dark-400",
  };

  const onError = (error: any) => {
    console.error("Upload error:", error);
    toast({
      title: `${type} upload failed`,
      description: `Your ${type} could not be uploaded. Please try again.`,
      variant: "destructive",
    });
  };

  const onSuccess = (res: any) => {
    console.log("Upload success response:", res);
    if (res.filePath) {
      setFile(res);
      onFileChange(res.filePath);
      toast({
        title: `${type} uploaded successfully`,
        description: `${res.filePath} uploaded successfully!`,
      });
    } else {
      onError(new Error("No file path returned"));
    }
  };

  const onValidate = (file: File) => {
    if (type === "image" && file.size > 20 * 1024 * 1024) {
      toast({
        title: "File size too large",
        description: "Please upload a file that is less than 20MB in size",
        variant: "destructive",
      });
      return false;
    }
    if (type === "video" && file.size > 50 * 1024 * 1024) {
      toast({
        title: "File size too large",
        description: "Please upload a file that is less than 50MB in size",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  return (
    <ImageKitProvider publicKey={publicKey} urlEndpoint={urlEndpoint} authenticator={authenticator}>
      <IKUpload
        ref={ikUploadRef}
        onError={onError}
        onSuccess={onSuccess}
        useUniqueFileName={true}
        validateFile={onValidate}
        onUploadStart={() => setProgress(0)}
        onUploadProgress={({ loaded, total }) => {
          const percent = Math.round((loaded / total) * 100);
          setProgress(percent);
        }}
        folder={folder}
        accept={accept}
        className="hidden"
      />

      <button
        className={cn("upload-btn", styles.button)}
        onClick={(e) => {
          e.preventDefault();
          // @ts-ignore
          ikUploadRef.current?.click();
        }}
      >
        <Image src="/icons/upload.svg" alt="upload-icon" width={20} height={20} className="object-contain" />
        <p className={cn("text-base", styles.placeholder)}>{placeholder}</p>
        {file?.filePath && <p className={cn("upload-filename", styles.text)}>{file.filePath}</p>}
      </button>

      {progress > 0 && progress !== 100 && (
        <div className="w-full rounded-full bg-green-200">
          <div className="progress" style={{ width: `${progress}%` }}>
            {progress}%
          </div>
        </div>
      )}

      {file?.filePath && type === "image" && (
        <IKImage alt="Uploaded image" path={file.filePath} width={500} height={300} />
      )}
      {file?.filePath && type === "video" && (
        <IKVideo path={file.filePath} controls={true} className="h-96 w-full rounded-xl" />
      )}
    </ImageKitProvider>
  );
};

export default FileUpload;
