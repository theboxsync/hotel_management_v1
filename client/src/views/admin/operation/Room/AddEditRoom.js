import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Button, Form, Spinner, Badge, ButtonGroup } from 'react-bootstrap';
import { useHistory, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import HtmlHead from 'components/html-head/HtmlHead';
import BreadcrumbList from 'components/breadcrumb-list/BreadcrumbList';
import CsLineIcons from 'cs-line-icons/CsLineIcons';
import { roomCategoryAPI, roomAPI } from 'services/api';
import AmenityPicker from 'components/amenities/AmenityPicker';
import { normalizeAmenities } from 'constants/amenities';

const API_URL = process.env.REACT_APP_API || 'http://localhost:5000/api';

const S = {
    label: { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4, display: 'block' },
    sectionCard: { borderRadius: 16, border: '1.5px solid var(--separator)', marginBottom: 20, overflow: 'hidden' },
    sectionHeader: (accent) => ({ padding: '14px 20px', borderBottom: `3px solid ${accent}`, background: `${accent}0d`, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, color: accent }),
    sectionBody: { padding: 20 },
    areaCard: { borderRadius: 14, border: '1.5px solid var(--separator)', marginBottom: 16, overflow: 'hidden', background: 'var(--foreground)' },
    areaHeader: { padding: '10px 16px', background: 'var(--background)', borderBottom: '1px solid var(--separator)', display: 'flex', alignItems: 'center', gap: 8 },
    thumbWrap: { position: 'relative', borderRadius: 10, overflow: 'hidden', aspectRatio: '4/3', background: 'var(--separator)', cursor: 'pointer' },
    thumbImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
    thumbOverlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity .15s' },
    dropZone: (dragging) => ({ borderRadius: 12, border: `2px dashed ${dragging ? 'var(--primary)' : 'var(--separator)'}`, background: dragging ? 'rgba(var(--primary-rgb),.04)' : 'var(--background)', padding: '20px', textAlign: 'center', cursor: 'pointer', transition: 'all .2s' }),
};

const emptyArea = () => ({ name: '', description: '', existingImages: [], newFiles: [], previewUrls: [] });

const ImageThumb = ({ src, onRemove }) => {
    const [hovered, setHovered] = useState(false);
    return (
        <div style={S.thumbWrap} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
            <img src={src} alt="" style={S.thumbImg} />
            <div style={{ ...S.thumbOverlay, opacity: hovered ? 1 : 0 }}>
                <button type="button" onClick={onRemove} style={{ background: '#dc3545', border: 'none', borderRadius: '50%', width: 32, height: 32, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CsLineIcons icon="bin" size="14" /></button>
            </div>
        </div>
    );
};

const AreaLayoutCard = ({ area, index, total, onChange, onRemove, onMoveUp, onMoveDown, getImageUrl }) => {
    const fileInputRef = useRef(null);
    const [dragging, setDragging] = useState(false);
    const totalImages = area.existingImages.length + area.newFiles.length;

    const handleFiles = (files) => {
        const arr = Array.from(files);
        const valid = arr.filter(f => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024);
        if (arr.length - valid.length > 0) toast.warning(`${arr.length - valid.length} file(s) exceed 5MB and were skipped`);
        const remaining = 10 - totalImages;
        const toAdd = valid.slice(0, remaining);
        if (valid.length > remaining) toast.warning(`Only ${remaining} more image(s) allowed per area`);
        onChange(index, { newFiles: [...area.newFiles, ...toAdd], previewUrls: [...area.previewUrls, ...toAdd.map(f => URL.createObjectURL(f))] });
    };

    const removeExisting = (i) => { const u = [...area.existingImages]; u.splice(i, 1); onChange(index, { existingImages: u }); };
    
    const removeNew = (i) => {
        URL.revokeObjectURL(area.previewUrls[i]);

        const f = [...area.newFiles];
        const p = [...area.previewUrls];

        f.splice(i, 1);
        p.splice(i, 1);

        onChange(index, { newFiles: f, previewUrls: p });
    };

    return (
        <div style={S.areaCard}>
            <div style={S.areaHeader}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(var(--primary-rgb),.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{index + 1}</div>
                <span style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>{area.name || `Area ${index + 1}`}</span>
                <Badge bg="light" text="dark" style={{ fontSize: 10, marginRight: 4 }}>{totalImages} photo{totalImages !== 1 ? 's' : ''}</Badge>
                <div style={{ display: 'flex', gap: 4 }}>
                    {[['chevron-up', () => onMoveUp(index), index === 0], ['chevron-down', () => onMoveDown(index), index === total - 1]].map(([icon, fn, dis]) => (
                        <button key={icon} type="button" disabled={dis} onClick={fn} style={{ background: 'none', border: '1px solid var(--separator)', borderRadius: 6, width: 26, height: 26, cursor: dis ? 'not-allowed' : 'pointer', opacity: dis ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CsLineIcons icon={icon} size="12" /></button>
                    ))}
                    <button type="button" onClick={() => onRemove(index)} style={{ background: 'none', border: '1px solid #dc354540', borderRadius: 6, width: 26, height: 26, cursor: 'pointer', color: '#dc3545', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CsLineIcons icon="bin" size="12" /></button>
                </div>
            </div>
            <div style={{ padding: '14px 16px' }}>
                <Row className="g-3 mb-3">
                    <Col xs={12} sm={6}><label style={S.label}>Area Name <span style={{ color: '#dc3545' }}>*</span></label><Form.Control type="text" value={area.name} onChange={e => onChange(index, { name: e.target.value })} placeholder="e.g., Living Room, Pool" required style={{ borderRadius: 10 }} /></Col>
                    <Col xs={12} sm={6}><label style={S.label}>Description</label><Form.Control type="text" value={area.description} onChange={e => onChange(index, { description: e.target.value })} placeholder="Short note" style={{ borderRadius: 10 }} /></Col>
                </Row>
                {totalImages > 0 && (
                    <Row className="g-2 mb-3">
                        {area.existingImages.map((img, i) => (<Col xs={6} sm={4} md={3} key={`ex-${i}`}><ImageThumb src={getImageUrl(img)} onRemove={() => removeExisting(i)} /></Col>))}
                        {area.previewUrls.map((url, i) => (<Col xs={6} sm={4} md={3} key={`nw-${i}`}><div style={{ position: 'relative' }}><ImageThumb src={url} onRemove={() => removeNew(i)} /><span style={{ position: 'absolute', top: 6, left: 6, fontSize: 9, fontWeight: 800, background: '#28a745', color: '#fff', borderRadius: 4, padding: '2px 5px' }}>NEW</span></div></Col>))}
                    </Row>
                )}
                {totalImages < 10 ? (
                    <div style={S.dropZone(dragging)} onClick={() => fileInputRef.current?.click()} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}>
                        <CsLineIcons icon="upload" size="20" style={{ color: 'var(--primary)', display: 'block', margin: '0 auto 8px' }} />
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>{dragging ? 'Drop photos here' : 'Click or drag photos to upload'}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Up to {10 - totalImages} more · Max 5MB · JPG, PNG, WEBP</div>
                        <input ref={fileInputRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
                    </div>
                ) : <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '8px 0' }}>Maximum 10 photos reached</div>}
            </div>
        </div>
    );
};

const AddEditRoom = () => {
    const history = useHistory();
    const { id } = useParams();
    const isEdit = !!id;
    const cur = process.env.REACT_APP_CURRENCY;

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [categories, setCategories] = useState([]);
    const [creationMode, setCreationMode] = useState('single');
    const [areaLayouts, setAreaLayouts] = useState([]);

    const [form, setForm] = useState({
        room_number: '', category_id: '', floor: '', current_price: '', status: 'available', notes: '',
        amenities: [],  // room-specific amenities
    });

    const [bulk, setBulk] = useState({ category_id: '', start_room_number: '', end_room_number: '', floor: '' });

    const title = isEdit ? 'Edit Room' : 'Add Room';
    const breadcrumbs = [{ to: '/operations', text: 'Operations' }, { to: '/operations/rooms', text: 'Manage Rooms' }, { to: '', text: isEdit ? 'Edit' : 'Add' }];
    const statusOpts = [{ value: 'available', label: 'Available' }, { value: 'occupied', label: 'Occupied' }, { value: 'maintenance', label: 'Maintenance' }, { value: 'out_of_order', label: 'Out of Order' }];

    useEffect(() => {
        roomCategoryAPI.getAll().then(r => setCategories(r.data.data || [])).catch(() => toast.error('Failed to fetch categories'));
        if (isEdit) {
            setLoading(true);
            roomAPI.getOne(id)
                .then(r => {
                    const room = r.data.data;
                    setForm({ room_number: room.room_number, category_id: room.category_id, floor: room.floor ?? '', current_price: room.current_price ?? '', status: room.status, notes: room.notes || '', amenities: normalizeAmenities(room.amenities) });
                    setAreaLayouts((room.area_layouts || []).map(a => ({ name: a.name || '', description: a.description || '', existingImages: a.images || [], newFiles: [], previewUrls: [] })));
                })
                .catch(() => { toast.error('Failed to fetch room'); history.push('/operations/rooms'); })
                .finally(() => setLoading(false));
        }
    }, [id]);

    useEffect(() => () => { areaLayouts.forEach(a => a.previewUrls.forEach(u => URL.revokeObjectURL(u))); }, []);

    const getImageUrl = (path) => { if (!path) return null; if (path.startsWith('http')) return path; return `${API_URL.replace('/api', '')}${path}`; };
    const selectedCat = categories.find(c => c._id === (creationMode === 'single' ? form.category_id : bulk.category_id));
    const bulkPreview = bulk.start_room_number && bulk.end_room_number ? Number(bulk.end_room_number) - Number(bulk.start_room_number) + 1 : 0;

    const handleAddArea = () => setAreaLayouts(p => [...p, emptyArea()]);
    const handleAreaChange = (i, patch) => setAreaLayouts(p => p.map((a, idx) => idx === i ? { ...a, ...patch } : a));
    const handleRemoveArea = (i) => { areaLayouts[i].previewUrls.forEach(u => URL.revokeObjectURL(u)); setAreaLayouts(p => p.filter((_, idx) => idx !== i)); };
    const handleMoveUp = (i) => { if (i === 0) return; setAreaLayouts(p => { const a = [...p];[a[i - 1], a[i]] = [a[i], a[i - 1]]; return a; }); };
    const handleMoveDown = (i) => { if (i === areaLayouts.length - 1) return; setAreaLayouts(p => { const a = [...p];[a[i], a[i + 1]] = [a[i + 1], a[i]]; return a; }); };

    const handleSingleSubmit = async (e) => {
        e.preventDefault();
        if (areaLayouts.find(a => !a.name.trim())) { toast.error('Please fill in all area names'); return; }
        setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append('room_number', form.room_number); fd.append('category_id', form.category_id);
            fd.append('floor', form.floor); fd.append('status', form.status);
            if (form.notes) fd.append('notes', form.notes);
            if (form.current_price) fd.append('current_price', form.current_price);
            // Room-specific amenities
            form.amenities.forEach(a => fd.append('amenities[]', a));
            fd.append('area_layouts', JSON.stringify(areaLayouts.map(a => ({ name: a.name, description: a.description, existingImages: a.existingImages }))));
            areaLayouts.forEach((a, i) => a.newFiles.forEach(f => fd.append(`images_area_${i}`, f)));
            if (isEdit) { await roomAPI.update(id, fd); toast.success('Room updated'); }
            else { await roomAPI.create(fd); toast.success('Room created'); }
            history.push('/operations/rooms');
        } catch (err) { toast.error(err.response?.data?.message || 'Operation failed'); }
        finally { setSubmitting(false); }
    };

    const handleBulkSubmit = async (e) => {
        e.preventDefault(); setSubmitting(true);
        try {
            const res = await roomAPI.bulkCreate({ category_id: bulk.category_id, start_room_number: parseInt(bulk.start_room_number, 10), end_room_number: parseInt(bulk.end_room_number, 10), floor: parseInt(bulk.floor, 10) });
            toast.success(res.data.message || 'Rooms created'); history.push('/operations/rooms');
        } catch (err) { toast.error(err.response?.data?.message || 'Bulk creation failed'); }
        finally { setSubmitting(false); }
    };

    const handleCancel = () => { areaLayouts.forEach(a => a.previewUrls.forEach(u => URL.revokeObjectURL(u))); history.push('/operations/rooms'); };

    if (loading) return <><HtmlHead title={title} /><div className="d-flex justify-content-center align-items-center" style={{ minHeight: 400 }}><Spinner animation="border" variant="primary" /></div></>;

    return (
        <div className="workstation-container pb-5">
            <div className="container-fluid ps-lg-4 pe-lg-5">
                <HtmlHead title={title} description={isEdit ? 'Update room details' : 'Create new room(s)'} />
                
                <div className="page-title-container mb-4 mt-2 mt-lg-0">
                    <Row className="align-items-center">
                        <Col xs="12" md="7">
                            <h1 className="mb-0 pb-0 display-4 fw-bold" style={{ color: '#23b3f4' }}>{title}</h1>
                            <BreadcrumbList items={breadcrumbs} />
                        </Col>
                        <Col xs="12" md="5" className="d-flex justify-content-md-end gap-2 mt-3 mt-md-0">
                            <Button onClick={handleCancel} className="btn-capsule btn-capsule-sm d-flex align-items-center gap-2">
                                <CsLineIcons icon="arrow-left" size="15" />
                                Back to Rooms
                            </Button>
                        </Col>
                    </Row>
                </div>
                
                <Row><Col xl={9} lg={11} className="mx-auto">

                    {/* Mode toggle */}
                    {!isEdit && (
                        <div style={S.sectionCard}>
                            <div style={S.sectionBody}>
                                <span style={S.label}>Creation Mode</span>
                                <ButtonGroup className="mt-1">
                                    <Button variant={creationMode === 'single' ? 'primary' : 'outline-primary'} className="btn-capsule btn-capsule-sm" style={{ borderRadius: '50px 0 0 50px !important' }} onClick={() => setCreationMode('single')}>Single Room</Button>
                                    <Button variant={creationMode === 'bulk' ? 'primary' : 'outline-primary'} className="btn-capsule btn-capsule-sm" style={{ borderRadius: '0 50px 50px 0 !important' }} onClick={() => setCreationMode('bulk')}>Multiple Rooms</Button>
                                </ButtonGroup>
                                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{creationMode === 'single' ? 'Create a single room with custom details, pricing, amenities, and area photo layout' : 'Create multiple rooms at once with sequential room numbers'}</div>
                            </div>
                        </div>
                    )}

                    {/* ══ SINGLE FORM ══ */}
                    {(isEdit || creationMode === 'single') && (
                        <Form onSubmit={handleSingleSubmit}>

                            {/* Room Details */}
                            <div style={S.sectionCard}>
                                <div style={S.sectionHeader('var(--primary)')}><CsLineIcons icon="bed" size="16" />Room Details</div>
                                <div style={S.sectionBody}>
                                    <Row className="g-3">
                                        <Col xs={12}>
                                            <Form.Label style={S.label}>Category <span className="text-danger">*</span></Form.Label>
                                            <Form.Select name="category_id" value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))} required className="modern-input">
                                                <option value="">Select Category</option>
                                                {categories.map(c => <option key={c._id} value={c._id}>{c.category_name} — {cur}{c.base_price}/night</option>)}
                                            </Form.Select>
                                            {selectedCat && (
                                                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                                    <span>Max occupancy: <strong>{selectedCat.max_occupancy}</strong></span>
                                                    <span>Base price: <strong>{cur}{selectedCat.base_price}</strong></span>
                                                    {selectedCat.is_extra_bed_allowed && <span style={{ color: 'var(--primary)', fontWeight: 600 }}>✓ Extra bed allowed</span>}
                                                    {selectedCat.amenities?.length > 0 && <span style={{ color: '#28a745', fontWeight: 600 }}>{selectedCat.amenities.length} category amenities included</span>}
                                                </div>
                                            )}
                                        </Col>
                                        <Col xs={12} sm={6}><Form.Label style={S.label}>Room Number <span className="text-danger">*</span></Form.Label><Form.Control type="text" name="room_number" value={form.room_number} onChange={e => setForm(p => ({ ...p, room_number: e.target.value }))} required placeholder="e.g., 101, A-201" className="modern-input" /></Col>
                                        <Col xs={12} sm={6}><Form.Label style={S.label}>Floor <span className="text-danger">*</span></Form.Label><Form.Control type="number" name="floor" value={form.floor} onChange={e => setForm(p => ({ ...p, floor: e.target.value }))} required min="0" placeholder="1" className="modern-input" /></Col>
                                        <Col xs={12} sm={6}>
                                            <Form.Label style={S.label}>Custom Price per Night</Form.Label>
                                            <Form.Control type="number" name="current_price" value={form.current_price} onChange={e => setForm(p => ({ ...p, current_price: e.target.value }))} min="0" step="0.01" placeholder={selectedCat ? `Default: ${cur}${selectedCat.base_price}` : 'Leave empty for category price'} className="modern-input" />
                                            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Optional — overrides the category base price for this room only</div>
                                        </Col>
                                        <Col xs={12} sm={6}>
                                            <Form.Label style={S.label}>Status</Form.Label>
                                            <Form.Select name="status" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="modern-input">
                                                {statusOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                            </Form.Select>
                                        </Col>
                                        <Col xs={12}><Form.Label style={S.label}>Notes</Form.Label><Form.Control as="textarea" rows={2} name="notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any special notes…" className="modern-input" /></Col>
                                    </Row>
                                </div>
                            </div>

                            {/* Room-specific Amenities */}
                            <div style={S.sectionCard}>
                                <div style={S.sectionHeader('#28a745')}>
                                    <CsLineIcons icon="star" size="16" />Room-Specific Amenities
                                    {form.amenities.length > 0 && <span style={{ fontSize: 11, fontWeight: 600, background: '#28a74520', color: '#28a745', borderRadius: 20, padding: '2px 8px', marginLeft: 4 }}>{form.amenities.length} added</span>}
                                </div>
                                <div style={S.sectionBody}>
                                    {selectedCat?.amenities?.length > 0 && (
                                        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: 'var(--background)', border: '1px solid var(--separator)' }}>
                                            <CsLineIcons icon="info" size="12" className="me-1" />
                                            This room already inherits <strong>{selectedCat.amenities.length} amenities</strong> from its category. Add only room-specific extras here.
                                        </div>
                                    )}
                                    <AmenityPicker selected={form.amenities} onChange={arr => setForm(p => ({ ...p, amenities: arr }))} label="Room-Only Amenities" />
                                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>Amenities unique to this room (e.g., specific view, in-room features not shared by the whole category).</div>
                                </div>
                            </div>

                            {/* Area Photo Layout */}
                            <div style={S.sectionCard}>
                                <div style={{ ...S.sectionHeader('#6f42c1'), justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CsLineIcons icon="image" size="16" />Property Layout<Badge bg="light" text="dark" style={{ fontSize: 10, fontWeight: 700 }}>{areaLayouts.length} area{areaLayouts.length !== 1 ? 's' : ''}</Badge></div>
                                    <Button variant="outline-primary" size="sm" type="button" onClick={handleAddArea} className="d-inline-flex align-items-center gap-1 btn-capsule btn-capsule-sm" style={{ fontSize: 12, fontWeight: 700 }}><CsLineIcons icon="plus" size="13" />Add Area</Button>
                                </div>
                                <div style={S.sectionBody}>
                                    {areaLayouts.length === 0 ? (
                                        <div style={{ borderRadius: 14, border: '2px dashed var(--separator)', padding: '36px 24px', textAlign: 'center', cursor: 'pointer', color: 'var(--muted)' }} onClick={handleAddArea}>
                                            <CsLineIcons icon="image" size="28" style={{ display: 'block', margin: '0 auto 12px', opacity: 0.4 }} />
                                            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>No areas yet</div>
                                            <div style={{ fontSize: 13 }}>Click <strong>Add Area</strong> to create named sections like "Living Room", "Pool", "Back Garden".</div>
                                            <Button variant="primary" size="sm" type="button" onClick={handleAddArea} className="mt-3 btn-capsule btn-capsule-sm">+ Add First Area</Button>
                                        </div>
                                    ) : (
                                        <>
                                            {areaLayouts.map((area, i) => (<AreaLayoutCard key={i} area={area} index={i} total={areaLayouts.length} onChange={handleAreaChange} onRemove={handleRemoveArea} onMoveUp={handleMoveUp} onMoveDown={handleMoveDown} getImageUrl={getImageUrl} />))}
                                            <Button variant="outline-primary" size="sm" type="button" onClick={handleAddArea} className="d-inline-flex align-items-center gap-2 mt-1 btn-capsule btn-capsule-sm" style={{ fontWeight: 600 }}><CsLineIcons icon="plus" size="13" />Add Another Area</Button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={S.sectionCard}>
                                <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                                    <Button variant="outline-secondary" className="btn-capsule btn-capsule-sm" type="button" onClick={handleCancel} disabled={submitting}>Cancel</Button>
                                    <Button variant="primary" className="btn-capsule btn-capsule-sm d-inline-flex align-items-center gap-2" type="submit" disabled={submitting} style={{ minWidth: 140 }}>
                                        {submitting ? <><Spinner as="span" animation="border" size="sm" />{isEdit ? 'Updating…' : 'Creating…'}</> : <><CsLineIcons icon="save" size="14" />{isEdit ? 'Update Room' : 'Create Room'}</>}
                                    </Button>
                                </div>
                            </div>
                        </Form>
                    )}

                    {/* ══ BULK FORM ══ */}
                    {!isEdit && creationMode === 'bulk' && (
                        <Form onSubmit={handleBulkSubmit}>
                            <div style={S.sectionCard}>
                                <div style={S.sectionHeader('var(--primary)')}><CsLineIcons icon="layers" size="16" />Bulk Room Creation</div>
                                <div style={S.sectionBody}>
                                    <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, borderRadius: 10, background: 'var(--background)', border: '1px solid var(--separator)', padding: '10px 14px' }}><CsLineIcons icon="info" size="12" className="me-1" />All rooms will share the same category, floor, and base price. Edit individual rooms to add room-specific amenities.</div>
                                    <Row className="g-3">
                                        <Col xs={12}>
                                            <Form.Label style={S.label}>Category <span className="text-danger">*</span></Form.Label>
                                            <Form.Select name="category_id" value={bulk.category_id} onChange={e => setBulk(p => ({ ...p, category_id: e.target.value }))} required className="modern-input">
                                                <option value="">Select Category</option>
                                                {categories.map(c => <option key={c._id} value={c._id}>{c.category_name} — {cur}{c.base_price}/night</option>)}
                                            </Form.Select>
                                        </Col>
                                        <Col xs={12} sm={4}><Form.Label style={S.label}>Start Room # <span className="text-danger">*</span></Form.Label><Form.Control type="number" value={bulk.start_room_number} onChange={e => setBulk(p => ({ ...p, start_room_number: e.target.value }))} required min="1" placeholder="101" className="modern-input" /></Col>
                                        <Col xs={12} sm={4}><Form.Label style={S.label}>End Room # <span className="text-danger">*</span></Form.Label><Form.Control type="number" value={bulk.end_room_number} onChange={e => setBulk(p => ({ ...p, end_room_number: e.target.value }))} required min="1" placeholder="110" className="modern-input" /></Col>
                                        <Col xs={12} sm={4}><Form.Label style={S.label}>Floor <span className="text-danger">*</span></Form.Label><Form.Control type="number" value={bulk.floor} onChange={e => setBulk(p => ({ ...p, floor: e.target.value }))} required min="0" placeholder="1" className="modern-input" /></Col>
                                        {bulkPreview > 0 && bulk.category_id && (
                                            <Col xs={12}>
                                                <div style={{ borderRadius: 12, border: '1.5px solid #28a74540', background: 'rgba(40,167,69,.04)', padding: '14px 18px' }}>
                                                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#28a745' }}><CsLineIcons icon="check-circle" size="14" className="me-1" />Preview</div>
                                                    {[['Rooms to create', bulkPreview], ['Room numbers', `${bulk.start_room_number} → ${bulk.end_room_number}`], ['Floor', bulk.floor], selectedCat && ['Category', selectedCat.category_name], selectedCat && ['Price/room', `${cur}${selectedCat.base_price}/night`]].filter(Boolean).map(([l, v]) => (
                                                        <div key={l} style={{ display: 'flex', gap: 8, fontSize: 13, marginBottom: 4 }}><span style={{ color: 'var(--muted)', minWidth: 120 }}>{l}:</span><strong>{v}</strong></div>
                                                    ))}
                                                </div>
                                            </Col>
                                        )}
                                    </Row>
                                </div>
                            </div>
                            <div style={S.sectionCard}>
                                <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                                    <Button variant="outline-secondary" className="btn-capsule btn-capsule-sm" type="button" onClick={handleCancel} disabled={submitting}>Cancel</Button>
                                    <Button variant="primary" className="btn-capsule btn-capsule-sm d-inline-flex align-items-center gap-2" type="submit" disabled={submitting}>
                                        {submitting ? <><Spinner as="span" animation="border" size="sm" />Creating…</> : <><CsLineIcons icon="layers" size="14" />Create {bulkPreview > 0 ? `${bulkPreview} ` : ''}Rooms</>}
                                    </Button>
                                </div>
                            </div>
                        </Form>
                    )}

                </Col></Row>
            </div>
        </div>
    );
};
export default AddEditRoom;