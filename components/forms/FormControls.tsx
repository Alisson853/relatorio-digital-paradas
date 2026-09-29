"use client";

import { useId, type ChangeEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const baseInput =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100";

interface FieldWrapperProps {
  label: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

function FieldWrapper({ label, required, className, children }: FieldWrapperProps) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-danger-600">*</span>}
      </span>
      {children}
    </label>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  type?: string;
  // Nomes já usados em outros relatórios, para sugerir sem obrigar — o campo
  // continua texto livre (<datalist> só sugere, nunca restringe o que pode
  // ser digitado). Omitido/vazio: campo comum, sem sugestão nenhuma.
  suggestions?: string[];
}

export function TextField({ label, value, onChange, placeholder, required, className, type = "text", suggestions }: TextFieldProps) {
  const datalistId = useId();
  return (
    <FieldWrapper label={label} required={required} className={className}>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        list={suggestions?.length ? datalistId : undefined}
        className={baseInput}
      />
      {suggestions && suggestions.length > 0 && (
        <datalist id={datalistId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </FieldWrapper>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  className?: string;
  min?: number;
}

export function NumberField({ label, value, onChange, className, min = 0 }: NumberFieldProps) {
  return (
    <FieldWrapper label={label} className={className}>
      <input
        type="number"
        min={min}
        value={Number.isNaN(value) ? "" : value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        className={baseInput}
      />
    </FieldWrapper>
  );
}

interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}

export function TextAreaField({ label, value, onChange, placeholder, className, rows = 3 }: TextAreaFieldProps) {
  return (
    <FieldWrapper label={label} className={className}>
      <textarea
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(baseInput, "resize-none")}
      />
    </FieldWrapper>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}

export function SelectField({ label, value, onChange, options, className }: SelectFieldProps) {
  return (
    <FieldWrapper label={label} className={className}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={cn(baseInput, "cursor-pointer")}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}
