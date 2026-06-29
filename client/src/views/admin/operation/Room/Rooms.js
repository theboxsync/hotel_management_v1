import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Card, Row, Col, Button, Form, Badge, Spinner, Alert, Modal, Collapse } from 'react-bootstrap';
import { useHistory } from 'react-router-dom';
import { roomAPI, roomCategoryAPI } from 'services/api';
import { toast } from 'react-toastify';
import { useTable, useGlobalFilter, useSortBy } from 'react-table';
import HtmlHead from 'components/html-head/HtmlHead';
import BreadcrumbList from 'components/breadcrumb-list/BreadcrumbList';
import CsLineIcons from 'cs-line-icons/CsLineIcons';
import ControlsSearch from 'components/table/ControlsSearch';
import ControlsPageSize from 'components/table/ControlsPageSize';
import Table from 'components/table/Table';
import TablePagination from 'components/table/TablePagination';
import RoomDetailModal, { statusMeta } from 'components/modals/RoomDetailModal';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/* ─── Portal-based action menu (same pattern as Bookings) ─────────────────── */
const PortalMenu = ({ show, toggleRef, children, onClose }) => {
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!show || !toggleRef.current) return;
    const rect = toggleRef.current.getBoundingClientRect();
    const menuH = menuRef.current?.offsetHeight || 160;
    const below = window.innerHeight - rect.bottom;
    const top = below >= menuH
      ? rect.bottom + window.scrollY + 4
      : rect.top + window.scrollY - menuH - 4;
    setPos({ top, left: rect.right + window.scrollX - 180 });
  }, [show, toggleRef]);

  useEffect(() => {
    if (!show) return undefined;

    const handler = (e) => {
      if (menuRef.current?.contains(e.target) || toggleRef.current?.contains(e.target)) return;
      onClose();
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [show, onClose, toggleRef]);

  if (!show) return null;
  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      className="dropdown-portal-menu dropdown-menu show shadow"
      style={{
        position: 'absolute',
        top: pos.top,
        left: pos.left,
        minWidth: 180,
      }}
    >
      {children}
    </div>,
    document.body
  );
};

const ActionMenu = ({ children }) => {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef(null);
  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        className="btn btn-outline-primary btn-sm btn-icon btn-icon-only btn-action-more"
        onClick={() => setOpen(v => !v)}
      >
        <CsLineIcons icon="more-horizontal" />
      </button>
      <PortalMenu show={open} toggleRef={toggleRef} onClose={() => setOpen(false)}>
        {React.Children.map(children, child =>
          child ? React.cloneElement(child, { onClick: (...args) => { setOpen(false); child.props.onClick?.(...args); } }) : null
        )}
      </PortalMenu>
    </>
  );
};

const MenuItem = ({ icon, children, onClick, danger }) => (
  <button
    type="button"
    className={`dropdown-menu-item-text ${danger ? 'danger-item' : ''}`}
    onClick={onClick}
  >
    <CsLineIcons icon={icon} size="14" />
    {children}
  </button>
);
const MenuDivider = () => <div className="dropdown-divider my-1" />;

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
    <div className="rooms-lightbox-overlay" onClick={onClose}>
      {/* Prev */}
      {current > 0 && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); setCurrent(c => c - 1); }}
          className="btn btn-icon btn-icon-only text-white bg-dark bg-opacity-25 rounded-circle p-0"
          style={{ position: 'absolute', left: 20, width: 44, height: 44, fontSize: 20 }}
        >
          ‹
        </button>
      )}

      <div className="d-flex flex-column align-items-center gap-2" onClick={e => e.stopPropagation()}>
        <img src={images[current]} alt={`Photo ${current + 1}`} className="rooms-lightbox-img" />
        <div className="text-white-50 small mt-1">{current + 1} / {images.length}</div>
      </div>

      {/* Next */}
      {current < images.length - 1 && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); setCurrent(c => c + 1); }}
          className="btn btn-icon btn-icon-only text-white bg-dark bg-opacity-25 rounded-circle p-0"
          style={{ position: 'absolute', right: 20, width: 44, height: 44, fontSize: 20 }}
        >
          ›
        </button>
      )}

      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        className="btn btn-icon btn-icon-only text-white bg-dark bg-opacity-25 rounded-circle p-0"
        style={{ position: 'absolute', top: 16, right: 20, width: 36, height: 36 }}
      >
        <CsLineIcons icon="close" size="16" />
      </button>
    </div>,
    document.body
  );
};

