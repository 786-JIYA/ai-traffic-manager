import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

import { NAV_ITEMS } from "./navigation";

const CommandPalette = ({ open, onClose }) => {
    const navigate = useNavigate();
    const inputRef = useRef(null);
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);

    const results = useMemo(() => {
        const text = query.trim().toLowerCase();
        if (!text) return NAV_ITEMS;

        return NAV_ITEMS.filter((item) =>
            `${item.name} ${item.hint}`.toLowerCase().includes(text)
        );
    }, [query]);

    useEffect(() => {
        if (open) {
            setQuery("");
            setActive(0);
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [open]);

    useEffect(() => {
        setActive(0);
    }, [query]);

    const go = (item) => {
        if (!item) return;
        navigate(item.path);
        onClose();
    };

    const onKeyDown = (event) => {
        if (event.key === "Escape") {
            onClose();
        } else if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((value) => Math.min(results.length - 1, value + 1));
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((value) => Math.max(0, value - 1));
        } else if (event.key === "Enter") {
            event.preventDefault();
            go(results[active]);
        }
    };

    if (!open) return null;

    return (
        <div className="palette-backdrop" onMouseDown={onClose}>
            <div
                className="palette"
                role="dialog"
                aria-modal="true"
                aria-label="Go to page"
                onMouseDown={(event) => event.stopPropagation()}
                onKeyDown={onKeyDown}
            >
                <div className="palette-input">
                    <Search size={18} />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search pages"
                        aria-label="Search pages"
                    />
                    <kbd>Esc</kbd>
                </div>

                <ul className="palette-list">
                    {results.length === 0 && (
                        <li className="palette-empty">No page matches “{query}”.</li>
                    )}

                    {results.map((item, index) => {
                        const Icon = item.icon;

                        return (
                            <li key={item.path}>
                                <button
                                    type="button"
                                    className={index === active ? "active" : ""}
                                    onMouseEnter={() => setActive(index)}
                                    onClick={() => go(item)}
                                >
                                    <Icon size={19} />
                                    <span>
                                        <strong>{item.name}</strong>
                                        <small>{item.hint}</small>
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
};

export default CommandPalette;
