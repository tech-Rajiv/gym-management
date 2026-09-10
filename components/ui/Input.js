import styles from "./Field.module.css";

/**
 * A labelled text input.
 *
 * The error message is tied to the input with `aria-describedby` and the field
 * is marked `aria-invalid`, so a screen reader announces the problem rather
 * than leaving it as red text only a sighted user would notice.
 */
export default function Input({
  id,
  label,
  error,
  hint,
  required = false,
  multiline = false,
  className = "",
  ...props
}) {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const Control = multiline ? "textarea" : "input";

  return (
    <div className={`${styles.field} ${className}`}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <Control
        id={id}
        name={props.name ?? id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
        className={[
          styles.control,
          multiline ? styles.textarea : "",
          error ? styles.invalid : "",
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />
      {hint && !error && (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className={styles.error}>
          {error}
        </span>
      )}
    </div>
  );
}
