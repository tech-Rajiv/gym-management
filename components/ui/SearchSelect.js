"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SearchIcon, ChevronDownIcon, CheckIcon } from "./icons";
import fieldStyles from "./Field.module.css";
import styles from "./SearchSelect.module.css";

const PANEL_GAP = 6;
const PANEL_MAX_HEIGHT = 340;

/**
 * The application's dropdown. Every select in the app is this component -
 * directly, or through Select - so they all look and behave the same.
 *
 * Clicking it opens a panel below the field (or above, when there is no room
 * below). Choose with a click or tap, or with the arrow keys and Enter;
 * Escape or a click outside closes it. The chosen value is submitted with the
 * form through a hidden input called `name`.
 *
 * For long lists, `searchable` adds a search box at the top of the panel:
 * typing narrows the options by label, detail or `search` text, every word in
 * any order.
 *
 * The panel is positioned against the window (position: fixed), so a card
 * that clips its contents cannot cut it off.
 *
 * @param {{value: string|number, label: string, detail?: string,
 *          search?: string, group?: string}[]} options
 *        `detail` is a second, smaller line; `search` is extra text to match
 *        that is not shown; options sharing a `group` get a heading
 * @param {string}  [value]        controlled value; leave out to use
 * @param {string}  [defaultValue] ...an uncontrolled one
 * @param {(value: string) => void} [onChange]
 * @param {boolean} [searchable]   show the search box
 * @param {boolean} [clearable]    offer the placeholder as a choice, so an
 *                                 optional field can be emptied again
 * @param {Function} [icon]        an icon component shown inside the field
 */