/* ─── Area image grid ─────────────────────────────────────────────────────── */
const AreaImageGrid = ({ images, getImageUrl }) => {
  const [lightbox, setLightbox] = useState(null);

  if (!images || images.length === 0) return (
    <div className="text-muted small text-center py-3">
      No photos for this area
    </div>
  );

  const urls = images.map(getImageUrl).filter(Boolean);

  return (
    <>
      <Row className="g-2">
        {urls.map((url, i) => (
          <Col xs={6} sm={4} md={3} key={i}>
            <div className="rooms-gallery-thumb position-relative w-100" style={{ aspectRatio: '4/3', cursor: 'pointer' }} onClick={() => setLightbox({ images: urls, index: i })}>
              <img src={url} alt={`Photo ${i + 1}`} className="w-100 h-100 object-fit-cover transition" />
              {/* Photo count overlay on last thumb when there are more than 8 */}
              {i === 7 && urls.length > 8 && (
                <div className="rooms-lightbox-overlay bg-dark bg-opacity-50 position-absolute inset-0 d-flex align-items-center justify-content-center text-white fw-bold fs-5">
                  +{urls.length - 8}
                </div>
              )}
            </div>
          </Col>
        )).slice(0, 8)}
      </Row>
      {lightbox && (
        <Lightbox
          images={lightbox.images}
          startIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
};

/* ════════════════════════════════════════════════════════════════════════════ */
const Rooms = () => {
  const history = useHistory();
  const cur = process.env.REACT_APP_CURRENCY;

  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Detail modal
  const [detailRoom, setDetailRoom] = useState(null);

  const [filters, setFilters] = useState({
    category_id: '', status: '', floor: '', minPrice: '', maxPrice: '',
  });

  const title = 'Manage Rooms';
  const description = 'Manage hotel rooms and their status';
  const breadcrumbs = [
    { to: '/dashboard', text: 'Dashboard' },
    { to: '/operations/rooms', text: 'Manage Rooms' },
  ];

  const getActiveFilterCount = () =>
    [filters.category_id, filters.status, filters.floor, filters.minPrice, filters.maxPrice, searchTerm].filter(Boolean).length;

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${API_URL.replace('/api', '')}${path}`;
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchRooms = async () => {
    setLoading(true);
    try {
      const [roomsRes, catsRes] = await Promise.all([
        roomAPI.getAll(),
        roomCategoryAPI.getAll(),
      ]);
      const cats = catsRes.data.data || [];
      setCategories(cats);
      const catMap = Object.fromEntries(cats.map(c => [c._id, c]));
      const mapped = (roomsRes.data.data || []).map(room => ({
        ...room,
        category_name: room.category_details?.category_name || catMap[room.category_id]?.category_name || 'N/A',
      }));
      setRooms(mapped);
    } catch {
      toast.error('Failed to fetch rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRooms(); }, []);

  // ── Client-side filtering ─────────────────────────────────────────────────
  useEffect(() => {
    let f = [...rooms];
    if (filters.category_id) f = f.filter(r => r.category_id === filters.category_id);
    if (filters.status) f = f.filter(r => r.status === filters.status);
    if (filters.floor) f = f.filter(r => r.floor === parseInt(filters.floor, 10));
    if (filters.minPrice) f = f.filter(r => r.current_price >= parseFloat(filters.minPrice));
    if (filters.maxPrice) f = f.filter(r => r.current_price <= parseFloat(filters.maxPrice));
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      f = f.filter(r =>
        r.room_number?.toLowerCase().includes(t) ||
        r.category_name?.toLowerCase().includes(t) ||
        r.floor?.toString().includes(t)
      );
    }
    setFilteredRooms(f);
    setPageIndex(0);
  }, [rooms, filters, searchTerm]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSearch = useCallback(v => setSearchTerm(v), []);
  const handleFilterChange = (k, v) => setFilters(p => ({ ...p, [k]: v }));
  const handleClearFilters = () => { setFilters({ category_id: '', status: '', floor: '', minPrice: '', maxPrice: '' }); setSearchTerm(''); };

  const handleEdit = (id) => history.push(`/operations/rooms/edit/${id}`);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this room?')) return;
    try {
      await roomAPI.delete(id);
      toast.success('Room deleted successfully');
      fetchRooms();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete room');
    }
  };

  const handleStatusChange = async (roomId, newStatus) => {
    try {
      await roomAPI.updateStatus(roomId, newStatus);
      toast.success('Room status updated');
      fetchRooms();
    } catch {
      toast.error('Failed to update status');
    }
  };

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns = useMemo(() => [
    {
      Header: 'Room',
      accessor: 'room_number',
      Cell: ({ row }) => {
        const r = row.original;
        const areas = r.area_layouts || [];
        const thumb = areas.flatMap(a => a.images || []).find(Boolean);
        return (
          <div className="d-flex align-items-center gap-2">
            {/* Mini thumbnail */}
            <div className="room-mini-thumbnail">
              {thumb
                ? <img src={getImageUrl(thumb)} alt="" className="w-100 h-100 object-fit-cover" />
                : <div className="w-100 h-100 d-flex align-items-center justify-content-center bg-light text-muted">
                  <CsLineIcons icon="bed" size="16" />
                </div>}
            </div>
            <div>
              <div className="fw-bold fs-6">Room {r.room_number}</div>
              <div className="room-table-meta-text">Floor {r.floor}</div>
            </div>
          </div>
        );
      },
    },
    {
      Header: 'Category',
      accessor: 'category_name',
      Cell: ({ value }) => <span className="small">{value}</span>,
    },
    {
      Header: 'Price / Night',
      accessor: 'current_price',
      Cell: ({ value }) => <span className="fw-bold text-primary">{cur} {value}</span>,
    },
    {
      Header: 'Photos',
      Cell: ({ row }) => {
        const count = (row.original.area_layouts || []).reduce((s, a) => s + (a.images?.length || 0), 0);
        const areas = (row.original.area_layouts || []).length;
        return count > 0
          ? <span className="room-table-meta-text">{count} photo{count !== 1 ? 's' : ''} · {areas} area{areas !== 1 ? 's' : ''}</span>
          : <span className="room-table-meta-text text-black-50">—</span>;
      },
    },
    {
      Header: 'Status',
      accessor: 'status',
      Cell: ({ row }) => {
        const meta = statusMeta[row.original.status] || { color: '#6c757d', label: row.original.status, bg: 'secondary', icon: 'info' };
        return (
          <Badge bg={meta.bg} className="py-1 px-2 rounded booking-badge-sm cursor-default">
            <CsLineIcons icon={meta.icon} size="11" className="me-1" />
            {meta.label}
          </Badge>
        );
      },
    },
    {
      Header: 'Actions',
      Cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="d-flex gap-2 align-items-center">
            {/* View details button */}
            <button
              type="button"
              title="View Details"
              onClick={() => setDetailRoom(r)}
              className="btn btn-outline-primary btn-sm btn-icon btn-icon-only btn-action-more"
            >
              <CsLineIcons icon="eye" />
            </button>

            {/* Three-dot action menu */}
            <ActionMenu>
              <MenuItem icon="edit" onClick={() => handleEdit(r._id)}>Edit Room</MenuItem>
              <MenuDivider />
              <div className="p-3 pb-2 pt-1">
                <div className="rooms-label mb-2">Change Status</div>
                {Object.entries(statusMeta).map(([key, meta]) => (
                  <button key={key} type="button"
                    className="dropdown-item d-flex align-items-center gap-2 py-1 px-0"
                    style={{ fontSize: 12, opacity: r.status === key ? 0.4 : 1, pointerEvents: r.status === key ? 'none' : 'auto' }}
                    onClick={() => handleStatusChange(r._id, key)}>
                    <span className="rooms-status-dot" style={{ backgroundColor: meta.color }} />
                    {meta.label}
                  </button>
                ))}
              </div>
              <MenuDivider />
              <MenuItem icon="bin" danger onClick={() => handleDelete(r._id)}>Delete Room</MenuItem>
            </ActionMenu>
          </div>
        );
      },
    },
  ], []);

  // ── Pagination ────────────────────────────────────────────────────────────
  const paginatedRooms = useMemo(() => {
    const start = pageIndex * pageSize;
    return filteredRooms.slice(start, start + pageSize);
  }, [filteredRooms, pageIndex, pageSize]);

  const totalPages = Math.ceil(filteredRooms.length / pageSize);

  const tableInstance = useTable(
    {
      columns, data: paginatedRooms, manualPagination: true, manualSortBy: false,
      autoResetPage: false, autoResetSortBy: false,
      initialState: { sortBy: [{ id: 'room_number', desc: false }] }
    },
    useGlobalFilter, useSortBy
  );

  const paginationProps = {
    canPreviousPage: pageIndex > 0,
    canNextPage: pageIndex < totalPages - 1,
    pageCount: totalPages,
    pageIndex,
    gotoPage: (i) => setPageIndex(i),
    nextPage: () => setPageIndex(p => p + 1),
    previousPage: () => setPageIndex(p => p - 1),
  };

  return (
    <div className="workstation-container pb-5">
      <div className="container-fluid ps-lg-4 pe-lg-5">
        <HtmlHead title={title} description={description} />
        
        {/* Page title header */}
        <div className="page-title-container mb-4 mt-2 mt-lg-0">
          <Row className="align-items-center">
            <Col xs="12" md="7">
              <h1 className="mb-0 pb-0 display-4 fw-bold" style={{ color: '#23b3f4' }}>{title}</h1>
              <BreadcrumbList items={breadcrumbs} />
            </Col>
            <Col xs="12" md="5" className="d-flex justify-content-md-end gap-2 mt-3 mt-md-0">
              <Button onClick={() => history.push('/operations/rooms/add')} className="btn-capsule btn-capsule-sm d-flex align-items-center gap-2">
                <CsLineIcons icon="plus" size="18" />
                Add Rooms
              </Button>
            </Col>
          </Row>
        </div>

        {/* Outer Card Wrapper */}
        <Card className="workstation-card border-0 mb-4 shadow-sm">
          <Card.Body className="p-4">
            
            {/* Controls row */}
            <Row className="mb-4 align-items-center">
              <Col sm="12" md="5" lg="3" xxl="2">
                <div className="d-flex gap-2">
                  <div className="d-inline-block float-md-start me-1 mb-1 mb-md-0 search-input-container w-100 shadow bg-foreground">
                    <ControlsSearch onSearch={handleSearch} />
                  </div>
                  <Button variant={showFilters ? 'secondary' : 'outline-secondary'} size="sm"
                    className="btn-icon btn-icon-only position-relative btn-action-more"
                    onClick={() => setShowFilters(v => !v)}>
                    <CsLineIcons icon={showFilters ? 'close' : 'filter'} />
                    {getActiveFilterCount() > 0 && (
                      <Badge bg="primary" className="position-absolute top-0 start-100 translate-middle booking-active-filters-badge">
                        {getActiveFilterCount()}
                      </Badge>
                    )}
                  </Button>
                </div>
              </Col>
              <Col sm="12" md="7" lg="9" xxl="10" className="text-end">
                <span className="me-3 text-muted small">
                  {loading ? 'Loading…' : `${filteredRooms.length > 0 ? pageIndex * pageSize + 1 : 0}–${Math.min((pageIndex + 1) * pageSize, filteredRooms.length)} of ${filteredRooms.length}`}
                </span>
                <ControlsPageSize pageSize={pageSize} onPageSizeChange={(s) => { setPageSize(s); setPageIndex(0); }} />
              </Col>
            </Row>

            {/* Filter panel */}
            <Collapse in={showFilters}>
              <Card className="mb-4 border-0 bg-light shadow-none">
                <Card.Body className="p-3">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="mb-0 fw-bold">Filters</h6>
                    {getActiveFilterCount() > 0 && (
                      <Button variant="outline-danger" size="sm" onClick={handleClearFilters} className="btn-action-more small py-1 px-3">
                        <CsLineIcons icon="close" size="12" className="me-1" />Clear all
                      </Button>
                    )}
                  </div>
                  <Row className="g-3">
                    <Col md={3}>
                      <Form.Label className="rooms-label">Category</Form.Label>
                      <Form.Select size="sm" value={filters.category_id} onChange={e => handleFilterChange('category_id', e.target.value)} className="modern-input">
                        <option value="">All Categories</option>
                        {categories.map(c => <option key={c._id} value={c._id}>{c.category_name}</option>)}
                      </Form.Select>
                    </Col>
                    <Col md={3}>
                      <Form.Label className="rooms-label">Status</Form.Label>
                      <Form.Select size="sm" value={filters.status} onChange={e => handleFilterChange('status', e.target.value)} className="modern-input">
                        <option value="">All Statuses</option>
                        {Object.entries(statusMeta).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
                      </Form.Select>
                    </Col>
                    <Col md={2}>
                      <Form.Label className="rooms-label">Floor</Form.Label>
                      <Form.Control size="sm" type="number" value={filters.floor} onChange={e => handleFilterChange('floor', e.target.value)} placeholder="Floor" className="modern-input" />
                    </Col>
                    <Col md={4}>
                      <Form.Label className="rooms-label">Price Range</Form.Label>
                      <Row className="g-2">
                        <Col xs={6}><Form.Control size="sm" type="number" placeholder="Min" value={filters.minPrice} onChange={e => handleFilterChange('minPrice', e.target.value)} className="modern-input" /></Col>
                        <Col xs={6}><Form.Control size="sm" type="number" placeholder="Max" value={filters.maxPrice} onChange={e => handleFilterChange('maxPrice', e.target.value)} disabled={!filters.minPrice} className="modern-input" /></Col>
                      </Row>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Collapse>

            {/* Table */}
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" className="mb-3" />
                <p className="text-muted">Loading rooms…</p>
              </div>
            ) : filteredRooms.length === 0 ? (
              <Alert variant="info" className="border-0 bg-light-info text-info rounded-lg">
                <CsLineIcons icon="inbox" className="me-2" />
                {searchTerm || getActiveFilterCount() > 0
                  ? 'No results. Try adjusting your filters.'
                  : rooms.length === 0 ? 'No rooms yet. Add your first room!' : 'No rooms match the current filters.'}
              </Alert>
            ) : (
              <Row>
                <Col xs="12" className="table-scroll-container">
                  <Table className="react-table rows table-reconcile" tableInstance={tableInstance} />
                </Col>
                <Col xs="12">
                  <TablePagination paginationProps={paginationProps} />
                </Col>
              </Row>
            )}
          </Card.Body>
        </Card>
      </div>

      {/* Room Detail Modal */}
      {detailRoom && (
        <RoomDetailModal
          room={detailRoom}
          onHide={() => setDetailRoom(null)}
          onEdit={handleEdit}
          onStatusChange={handleStatusChange}
          getImageUrl={getImageUrl}
        />
      )}
    </div>
  );
};

export default Rooms;
export { AreaImageGrid };