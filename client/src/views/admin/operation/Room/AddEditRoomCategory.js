import React, { useState, useEffect } from 'react';
import { Row, Col, Button, Form, Badge, Spinner } from 'react-bootstrap';
import { useHistory, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import HtmlHead from 'components/html-head/HtmlHead';
import BreadcrumbList from 'components/breadcrumb-list/BreadcrumbList';
import CsLineIcons from 'cs-line-icons/CsLineIcons';
import { roomCategoryAPI } from 'services/api';
import AmenityPicker from 'components/amenities/AmenityPicker';
import { normalizeAmenities } from 'constants/amenities';

const API_URL = process.env.REACT_APP_API || 'http://localhost:5000/api';

const S = {
    label: { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4, display: 'block' },
    sectionCard: { borderRadius: 16, border: '1.5px solid var(--separator)', marginBottom: 20, overflow: 'hidden' },
    sectionHeader: (accent) => ({ padding: '14px 20px', borderBottom: `3px solid ${accent}`, background: `${accent}0d`, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, color: accent }),
    sectionBody: { padding: 20 },
    thumbWrap: { position: 'relative', borderRadius: 10, overflow: 'hidden', aspectRatio: '4/3', background: 'var(--separator)' },
};

const AddEditRoomCategory = () => {
    const history = useHistory();
    const { id } = useParams();
    const isEdit = !!id;
    const cur = process.env.REACT_APP_CURRENCY;

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [files, setFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [form, setForm] = useState({
        category_name: '', base_price: '', max_occupancy: '',
        is_extra_bed_allowed: false, amenities: [], description: '', images: [],
    });

    const title = isEdit ? 'Edit Room Category' : 'Add Room Category';
    const breadcrumbs = [
        { to: '/operations', text: 'Operations' },
        { to: '/operations/room-categories', text: 'Room Categories' },
        { to: '', text: isEdit ? 'Edit' : 'Add' },
    ];

    useEffect(() => {
        if (!isEdit) return;
        setLoading(true);
        roomCategoryAPI.getOne(id)
            .then(res => {
                const cat = res.data.data.category;
                setForm({ category_name: cat.category_name, base_price: cat.base_price, max_occupancy: cat.max_occupancy, is_extra_bed_allowed: cat.is_extra_bed_allowed || false, amenities: normalizeAmenities(cat.amenities), description: cat.description || '', images: cat.images || [] });
            })
            .catch(() => { toast.error('Failed to fetch category'); history.push('/operations/room-categories'); })
            .finally(() => setLoading(false));
    }, [id]);

    const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

    const getImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${API_URL.replace('/api', '')}${path}`;
    };

    const handleFileChange = (e) => {
        const arr = Array.from(e.target.files);
        if (arr.length > 5) { toast.error('Max 5 images'); return; }
        if (arr.some(f => f.size > 5 * 1024 * 1024)) { toast.error('Some files exceed 5MB'); return; }
        setFiles(arr); setPreviews(arr.map(f => URL.createObjectURL(f)));
    };

    const removeImage = (i, existing) => {
        if (existing) {
            const imgs = [...form.images];
            imgs.splice(i, 1);
            setForm(p => ({ ...p, images: imgs }));
        } else {
            URL.revokeObjectURL(previews[i]);

            const f2 = [...files];
            const p2 = [...previews];

            f2.splice(i, 1);
            p2.splice(i, 1);

            setFiles(f2);
            setPreviews(p2);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append('category_name', form.category_name); fd.append('base_price', form.base_price);
            fd.append('max_occupancy', form.max_occupancy); fd.append('description', form.description || '');
            fd.append('is_extra_bed_allowed', form.is_extra_bed_allowed);
            form.amenities.forEach(a => fd.append('amenities[]', a));
            if (form.images.length) fd.append('existing_images', JSON.stringify(form.images));
            files.forEach(f => fd.append('images', f));
            if (isEdit) { await roomCategoryAPI.update(id, fd); toast.success('Category updated'); }
            else { await roomCategoryAPI.create(fd); toast.success('Category created'); }
            history.push('/operations/room-categories');
        } catch (err) { toast.error(err.response?.data?.message || 'Operation failed'); }
        finally { setSubmitting(false); }
    };

    const handleCancel = () => { previews.forEach(u => URL.revokeObjectURL(u)); history.push('/operations/room-categories'); };

    if (loading) return <><HtmlHead title={title} /><div className="d-flex justify-content-center align-items-center" style={{ minHeight: 400 }}><Spinner animation="border" variant="primary" /></div></>;

    return (
        <div className="workstation-container pb-5">
            <div className="container-fluid ps-lg-4 pe-lg-5">
                <HtmlHead title={title} description={isEdit ? 'Update category' : 'Create category'} />
                
                <div className="page-title-container mb-4 mt-2 mt-lg-0">
                    <Row className="align-items-center">
                        <Col xs="12" md="7">
                            <h1 className="mb-0 pb-0 display-4 fw-bold" style={{ color: '#23b3f4' }}>{title}</h1>
                            <BreadcrumbList items={breadcrumbs} />
                        </Col>
                        <Col xs="12" md="5" className="d-flex justify-content-md-end gap-2 mt-3 mt-md-0">
                            <Button onClick={handleCancel} className="btn-capsule btn-capsule-sm d-flex align-items-center gap-2">
                                <CsLineIcons icon="arrow-left" size="15" />
                                Back to List
                            </Button>
                        </Col>
                    </Row>
                </div>
                
                <Row><Col xl={9} lg={11} className="mx-auto">
                    <Form onSubmit={handleSubmit}>

                        {/* Category Details */}
                        <div style={S.sectionCard}>
                            <div style={S.sectionHeader('var(--primary)')}><CsLineIcons icon="list" size="16" />Category Details</div>
                            <div style={S.sectionBody}>
                                <Row className="g-3">
                                    <Col xs={12}>
                                        <Form.Label style={S.label}>Category Name <span className="text-danger">*</span></Form.Label>
                                        <Form.Control type="text" name="category_name" value={form.category_name} onChange={handleChange} required placeholder="e.g., Deluxe Room, Suite" className="modern-input" />
                                    </Col>
                                    <Col xs={12} sm={6}>
                                        <Form.Label style={S.label}>Base Price per Night <span className="text-danger">*</span></Form.Label>
                                        <Form.Control type="number" name="base_price" value={form.base_price} onChange={handleChange} required min="0" step="0.01" placeholder="150.00" className="modern-input" />
                                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Price in {cur}</div>
                                    </Col>
                                    <Col xs={12} sm={6}>
                                        <Form.Label style={S.label}>Max Occupancy <span className="text-danger">*</span></Form.Label>
                                        <Form.Control type="number" name="max_occupancy" value={form.max_occupancy} onChange={handleChange} required min="1" placeholder="2" className="modern-input" />
                                    </Col>
                                    <Col xs={12}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${form.is_extra_bed_allowed ? 'rgba(var(--primary-rgb),.3)' : 'var(--separator)'}`, background: form.is_extra_bed_allowed ? 'rgba(var(--primary-rgb),.04)' : 'transparent', cursor: 'pointer' }} onClick={() => setForm(p => ({ ...p, is_extra_bed_allowed: !p.is_extra_bed_allowed }))}>
                                            <Form.Check type="checkbox" id="extrabed" checked={form.is_extra_bed_allowed} onChange={e => setForm(p => ({ ...p, is_extra_bed_allowed: e.target.checked }))} style={{ margin: 0, cursor: 'pointer' }} onClick={e => e.stopPropagation()} />
                                            <div><div style={{ fontWeight: 600, fontSize: 13 }}>Allow Extra Bed</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Guests can request an extra bed when booking rooms in this category</div></div>
                                        </div>
                                    </Col>
                                    <Col xs={12}>
                                        <Form.Label style={S.label}>Description</Form.Label>
                                        <Form.Control as="textarea" rows={3} name="description" value={form.description} onChange={handleChange} placeholder="Describe this room category…" className="modern-input" />
                                    </Col>
                                </Row>
                            </div>
                        </div>

                        {/* Amenities */}
                        <div style={S.sectionCard}>
                            <div style={S.sectionHeader('#28a745')}>
                                <CsLineIcons icon="star" size="16" />Amenities
                                {form.amenities.length > 0 && <span style={{ fontSize: 11, fontWeight: 600, background: '#28a74520', color: '#28a745', borderRadius: 20, padding: '2px 8px', marginLeft: 4 }}>{form.amenities.length} selected</span>}
                            </div>
                            <div style={S.sectionBody}>
                                <AmenityPicker selected={form.amenities} onChange={arr => setForm(p => ({ ...p, amenities: arr }))} label="Category Amenities" />
                                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>These amenities apply to all rooms in this category. Individual rooms can also have their own additional amenities.</div>
                            </div>
                        </div>

                        {/* Images */}
                        <div style={S.sectionCard}>
                            <div style={S.sectionHeader('#6f42c1')}><CsLineIcons icon="image" size="16" />Category Images<Badge bg="light" text="dark" style={{ fontSize: 10, marginLeft: 4 }}>{form.images.length + files.length} / 5</Badge></div>
                            <div style={S.sectionBody}>
                                <Form.Control type="file" multiple accept="image/*" onChange={handleFileChange} disabled={submitting} style={{ borderRadius: 10, marginBottom: 12 }} />
                                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 16 }}>Up to 5 images · Max 5MB each · JPG, PNG, WebP</div>
                                {(form.images.length > 0 || previews.length > 0) && (
                                    <Row className="g-3">
                                        {form.images.map((img, i) => (
                                            <Col xs={6} sm={4} md={3} key={`ex-${i}`}>
                                                <div style={S.thumbWrap}>
                                                    <img src={getImageUrl(img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    <button type="button" onClick={() => removeImage(i, true)} style={{ position: 'absolute', top: 6, right: 6, background: '#dc3545', border: 'none', borderRadius: '50%', width: 28, height: 28, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CsLineIcons icon="bin" size="12" /></button>
                                                </div>
                                            </Col>
                                        ))}
                                        {previews.map((url, i) => (
                                            <Col xs={6} sm={4} md={3} key={`new-${i}`}>
                                                <div style={S.thumbWrap}>
                                                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    <button type="button" onClick={() => removeImage(i, false)} style={{ position: 'absolute', top: 6, right: 6, background: '#dc3545', border: 'none', borderRadius: '50%', width: 28, height: 28, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CsLineIcons icon="bin" size="12" /></button>
                                                    <span style={{ position: 'absolute', bottom: 6, left: 6, fontSize: 9, fontWeight: 800, background: '#28a745', color: '#fff', borderRadius: 4, padding: '2px 5px' }}>NEW</span>
                                                </div>
                                            </Col>
                                        ))}
                                    </Row>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={S.sectionCard}>
                            <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                                <Button variant="outline-secondary" className="btn-capsule btn-capsule-sm" type="button" onClick={handleCancel} disabled={submitting}>Cancel</Button>
                                <Button variant="primary" className="btn-capsule btn-capsule-sm d-inline-flex align-items-center gap-2" type="submit" disabled={submitting} style={{ minWidth: 160 }}>
                                    {submitting ? <><Spinner as="span" animation="border" size="sm" />{isEdit ? 'Updating…' : 'Creating…'}</> : <><CsLineIcons icon="save" size="14" />{isEdit ? 'Update Category' : 'Create Category'}</>}
                                </Button>
                            </div>
                        </div>

                    </Form>
                </Col></Row>
            </div>
        </div>
    );
};
export default AddEditRoomCategory;