"use client";

import Modal from "./Modal";
import Button from "./Button";
import styles from "./SuccessDialog.module.css";

/**
 * Confirms that something was saved, shows what was saved, and lets the admin
 * choose where to go next - rather than moving them on automatically.
 *
 * It cannot be dismissed with Escape or the backdrop: the choice of where to
 * go is the way out, so nobody is left on a form that has already been sent.
 *
 * @param {{label: string, value: React.ReactNode}[]} details the saved record
 * @param {{href: string, label: string, variant?: string, icon?: Function}[]} actions
 */
export default function SuccessDialog({ title, subtitle, details, actions }) {
  return (
    <Modal open dismissible={false} title="" footer={null}>
      <div className={styles.body}>
        <span className={styles.tick} aria-hidden="true">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        <h2 className={styles.title}>{title}</h2>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}

        <dl className={styles.details}>
          {details
            .filter((detail) => detail.value !== null && detail.value !== undefined && detail.value !== "")
            .map((detail) => (
              <div key={detail.label} className={styles.detail}>
                <dt>{detail.label}</dt>
                <dd>{detail.value}</dd>
              </div>
            ))}
        </dl>

        <div className={styles.actions}>
          {actions.map(({ href, label, variant = "secondary", icon: ActionIcon }) => (
            <Button key={href} href={href} variant={variant} fullWidth>
              {ActionIcon && <ActionIcon size={16} />}
              {label}
            </Button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
