import styles from "./Field.module.css";

/**
 * A labelled dropdown.
 *
 * @param {{value: string|number, label: string}[]} options
 * @param {string} placeholder shown as a disabled first option when there is
 *                             no value yet, so "nothing chosen" is explicit
 */
export default function Select({
  id,
  label,
  options = [],
  placeholder,
  error,
  required = false,
  className = "",
  ...props
}) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={`${styles.field} ${className}`}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <div className={styles.selectWrapper}>
        <select
          id={id}
          name={props.name ?? id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={[styles.control, styles.select, error ? styles.invalid : ""]
            .filter(Boolean)
            .join(" ")}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          className={styles.chevron}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {error && (
        <span id={errorId} className={styles.error}>
          {error}
        </span>
      )}
    </div>
  );
}
