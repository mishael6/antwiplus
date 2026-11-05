"use client";

import { useState, type ChangeEvent } from "react";

export function AdminAvatarUpload({ initialImageUrl, fallback }: { initialImageUrl: string | null; fallback: string }) {
  const [preview, setPreview] = useState(initialImageUrl ?? "");
  const [fileName, setFileName] = useState("");

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setPreview(URL.createObjectURL(file));
  }

  return <div className="admin-profile-preview">
    {preview ? <img src={preview} alt="Profile photo preview" /> : <span>{fallback}</span>}
    <div><b>{fileName || "Profile photo"}</b><small>JPG, PNG, or WebP · up to 2 MB</small><label className="admin-secondary-button" htmlFor="admin-avatar">{fileName ? "Choose a different photo" : initialImageUrl ? "Replace photo" : "Choose photo"}</label><input id="admin-avatar" name="avatar" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleChange} /></div>
  </div>;
}
