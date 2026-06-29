/**
 * RoomDetailModal — shared component
 *
 * Props:
 *   room            {object}   — room object (must have: _id, room_number, floor, status,
 *                                current_price, category_name, area_layouts)
 *   onHide          {fn}       — called to close the modal
 *   onEdit          {fn|null}  — called with room._id when Edit button is clicked.
 *                                Pass null to hide the Edit button (e.g. in NewBooking read-only view)
 *   onStatusChange  {fn|null}  — called with (roomId, newStatus) from quick-status footer.
 *                                Pass null to hide the status controls (e.g. in NewBooking)
 *   getImageUrl     {fn}       — (path: string) => string — resolves a stored path to a full URL
 *
 * Usage — Rooms management page (full controls):
 *   <RoomDetailModal
 *     room={selectedRoom}
 *     onHide={() => setSelectedRoom(null)}
 *     onEdit={(id) => history.push(`/operations/rooms/edit/${id}`)}
 *     onStatusChange={handleStatusChange}
 *     getImageUrl={getImageUrl}
 *   />
 *
 * Usage — New Booking room card (read-only):
 *   <RoomDetailModal
 *     room={room}
 *     onHide={() => setDetailRoom(null)}
 *     onEdit={null}
 *     onStatusChange={null}
 *     getImageUrl={getImageUrl}
 *   />
 */

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Modal, Row, Col, Badge, Button } from 'react-bootstrap';
import CsLineIcons from 'cs-line-icons/CsLineIcons';
import AmenityDisplay from 'components/amenities/AmenityDisplay';
import { normalizeAmenities } from 'constants/amenities';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/* ─── Default getImageUrl if caller doesn't supply one ───────────────────── */
const defaultGetImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${API_URL.replace('/api', '')}${path}`;
};

/* ─── Status metadata ─────────────────────────────────────────────────────── */
export const statusMeta = {
    available: { color: '#28a745', label: 'Available', icon: 'check-circle', bg: 'success' },
    occupied: { color: 'var(--primary)', label: 'Occupied', icon: 'key', bg: 'primary' },
    maintenance: { color: '#ffc107', label: 'Maintenance', icon: 'tool', bg: 'warning' },
    out_of_order: { color: '#dc3545', label: 'Out of Order', icon: 'x-circle', bg: 'danger' },
};

/* ─── Shared style tokens ─────────────────────────────────────────────────── */
const S = {
    label: {
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--muted)',
        marginBottom: 4,
        display: 'block',
    },
    statusDot: (color) => ({
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: color,
        display: 'inline-block',
        marginRight: 6,
        flexShrink: 0,
    }),
    thumb: {
        borderRadius: 10,
        overflow: 'hidden',
        aspectRatio: '4/3',
        background: 'var(--separator)',
        cursor: 'pointer',
        position: 'relative',
    },
    thumbImg: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
        transition: 'transform .2s',
    },
    areaSection: {
        borderRadius: 12,
        border: '1.5px solid var(--separator)',
        overflow: 'hidden',
        marginBottom: 16,
    },
    areaHeader: {
        padding: '10px 16px',
        background: 'var(--background)',
        borderBottom: '1px solid var(--separator)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
    },
    lightboxOverlay: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.92)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    lightboxImg: {
        maxWidth: '90vw',
        maxHeight: '85vh',
        borderRadius: 12,
        objectFit: 'contain',
        boxShadow: '0 32px 64px rgba(0,0,0,.6)',
    },
};

/* ─── Lightbox ────────────────────────────────────────────────────────────── */
const Lightbox = ({ images, startIndex, onClose }) => {
    const [current, setCurrent] = useState(startIndex);

    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') setCurrent(c => Math.min(c + 1, images.length - 1));
            if (e.key === 'ArrowLeft') setCurrent(c => Math.max(c - 1, 0));
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [images.length, onClose]);

    return ReactDOM.createPortal(
        <div style={S.lightboxOverlay} onClick={onClose}>
            {current > 0 && (
                <button type="button" onClick={e => { e.stopPropagation(); setCurrent(c => c - 1); }}
                    style={{ position: 'absolute', left: 20, background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, color: '#fff', cursor: 'pointer', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ‹
                </button>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
                onClick={e => e.stopPropagation()}>
                <img src={images[current]} alt={`Photo ${current + 1}`} style={S.lightboxImg} />
                <div style={{ color: 'rgba(255,255,255,.55)', fontSize: 13, fontWeight: 600 }}>
                    {current + 1} / {images.length}
                </div>
            </div>

            {current < images.length - 1 && (
                <button type="button" onClick={e => { e.stopPropagation(); setCurrent(c => c + 1); }}
                    style={{ position: 'absolute', right: 20, background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, color: '#fff', cursor: 'pointer', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ›
                </button>
            )}

            <button type="button" onClick={onClose}
                style={{ position: 'absolute', top: 16, right: 20, background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CsLineIcons icon="close" size="16" />
            </button>
        </div>,
        document.body
    );
};

/* ─── All-photos horizontal strip ────────────────────────────────────────── */
const AllPhotosStrip = ({ images }) => {
    const [lightbox, setLightbox] = useState(null);
    if (!images.length) return null;
    return (
        <>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--separator)', background: 'var(--background)' }}>
                <div style={{ ...S.label, marginBottom: 10 }}>All Photos — {images.length} total</div>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                    {images.slice(0, 12).map((url, i) => (
                        <div key={i} style={{ flexShrink: 0, width: 100, height: 72, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', position: 'relative' }}
                            onClick={() => setLightbox({ images, index: i })}>
                            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            {i === 11 && images.length > 12 && (
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, borderRadius: 8 }}>
                                    +{images.length - 12}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            {lightbox && <Lightbox images={lightbox.images} startIndex={lightbox.index} onClose={() => setLightbox(null)} />}
        </>
    );
};

/* ─── Per-area image grid ─────────────────────────────────────────────────── */
const AreaImageGrid = ({ images, resolvedUrls }) => {
    const [lightbox, setLightbox] = useState(null);
    const urls = resolvedUrls || images;

    if (!urls || urls.length === 0) return (
        <div style={{ padding: '14px 0', color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
            No photos for this area
        </div>
    );

    const visible = urls.slice(0, 8);

    return (
        <>
            <Row className="g-2">
                {visible.map((url, i) => (
                    <Col xs={6} sm={4} md={3} key={i}>
                        <div style={S.thumb} onClick={() => setLightbox({ images: urls, index: i })}>
                            <img src={url} alt={`Photo ${i + 1}`} style={S.thumbImg}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.04)' }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                            />
                            {i === 7 && urls.length > 8 && (
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16, borderRadius: 10 }}>
                                    +{urls.length - 8}
                                </div>
                            )}
                        </div>
                    </Col>
                ))}
            </Row>
            {lightbox && <Lightbox images={lightbox.images} startIndex={lightbox.index} onClose={() => setLightbox(null)} />}
        </>
    );
};

/* ════════════════════════════════════════════════════════════════════════════
   Main exported component
════════════════════════════════════════════════════════════════════════════ */
const RoomDetailModal = ({
    room,
    onHide,
    onEdit = null,
    onStatusChange = null,
    getImageUrl = defaultGetImageUrl,
}) => {
    const cur = process.env.REACT_APP_CURRENCY;
    const status = statusMeta[room.status] || { color: '#6c757d', label: room.status, icon: 'info', bg: 'secondary' };
    const areas = room.area_layouts || [];

    // Resolve ALL image URLs upfront (no hooks inside loops)
    const allResolvedImages = areas
        .flatMap(a => (a.images || []).map(getImageUrl))
        .filter(Boolean);

    const areaResolvedImages = areas.map(a =>
        (a.images || []).map(getImageUrl).filter(Boolean)
    );

    // Booking-context stats: show nights + estimated total if provided
    const hasBookingContext = !!(room.nights && room.estimatedTotal);

    return (
        <Modal show onHide={onHide} size="xl" scrollable centered>

            {/* ── Header ── */}
            <Modal.Header closeButton style={{ borderBottom: `3px solid ${status.color}`, padding: '16px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${status.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: status.color, flexShrink: 0 }}>
                        <CsLineIcons icon="bed" size="20" />
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 18 }}>Room {room.room_number}</div>
                        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                            {room.category_name} · Floor {room.floor}
                        </div>
                    </div>
                    <Badge bg={status.bg} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, marginLeft: 4 }}>
                        <CsLineIcons icon={status.icon} size="11" className="me-1" />
                        {status.label}
                    </Badge>
                </div>
            </Modal.Header>

            <Modal.Body style={{ padding: 0 }}>

                {/* ── Stats strip ── */}
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${hasBookingContext ? 5 : 4}, 1fr)`, borderBottom: '1px solid var(--separator)' }}>
                    {[
                        { label: 'Price / Night', value: `${cur} ${room.current_price}`, color: 'var(--primary)' },
                        { label: 'Category', value: room.category_name, color: 'var(--body)' },
                        { label: 'Floor', value: `Floor ${room.floor}`, color: 'var(--body)' },
                        { label: 'Area Layouts', value: `${areas.length} area${areas.length !== 1 ? 's' : ''}`, color: '#6f42c1' },
                        // Only shown in booking context
                        ...(hasBookingContext ? [{ label: `Est. Total (${room.nights}n)`, value: `${cur} ${room.estimatedTotal}`, color: '#28a745' }] : []),
                    ].map(({ label, value, color }, i, arr) => (
                        <div key={label} style={{ padding: '14px 18px', borderRight: i < arr.length - 1 ? '1px solid var(--separator)' : 'none' }}>
                            <div style={S.label}>{label}</div>
                            <div style={{ fontWeight: 700, fontSize: 14, color }}>{value}</div>
                        </div>
                    ))}
                </div>

                {/* ── Max occupancy + extra bed info (useful in booking context) ── */}
                {(room.max_occupancy || room.is_extra_bed_allowed !== undefined) && (
                    <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--separator)', background: 'var(--background)', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                        {room.max_occupancy && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                <CsLineIcons icon="user" size="13" style={{ color: 'var(--muted)' }} />
                                <span style={{ color: 'var(--muted)' }}>Max occupancy:</span>
                                <span style={{ fontWeight: 700 }}>{room.max_occupancy} guests</span>
                            </div>
                        )}
                        {room.is_extra_bed_allowed !== undefined && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                <CsLineIcons icon="plus" size="13" style={{ color: room.is_extra_bed_allowed ? 'var(--primary)' : 'var(--muted)' }} />
                                <span style={{ color: 'var(--muted)' }}>Extra bed:</span>
                                <span style={{ fontWeight: 700, color: room.is_extra_bed_allowed ? 'var(--primary)' : 'var(--muted)' }}>
                                    {room.is_extra_bed_allowed ? 'Allowed' : 'Not allowed'}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* ── All photos strip ── */}
                <AllPhotosStrip images={allResolvedImages} />

                {/* ── Area layouts ── */}
                <div style={{ padding: '20px 24px' }}>
                    {areas.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
                            <CsLineIcons icon="image" size="32" style={{ display: 'block', margin: '0 auto 12px', opacity: 0.3 }} />
                            <div style={{ fontWeight: 600, fontSize: 14 }}>No area layouts added yet</div>
                            <div style={{ fontSize: 13, marginTop: 4, color: 'var(--muted)' }}>
                                {onEdit ? 'Edit this room to add named areas with photos' : 'No photos available for this room'}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div style={{ ...S.label, marginBottom: 14, fontSize: 11 }}>
                                Property Layout — {areas.length} area{areas.length !== 1 ? 's' : ''}
                            </div>
                            {areas.map((area, i) => {
                                const imgCount = (area.images || []).length;
                                return (
                                    <div key={i} style={S.areaSection}>
                                        <div style={S.areaHeader}>
                                            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(111,66,193,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6f42c1', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                                                {i + 1}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <span style={{ fontWeight: 700, fontSize: 13 }}>{area.name}</span>
                                                {area.description && (
                                                    <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>— {area.description}</span>
                                                )}
                                            </div>
                                            <Badge bg="light" text="dark" style={{ fontSize: 10 }}>
                                                {imgCount} photo{imgCount !== 1 ? 's' : ''}
                                            </Badge>
                                        </div>
                                        <div style={{ padding: '14px 16px' }}>
                                            <AreaImageGrid
                                                images={area.images}
                                                resolvedUrls={areaResolvedImages[i]}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>
            </Modal.Body>

            {/* ── Footer ── */}
            <Modal.Footer style={{ padding: '12px 24px', borderTop: '1px solid var(--separator)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>

                {/* Quick status buttons — only when onStatusChange is provided */}
                {onStatusChange && (
                    <div style={{ marginRight: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ ...S.label, marginBottom: 0, alignSelf: 'center' }}>Quick status:</span>
                        {Object.entries(statusMeta).map(([key, meta]) => (
                            <button key={key} type="button"
                                onClick={() => { onStatusChange(room._id, key); onHide(); }}
                                disabled={room.status === key}
                                style={{
                                    background: room.status === key ? `${meta.color}18` : 'transparent',
                                    border: `1.5px solid ${room.status === key ? meta.color : 'var(--separator)'}`,
                                    borderRadius: 8,
                                    padding: '4px 10px',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: room.status === key ? meta.color : 'var(--muted)',
                                    cursor: room.status === key ? 'default' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    transition: 'all .15s',
                                }}>
                                <span style={S.statusDot(meta.color)} />
                                {meta.label}
                            </button>
                        ))}
                    </div>
                )}

                <Button variant="outline-secondary" onClick={onHide} style={{ borderRadius: 10 }}>
                    Close
                </Button>

                {/* Edit button — only when onEdit is provided */}
                {onEdit && (
                    <Button variant="primary" onClick={() => { onEdit(room._id); onHide(); }}
                        className="d-inline-flex align-items-center gap-2" style={{ borderRadius: 10, fontWeight: 700 }}>
                        <CsLineIcons icon="edit" size="14" />
                        Edit Room
                    </Button>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default RoomDetailModal;