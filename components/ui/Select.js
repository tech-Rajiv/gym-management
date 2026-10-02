"use client";

import SearchSelect from "./SearchSelect";

/**
 * A labelled dropdown - the app's custom one (SearchSelect), without a search
 * box. It keeps the interface of a native <select> so forms read the same:
 *
 *   * `onChange` receives an event-like `{ target: { value } }`;
 *   * `value` makes it controlled, `defaultValue` uncontrolled;
 *   * the value is submitted with the form under `name` (default: `id`).
 *
 * An optional field (no `required`) with a placeholder lets the admin pick
 * the placeholder again to clear it.
 *
 * @param {{value: string|number, label: string}[]} options
 */
export default function Select({
  id,
  name,
  label,
  options = [],
  placeholder,
  error,
  required = false,
  disabled = false,
  value,
  defaultValue,
  onChange,
  className = "",
}) {
  return (
    <SearchSelect
      id={id}
      name={name ?? id}
      label={label}
      options={options}
      placeholder={placeholder ?? "Select…"}
      clearable={Boolean(placeholder) && !required}
      required={required}
      disabled={disabled}
      value={value === undefined ? undefined : String(value ?? "")}
      defaultValue={defaultValue === undefined ? undefined : String(defaultValue ?? "")}
      onChange={(next) => onChange?.({ target: { value: next } })}
      error={error}
      className={className}
    />
  );
}
