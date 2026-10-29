"use client";

import { useId, useState, type InputHTMLAttributes } from "react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function PasswordInput({ id, ...props }: PasswordInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);

  return <span className="password-field">
    <input {...props} id={inputId} type={visible ? "text" : "password"} />
    <button
      aria-label={visible ? "Hide password" : "Show password"}
      aria-controls={inputId}
      aria-pressed={visible}
      className="password-toggle"
      onClick={() => setVisible((current) => !current)}
      type="button"
    >{visible ? "Hide" : "Show"}</button>
  </span>;
}