export default function SearchSelect({
  id,
  name = id,
  label,
  options,
  value: controlledValue,
  defaultValue = "",
  onChange,
  placeholder = "Select…",
  searchable = false,
  searchPlaceholder = "Search…",
  emptyText = "No matches.",
  clearable = false,
  required = false,
  disabled = false,
  icon: FieldIcon,
  error,
  className = "",
}) {
  const [innerValue, setInnerValue] = useState(defaultValue ?? "");
  const value = controlledValue !== undefined ? controlledValue : innerValue;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [panelStyle, setPanelStyle] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();

  const selected = options.find((option) => String(option.value) === String(value)) ?? null;

  // The choices in the panel: a "none" row first for a clearable field, then
  // the options - narrowed by the search, when there is one.
  const choices = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const filtered =
      words.length === 0
        ? options
        : options.filter((option) => {
            const text = `${option.label} ${option.detail ?? ""} ${option.search ?? ""}`.toLowerCase();
            return words.every((word) => text.includes(word));
          });
    return clearable && words.length === 0
      ? [{ value: "", label: placeholder, isClear: true }, ...filtered]
      : filtered;
  }, [options, query, clearable, placeholder]);

  /** Places the panel under the field - or over it, when there is no room. */
  const place = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom - PANEL_GAP - 8;
    const above = rect.top - PANEL_GAP - 8;
    const openUp = below < Math.min(PANEL_MAX_HEIGHT, 220) && above > below;
    setPanelStyle({
      left: rect.left,
      width: rect.width,
      maxHeight: Math.min(PANEL_MAX_HEIGHT, openUp ? above : below),
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + PANEL_GAP }
        : { top: rect.bottom + PANEL_GAP }),
    });
  }, []);

  const openPanel = () => {
    if (disabled) return;
    setQuery("");
    const index = choices.findIndex((option) => String(option.value) === String(value));
    setHighlight(Math.max(index, 0));
    place();
    setOpen(true);
  };

  const close = () => setOpen(false);

  const choose = (option) => {
    const next = String(option.value);
    if (controlledValue === undefined) setInnerValue(next);
    onChange?.(next);
    close();
    triggerRef.current?.focus();
  };

  // Focus the search box (or the list) when the panel opens; close on a click
  // outside; follow the field if the page scrolls or the window resizes - as
  // it does when a phone's keyboard opens for the search box.
  useLayoutEffect(() => {
    if (!open) return;
    (searchable ? searchRef.current : listRef.current)?.focus({ preventScroll: true });

    const handlePointer = (event) => {
      if (!triggerRef.current?.contains(event.target) && !panelRef.current?.contains(event.target)) {
        close();
      }
    };
    const follow = () => window.requestAnimationFrame(place);
    document.addEventListener("pointerdown", handlePointer);
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, [open, searchable, place]);

  // Keep the highlighted option scrolled into view.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector(`[data-index="${highlight}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((index) => Math.min(index + 1, choices.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" || (!searchable && event.key === " ")) {
      // Choosing must never submit the form behind.
      event.preventDefault();
      if (choices[highlight]) choose(choices[highlight]);
    } else if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape") event.preventDefault();
      close();
      triggerRef.current?.focus();
    }
  };

  /** The closed field opens with the arrow keys too, like a native select. */
  const handleTriggerKeyDown = (event) => {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      openPanel();
    }
  };

  const errorId = error ? `${id}-error` : undefined;
  let lastGroup = null;

  return (
    <div className={`${fieldStyles.field} ${className}`}>
      {label && (
        <label className={fieldStyles.label} htmlFor={id}>
          {label}
          {required && <span className={fieldStyles.required}>*</span>}
        </label>
      )}

      <input type="hidden" name={name} value={value ?? ""} />

      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        className={[
          styles.trigger,
          error ? styles.invalid : "",
          open ? styles.triggerOpen : "",
          selected?.detail ? styles.tall : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => (open ? close() : openPanel())}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
      >
        {FieldIcon && <FieldIcon size={16} className={styles.fieldIcon} />}
        {selected ? (
          <span className={styles.value}>
            <span className={styles.valueLabel}>{selected.label}</span>
            {selected.detail && <span className={styles.valueDetail}>{selected.detail}</span>}
          </span>
        ) : (
          <span className={styles.placeholder}>{placeholder}</span>
        )}
        <ChevronDownIcon size={16} className={styles.chevron} />
      </button>

      {open && panelStyle && (
        <div ref={panelRef} className={styles.panel} style={panelStyle}>
          {searchable && (
            <div className={styles.searchBox}>
              <SearchIcon size={15} />
              <input
                ref={searchRef}
                type="search"
                className={styles.search}
                placeholder={searchPlaceholder}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setHighlight(0);
                }}
                onKeyDown={handleKeyDown}
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-activedescendant={choices[highlight] ? `${listId}-${highlight}` : undefined}
                aria-label={searchPlaceholder}
                autoComplete="off"
              />
            </div>
          )}

          {choices.length === 0 ? (
            <p className={styles.empty}>{emptyText}</p>
          ) : (
            <ul
              className={styles.list}
              id={listId}
              role="listbox"
              ref={listRef}
              tabIndex={searchable ? undefined : -1}
              onKeyDown={searchable ? undefined : handleKeyDown}
              aria-activedescendant={
                !searchable && choices[highlight] ? `${listId}-${highlight}` : undefined
              }
              aria-label={label ?? placeholder}
            >
              {choices.map((option, index) => {
                const isSelected = !option.isClear && String(option.value) === String(value);
                const heading =
                  option.group && option.group !== lastGroup ? (
                    <li key={`group-${option.group}`} className={styles.group} role="presentation">
                      {option.group}
                    </li>
                  ) : null;
                lastGroup = option.group ?? null;
                return [
                  heading,
                  <li
                    key={`option-${option.value}`}
                    id={`${listId}-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={isSelected}
                    className={[
                      styles.option,
                      index === highlight ? styles.highlighted : "",
                      option.isClear ? styles.clear : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onPointerEnter={() => setHighlight(index)}
                    onClick={() => choose(option)}
                  >
                    <span className={styles.optionText}>
                      <span className={styles.optionLabel}>{option.label}</span>
                      {option.detail && <span className={styles.optionDetail}>{option.detail}</span>}
                    </span>
                    {isSelected && <CheckIcon size={16} className={styles.check} />}
                  </li>,
                ];
              })}
            </ul>
          )}

          {searchable && (
            <p className={styles.count}>
              {choices.length} of {options.length}
            </p>
          )}
        </div>
      )}

      {error && (
        <span id={errorId} className={fieldStyles.error}>
          {error}
        </span>
      )}
    </div>
  );
}
