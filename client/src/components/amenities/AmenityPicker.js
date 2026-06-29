/**
 * AmenityPicker — reusable grouped amenity selector
 * Place at: src/components/amenities/AmenityPicker.jsx
 *
 * Props:
 *   selected    {string[]}   — selected amenity ids / custom labels
 *   onChange    {fn}         — called with new string[] on change
 *   label       {string}     — section heading
 */

import React, { useState, useMemo } from 'react';
import { Form, Row, Col } from 'react-bootstrap';
import CsLineIcons from 'cs-line-icons/CsLineIcons';
import { AMENITY_GROUPS, getAmenityInfo, normalizeAmenities } from 'constants/amenities';

const S = {
    label: {
        fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6, display: 'block',
    },
    groupLabel: (color) => ({
        fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color, marginBottom: 8, marginTop: 4, display: 'block',
    }),
    pill: (sel, color) => ({
        display: 'inline-flex', alignItems: 'center', gap: 5,
        borderRadius: 20, padding: '5px 10px', fontSize: 12, fontWeight: 600,
        cursor: 'pointer', userSelect: 'none', margin: '2px', transition: 'all .15s',
        border: `1.5px solid ${sel ? color : 'var(--separator)'}`,
        background: sel ? `${color}18` : 'transparent',
        color: sel ? color : 'var(--muted)',
    }),
    selectedTag: (color) => ({
        display: 'inline-flex', alignItems: 'center', gap: 4,
        borderRadius: 20, padding: '4px 10px', fontSize: 12, fontWeight: 600, margin: '2px',
        background: `${color}15`, border: `1.5px solid ${color}40`, color,
    }),
    pickerWrap: {
        borderRadius: 12, border: '1.5px solid var(--separator)', overflow: 'hidden',
    },
    pickerHeader: {
        padding: '12px 16px', background: 'var(--background)',
        borderBottom: '1px solid var(--separator)',
    },
    pickerBody: { padding: '12px 16px', maxHeight: 320, overflowY: 'auto' },
};

const AmenityPicker = ({
    selected: rawSelected = [],
    onChange,
    label = 'Amenities',
}) => {
    const selected = useMemo(() => normalizeAmenities(rawSelected), [rawSelected]);
    const [search, setSearch] = useState('');
    const [custom, setCustom] = useState('');
    const [showPicker, setShowPicker] = useState(false);

    const toggle = (id) =>
        onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);

    const addCustom = () => {
        const t = custom.trim();
        if (!t || selected.includes(t)) { setCustom(''); return; }
        onChange([...selected, t]);
        setCustom('');
    };

    const remove = (id) => onChange(selected.filter(s => s !== id));

    const filteredGroups = useMemo(() => {
        if (!search.trim()) return AMENITY_GROUPS;
        const term = search.toLowerCase();
        return AMENITY_GROUPS
            .map(g => ({ ...g, amenities: g.amenities.filter(a => a.label.toLowerCase().includes(term) || a.id.includes(term)) }))
            .filter(g => g.amenities.length > 0);
    }, [search]);

    return (
        <div>
            <span style={S.label}>{label}</span>

            {/* Selected tags */}
            {selected.length > 0 && (
                <div style={{ marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {selected.map(id => {
                        const info = getAmenityInfo(id);
                        return (
                            <span key={id} style={S.selectedTag(info.groupColor || '#6c757d')}>
                                <CsLineIcons icon={info.icon} size="11" />
                                {info.label}
                                <button type="button" onClick={() => remove(id)}
                                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', display: 'flex', alignItems: 'center', marginLeft: 2, opacity: 0.7 }}>
                                    <CsLineIcons icon="close" size="10" />
                                </button>
                            </span>
                        );
                    })}
                    <button type="button" onClick={() => onChange([])}
                        style={{ fontSize: 11, color: 'var(--muted)', background: 'none', border: '1px solid var(--separator)', borderRadius: 20, padding: '3px 8px', cursor: 'pointer', margin: '2px' }}>
                        Clear all
                    </button>
                </div>
            )}

            {/* Toggle picker */}
            <button type="button" onClick={() => setShowPicker(v => !v)}
                style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 10,
                    border: '1.5px solid var(--separator)', padding: '7px 14px', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', transition: 'all .15s', marginBottom: showPicker ? 10 : 0,
                    background: showPicker ? 'rgba(var(--primary-rgb),.06)' : 'var(--background)',
                    color: showPicker ? 'var(--primary)' : 'var(--muted)',
                }}>
                <CsLineIcons icon={showPicker ? 'chevron-up' : 'list'} size="14" />
                {showPicker ? 'Hide amenity list' : `Browse amenities${selected.length > 0 ? ` (${selected.length} selected)` : ''}`}
            </button>

            {showPicker && (
                <div style={S.pickerWrap}>
                    {/* Search + custom input */}
                    <div style={S.pickerHeader}>
                        <Row className="g-2">
                            <Col xs={12} sm={7}>
                                <Form.Control type="text" size="sm" placeholder="Search amenities…"
                                    value={search} onChange={e => setSearch(e.target.value)} style={{ borderRadius: 8 }} />
                            </Col>
                            <Col xs={12} sm={5}>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <Form.Control type="text" size="sm" placeholder="Add custom amenity…"
                                        value={custom} onChange={e => setCustom(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addCustom(); } }}
                                        style={{ borderRadius: 8 }} />
                                    <button type="button" onClick={addCustom} disabled={!custom.trim()}
                                        style={{ flexShrink: 0, borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', padding: '0 12px', cursor: custom.trim() ? 'pointer' : 'not-allowed', opacity: custom.trim() ? 1 : 0.45, fontSize: 16, fontWeight: 700 }}>
                                        +
                                    </button>
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>Press Enter or + to add custom</div>
                            </Col>
                        </Row>
                    </div>

                    {/* Groups */}
                    <div style={S.pickerBody}>
                        {filteredGroups.length === 0
                            ? <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '16px 0' }}>No amenities match "{search}"</div>
                            : filteredGroups.map(group => (
                                <div key={group.group} style={{ marginBottom: 14 }}>
                                    <span style={S.groupLabel(group.color)}>{group.group}</span>
                                    <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                                        {group.amenities.map(a => {
                                            const isSel = selected.includes(a.id);
                                            return (
                                                <span key={a.id} style={S.pill(isSel, group.color)} onClick={() => toggle(a.id)}>
                                                    <CsLineIcons icon={a.icon} size="12" />
                                                    {a.label}
                                                    {isSel && <CsLineIcons icon="check" size="10" style={{ marginLeft: 2 }} />}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </div>
            )}
        </div>
    );
};

export default AmenityPicker;