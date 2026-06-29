/**
 * AmenityDisplay — read-only amenity grid with icons
 * Place at: src/components/amenities/AmenityDisplay.jsx
 *
 * Props:
 *   amenities   {string[]}   — array of amenity ids / custom labels to display
 *   title       {string}     — optional section title
 *   compact     {boolean}    — if true, shows as small inline pills (default: false = grid)
 *   maxVisible  {number}     — max to show before "+N more" (default: Infinity)
 *   highlightIds {string[]}  — optional ids to show with stronger highlight (e.g. room-only extras)
 *   highlightLabel {string}  — tooltip/badge label for highlighted items (e.g. "Room only")
 */

import React, { useState } from 'react';
import CsLineIcons from 'cs-line-icons/CsLineIcons';
import { Col, Row } from 'react-bootstrap';
import { getAmenityInfo, normalizeAmenities } from 'constants/amenities';

const AmenityDisplay = ({
    amenities: raw = [],
    title,
    compact = false,
    maxVisible = Infinity,
    highlightIds = [],
    highlightLabel = '',
}) => {
    const [showAll, setShowAll] = useState(false);
    const amenities = normalizeAmenities(raw);

    if (amenities.length === 0) return null;

    const visible = showAll ? amenities : amenities.slice(0, maxVisible);
    const hidden = amenities.length - maxVisible;

    /* Compact mode — horizontal pill row */
    if (compact) {
        return (
            <div>
                {title && <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>{title}</div>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {visible.map(id => {
                        const info = getAmenityInfo(id);
                        const isHighlight = highlightIds.includes(id);
                        const color = isHighlight ? 'var(--primary)' : (info.groupColor || '#6c757d');
                        return (
                            <span key={id} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                borderRadius: 20, padding: '3px 9px', fontSize: 11, fontWeight: 600,
                                background: `${color}12`, border: `1px solid ${color}30`, color,
                            }}
                                title={isHighlight && highlightLabel ? `${info.label} (${highlightLabel})` : info.label}>
                                <CsLineIcons icon={info.icon} size="10" />
                                {info.label}
                                {isHighlight && highlightLabel && (
                                    <span style={{ fontSize: 9, background: color, color: '#fff', borderRadius: 4, padding: '1px 4px', marginLeft: 2 }}>
                                        {highlightLabel}
                                    </span>
                                )}
                            </span>
                        );
                    })}
                    {!showAll && hidden > 0 && (
                        <button type="button" onClick={() => setShowAll(true)}
                            style={{ fontSize: 11, color: 'var(--muted)', background: 'none', border: '1px solid var(--separator)', borderRadius: 20, padding: '2px 8px', cursor: 'pointer' }}>
                            +{hidden} more
                        </button>
                    )}
                </div>
            </div>
        );
    }

    /* Grid mode — 2-3 columns with icon + label */
    return (
        <div>
            {title && (
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
                    {title}
                </div>
            )}
            <Row className="g-2">
                {visible.map(id => {
                    const info = getAmenityInfo(id);
                    const isHighlight = highlightIds.includes(id);
                    const color = isHighlight ? 'var(--primary)' : (info.groupColor || '#6c757d');
                    return (
                        <Col xs={6} sm={4} md={4} key={id}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '8px 12px', borderRadius: 10,
                                border: `1px solid ${isHighlight ? `${color}40` : 'var(--separator)'}`,
                                background: isHighlight ? `${color}08` : 'var(--background)',
                            }}>
                                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color }}>
                                    <CsLineIcons icon={info.icon} size="14" />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--body)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {info.label}
                                    </div>
                                    {isHighlight && highlightLabel && (
                                        <div style={{ fontSize: 10, color, fontWeight: 700 }}>{highlightLabel}</div>
                                    )}
                                </div>
                            </div>
                        </Col>
                    );
                })}
            </Row>
            {!showAll && hidden > 0 && (
                <button type="button" onClick={() => setShowAll(true)}
                    style={{ fontSize: 12, color: 'var(--muted)', background: 'none', border: '1px solid var(--separator)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', marginTop: 8 }}>
                    Show {hidden} more amenities
                </button>
            )}
        </div>
    );
};

export default AmenityDisplay;