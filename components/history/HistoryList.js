import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { describeLog, formatLogValue } from "@/lib/utils/auditLog";
import { formatDate, formatTime, toGymDate, today, addDays } from "@/lib/utils/dates";
import { getInitials } from "@/lib/utils/format";
import styles from "./HistoryList.module.css";

/** "Today", "Yesterday", or the date - the heading above each day's entries. */
function dayLabel(gymDate, referenceDate) {
  if (gymDate === referenceDate) return "Today";
  if (gymDate === addDays(referenceDate, -1)) return "Yesterday";
  return formatDate(gymDate);
}

/**
 * The log entries, grouped under one heading per day.
 *
 * A Server Component: each entry is turned into words by describeLog, the
 * same module that shaped the details when the change was made.
 */
export default function HistoryList({ logs }) {
  const referenceDate = today();

  const days = [];
  for (const log of logs) {
    const gymDate = toGymDate(log.created_at);
    const last = days.at(-1);
    if (last?.date === gymDate) {
      last.logs.push(log);
    } else {
      days.push({ date: gymDate, logs: [log] });
    }
  }

  return (
    <div className={styles.list}>
      {days.map((day) => (
        <section key={day.date} className={styles.day}>
          <h2 className={styles.dayLabel}>{dayLabel(day.date, referenceDate)}</h2>

          <ol className={styles.entries}>
            {day.logs.map((log) => {
              const entry = describeLog(log);
              const [first = "", last = ""] = log.admin_name.split(" ");

              return (
                <li key={log.id} className={styles.entry}>
                  <span className={styles.avatar} aria-hidden="true">
                    {getInitials(first, last)}
                  </span>

                  <div className={styles.body}>
                    <div className={styles.headline}>
                      <p className={styles.title}>
                        <strong>{log.admin_name}</strong> · {entry.title}
                      </p>
                      <time className={styles.time} dateTime={new Date(log.created_at).toISOString()}>
                        {formatTime(log.created_at)}
                      </time>
                    </div>

                    <div className={styles.meta}>
                      <Badge variant={entry.badge.variant}>{entry.badge.label}</Badge>
                      {entry.href && (
                        <Link href={entry.href} className={styles.link}>
                          {log.entity_type === "plan" ? "View plans" : "View member"}
                        </Link>
                      )}
                    </div>

                    {entry.lines.length > 0 && (
                      <ul className={styles.lines}>
                        {entry.lines.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    )}

                    {entry.changes.length > 0 && (
                      <dl className={styles.changes}>
                        {entry.changes.map((change) => (
                          <div key={change.field} className={styles.change}>
                            <dt>{change.label}</dt>
                            <dd>
                              <span className={styles.from}>{formatLogValue(change.from, change.field)}</span>
                              <span className={styles.changeArrow} aria-label="changed to">→</span>
                              <span className={styles.to}>{formatLogValue(change.to, change.field)}</span>
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
