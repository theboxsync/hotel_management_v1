import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { Card, Row, Col, Button, Form, Badge, Spinner, Alert, InputGroup } from 'react-bootstrap';
import { bookingAPI, roomAPI, roomCategoryAPI } from 'services/api';
import { toast } from 'react-toastify';
import HtmlHead from 'components/html-head/HtmlHead';
import BreadcrumbList from 'components/breadcrumb-list/BreadcrumbList';
import CsLineIcons from 'cs-line-icons/CsLineIcons';

/* ─── Inline styles (no new dependencies) ─────────────────────────────────── */
const S = {
  stepCircle: (active) => ({
    width: 36,
    height: 36,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 14,
    transition: 'all .25s',
    background: active ? 'var(--primary)' : 'var(--separator)',
    color: active ? '#fff' : 'var(--muted)',
    boxShadow: active ? '0 4px 12px rgba(var(--primary-rgb),.35)' : 'none',
  }),
  stepLine: (active) => ({
    flex: 1,
    height: 2,
    background: active ? 'var(--primary)' : 'var(--separator)',
    transition: 'background .35s',
    margin: '0 6px',
  }),
  roomCard: (selected) => ({
    border: `2px solid ${selected ? 'var(--primary)' : 'var(--separator)'}`,
    borderRadius: 16,
    transition: 'all .2s',
    cursor: 'pointer',
    background: selected ? 'rgba(var(--primary-rgb),.04)' : 'var(--foreground)',
    boxShadow: selected ? '0 6px 20px rgba(var(--primary-rgb),.12)' : '0 2px 8px rgba(0,0,0,.04)',
  }),
  sectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    marginBottom: 4,
  },
  summaryBanner: {
    borderRadius: 14,
    padding: '14px 18px',
    background: 'rgba(var(--primary-rgb),.07)',
    border: '1.5px solid rgba(var(--primary-rgb),.18)',
  },
  fieldGroup: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  confirmRow: (last) => ({
    padding: '12px 16px',
    borderBottom: last ? 'none' : '1px solid var(--separator)',
  }),
};

const NewBooking = () => {
  const history = useHistory();
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const [searchData, setSearchData] = useState({
    check_in_date: '',
    check_out_date: '',
    guests_count: 1,
  });

  const [guestData, setGuestData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    special_requests: '',
    booking_source: 'direct',
    payment_method: '',
    discount_amount: 0,
    coupon_code: '',
  });

  const [guestDistribution, setGuestDistribution] = useState({});

  // Room filters
  const [roomSearch, setRoomSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterFloor, setFilterFloor] = useState('');

  const title = 'New Booking';
  const description = 'Create a new room booking';
  const breadcrumbs = [
    { to: '/operations', text: 'Operations' },
    { to: '/operations/bookings', text: 'Bookings' },
    { to: '/operations/new-booking', text: 'New Booking' },
  ];

  useEffect(() => {
    roomCategoryAPI.getAll()
      .then(r => setCategories(r.data.data || []))
      .catch(() => toast.error('Failed to fetch room categories'));
  }, []);

  const handleSearchChange = (e) => setSearchData({ ...searchData, [e.target.name]: e.target.value });
  const handleGuestChange = (e) => setGuestData({ ...guestData, [e.target.name]: e.target.value });


  const handleBack = () => step > 1 ? setStep(step - 1) : history.push('/operations/bookings');

  const getCategoryName = (id) => categories.find(c => c._id === id)?.category_name || 'Unknown';
  const getCategoryMaxOccupancy = (id) => categories.find(c => c._id === id)?.max_occupancy || 0;
  const isRoomSelected = (id) => !!selectedRooms.find(r => r._id === id);

  const STEPS = ['Select Room(s)', 'Guest Details', 'Confirmation'];
  const cur = process.env.REACT_APP_CURRENCY;

  const handleSearchRooms = async (e) => {
    e.preventDefault();
    if (!searchData.check_in_date || !searchData.check_out_date) {
      toast.error('Please select check-in and check-out dates');
      return;
    }
    setSearching(true);
    try {
      const responseRooms = await roomAPI.getAll({ status: 'available' });
      const rooms = responseRooms.data.data || [];
      const roomIds = rooms.map(r => r._id);
      const response = await bookingAPI.checkAvailability({
        room_ids: roomIds,
        check_in_date: searchData.check_in_date,
        check_out_date: searchData.check_out_date,
      });
      const availableRoomIds = response.data.data.rooms
        .filter(r => r.available !== false)
        .map(r => r.room_id);
      const availRooms = rooms
        .filter(room => availableRoomIds.includes(room._id))
        .map(room => ({
          ...room,
          nights: response.data.data.nights,
          estimatedTotal: room.current_price * response.data.data.nights,
        }));
      setAvailableRooms(availRooms);
      if (availRooms.length === 0) {
        toast.warning('No rooms available for selected dates');
      } else {
        toast.success(`Found ${availRooms.length} available rooms`);
      }
    } catch {
      toast.error('Failed to search rooms');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectRoom = (room) => {
    const isSelected = selectedRooms.find(r => r._id === room._id);
    if (isSelected) {
      setSelectedRooms(selectedRooms.filter(r => r._id !== room._id));
      const d = { ...guestDistribution };
      delete d[room._id];
      setGuestDistribution(d);
    } else {
      setSelectedRooms([...selectedRooms, room]);
      setGuestDistribution({ ...guestDistribution, [room._id]: 1 });
    }
  };

  const handleGuestDistributionChange = (roomId, value) => {
    setGuestDistribution({ ...guestDistribution, [roomId]: Number(value) || 0 });
  };

  const getTotalGuestsDistributed = () => Object.values(guestDistribution).reduce((s, n) => s + n, 0);
  const getTotalMaxOccupancy = () => selectedRooms.reduce((s, room) => {
    const cat = categories.find(c => c._id === room.category_id);
    return s + (cat?.max_occupancy || 2);
  }, 0);
  const getTotalPrice = () => selectedRooms.reduce((s, r) => s + (r.estimatedTotal || 0), 0);

  // Derived: unique floors from available rooms (sorted)
  const availableFloors = [...new Set(availableRooms.map(r => r.floor))].sort((a, b) => a - b);

  // Filtered rooms based on search + filters
  const filteredRooms = availableRooms.filter(room => {
    const matchSearch = roomSearch.trim() === '' ||
      String(room.room_number).toLowerCase().includes(roomSearch.toLowerCase()) ||
      getCategoryName(room.category_id).toLowerCase().includes(roomSearch.toLowerCase());
    const matchCategory = filterCategory === '' || room.category_id === filterCategory;
    const matchFloor = filterFloor === '' || String(room.floor) === filterFloor;
    return matchSearch && matchCategory && matchFloor;
  });

  const activeFilterCount = [roomSearch, filterCategory, filterFloor].filter(Boolean).length;

  const handleContinueToGuestDetails = () => {
    if (selectedRooms.length === 0) { toast.error('Please select at least one room'); return; }
    const totalDistributed = getTotalGuestsDistributed();
    const totalGuests = Number(searchData.guests_count);
    if (totalDistributed !== totalGuests) {
      toast.error(`Distribute all ${totalGuests} guests (currently: ${totalDistributed})`);
      return;
    }
    if (totalGuests > getTotalMaxOccupancy()) {
      toast.error(`Guests exceed max capacity. Please select more rooms.`);
      return;
    }
    setStep(2);
  };

  const handleConfirmBooking = async () => {
    setLoading(true);
    const bookingData = {
      room_ids: selectedRooms.map(r => r._id),
      room_breakdown: selectedRooms.map(room => ({
        room_id: room._id,
        guests_in_room: guestDistribution[room._id] || 0,
      })),
      check_in_date: searchData.check_in_date,
      check_out_date: searchData.check_out_date,
      guests_count: parseInt(searchData.guests_count, 10),
      ...guestData,
      discount_amount: parseFloat(guestData.discount_amount) || 0,
    };
    try {
      await bookingAPI.create(bookingData);
      toast.success(`Booking created for ${selectedRooms.length} room(s)!`);
      history.push('/operations/bookings');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create booking');
      setLoading(false);
    }
  };

  return (
    <>
      <HtmlHead title={title} description={description} />
      <Row>
        <Col>
          {/* ── Header ── */}
          <div className="page-title-container mb-4">
            <Row className="align-items-center">
              <Col xs="12" md="7">
                <h1 className="mb-0 pb-0 display-4">{title}</h1>
                <BreadcrumbList items={breadcrumbs} />
              </Col>
              <Col xs="12" md="5" className="text-end mt-2 mt-md-0">
                <Button variant="outline-secondary" onClick={handleBack} className="d-inline-flex align-items-center gap-2">
                  <CsLineIcons icon="arrow-left" />
                  Back
                </Button>
              </Col>
            </Row>
          </div>

          {/* ── Step Indicator ── */}
          <Card className="mb-4">
            <Card.Body className="py-3 px-4">
              <div className="d-flex align-items-center">
                {STEPS.map((label, i) => (
                  <React.Fragment key={i}>
                    <div className="d-flex flex-column align-items-center" style={{ minWidth: 72 }}>
                      <div style={S.stepCircle(step >= i + 1)}>
                        {step > i + 1
                          ? <CsLineIcons icon="check" size="14" />
                          : i + 1}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, marginTop: 6, color: step >= i + 1 ? 'var(--primary)' : 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div style={S.stepLine(step >= i + 2)} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </Card.Body>
          </Card>

          {/* ════════════════ STEP 1 ════════════════ */}
          {step === 1 && (
            <Card>
              <Card.Header className="border-bottom pb-3">
                <h5 className="mb-0 d-flex align-items-center gap-2">
                  <CsLineIcons icon="search" size="18" />
                  Search Available Rooms
                </h5>
              </Card.Header>
              <Card.Body>

                {/* Search form */}
                <Form onSubmit={handleSearchRooms}>
                  <Row className="g-3 mb-3">
                    <Col xs={12} sm={6} lg={4}>
                      <Form.Label style={S.sectionLabel}>Check-In Date</Form.Label>
                      <Form.Control
                        type="date"
                        name="check_in_date"
                        value={searchData.check_in_date}
                        onChange={handleSearchChange}
                        required
                        min={new Date().toISOString().split('T')[0]}
                        style={{ borderRadius: 10 }}
                      />
                    </Col>
                    <Col xs={12} sm={6} lg={4}>
                      <Form.Label style={S.sectionLabel}>Check-Out Date</Form.Label>
                      <Form.Control
                        type="date"
                        name="check_out_date"
                        value={searchData.check_out_date}
                        onChange={handleSearchChange}
                        required
                        min={searchData.check_in_date || new Date().toISOString().split('T')[0]}
                        style={{ borderRadius: 10 }}
                      />
                    </Col>
                    <Col xs={12} sm={12} lg={4}>
                      <Form.Label style={S.sectionLabel}>Total Guests</Form.Label>
                      <Form.Control
                        type="number"
                        name="guests_count"
                        value={searchData.guests_count}
                        onChange={handleSearchChange}
                        required
                        min="1"
                        style={{ borderRadius: 10 }}
                      />
                      <Form.Text className="text-muted" style={{ fontSize: 11 }}>
                        Select multiple rooms for large groups
                      </Form.Text>
                    </Col>
                  </Row>
                  <div className="d-flex justify-content-end">
                    <Button type="submit" variant="primary" disabled={searching} className="d-inline-flex align-items-center gap-2 px-4" style={{ borderRadius: 10 }}>
                      {searching
                        ? <><Spinner as="span" animation="border" size="sm" /> Searching…</>
                        : <><CsLineIcons icon="search" size="16" /> Search Rooms</>}
                    </Button>
                  </div>
                </Form>

                {/* Selected summary banner */}
                {selectedRooms.length > 0 && (
                  <div style={S.summaryBanner} className="mt-4 d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
                    <div className="d-flex align-items-center gap-2">
                      <CsLineIcons icon="check-circle" className="text-primary" size="18" />
                      <span className="fw-semibold">{selectedRooms.length} room{selectedRooms.length > 1 ? 's' : ''} selected</span>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                        • {getTotalGuestsDistributed()}/{searchData.guests_count} guests assigned
                        • Max {getTotalMaxOccupancy()} capacity
                      </span>
                    </div>
                    <div className="d-flex align-items-center gap-3">
                      <span className="fw-bold text-primary">{cur} {getTotalPrice().toFixed(2)}</span>
                      <Button variant="primary" size="sm" onClick={handleContinueToGuestDetails} style={{ borderRadius: 8, whiteSpace: 'nowrap' }}>
                        Continue →
                      </Button>
                    </div>
                  </div>
                )}

                {/* Available rooms grid */}
                {availableRooms.length > 0 && (
                  <div className="mt-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="mb-0 text-muted" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        Available Rooms — {availableRooms.length} found
                      </h6>
                    </div>

                    {/* ── Filter Bar ── */}
                    <div style={{ background: 'var(--background)', border: '1px solid var(--separator)', borderRadius: 14, padding: '14px 16px', marginBottom: 20 }}>
                      <Row className="g-2 align-items-end">
                        <Col xs={12} sm={5} md={5}>
                          <div style={S.sectionLabel}>Search Room</div>
                          <InputGroup size="sm">
                            <InputGroup.Text style={{ background: 'transparent', border: '1px solid var(--separator)', borderRight: 'none', borderRadius: '8px 0 0 8px' }}>
                              <CsLineIcons icon="search" size="14" />
                            </InputGroup.Text>
                            <Form.Control
                              type="text"
                              placeholder="Room number or type…"
                              value={roomSearch}
                              onChange={e => setRoomSearch(e.target.value)}
                              style={{ borderRadius: '0 8px 8px 0', fontSize: 13 }}
                            />
                          </InputGroup>
                        </Col>
                        <Col xs={6} sm={3} md={3}>
                          <div style={S.sectionLabel}>Category</div>
                          <Form.Select
                            size="sm"
                            value={filterCategory}
                            onChange={e => setFilterCategory(e.target.value)}
                            style={{ borderRadius: 8, fontSize: 13 }}
                          >
                            <option value="">All Categories</option>
                            {categories.map(cat => (
                              <option key={cat._id} value={cat._id}>{cat.category_name}</option>
                            ))}
                          </Form.Select>
                        </Col>
                        <Col xs={6} sm={3} md={3}>
                          <div style={S.sectionLabel}>Floor</div>
                          <Form.Select
                            size="sm"
                            value={filterFloor}
                            onChange={e => setFilterFloor(e.target.value)}
                            style={{ borderRadius: 8, fontSize: 13 }}
                          >
                            <option value="">All Floors</option>
                            {availableFloors.map(floor => (
                              <option key={floor} value={floor}>Floor {floor}</option>
                            ))}
                          </Form.Select>
                        </Col>
                        <Col xs={12} sm={1} md={1} className="d-flex align-items-end">
                          {activeFilterCount > 0 && (
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              style={{ borderRadius: 8, whiteSpace: 'nowrap', fontSize: 12, width: '100%' }}
                              onClick={() => { setRoomSearch(''); setFilterCategory(''); setFilterFloor(''); }}
                              title="Clear filters"
                            >
                              <CsLineIcons icon="close" size="12" />
                            </Button>
                          )}
                        </Col>
                      </Row>

                      {/* Active filter chips */}
                      {activeFilterCount > 0 && (
                        <div className="d-flex flex-wrap gap-2 mt-2">
                          {roomSearch && (
                            <span style={{ fontSize: 11, background: 'rgba(var(--primary-rgb),.1)', color: 'var(--primary)', borderRadius: 20, padding: '2px 10px', fontWeight: 600 }}>
                              "{roomSearch}"
                              <span style={{ cursor: 'pointer', marginLeft: 6 }} onClick={() => setRoomSearch('')}>×</span>
                            </span>
                          )}
                          {filterCategory && (
                            <span style={{ fontSize: 11, background: 'rgba(var(--primary-rgb),.1)', color: 'var(--primary)', borderRadius: 20, padding: '2px 10px', fontWeight: 600 }}>
                              {getCategoryName(filterCategory)}
                              <span style={{ cursor: 'pointer', marginLeft: 6 }} onClick={() => setFilterCategory('')}>×</span>
                            </span>
                          )}
                          {filterFloor && (
                            <span style={{ fontSize: 11, background: 'rgba(var(--primary-rgb),.1)', color: 'var(--primary)', borderRadius: 20, padding: '2px 10px', fontWeight: 600 }}>
                              Floor {filterFloor}
                              <span style={{ cursor: 'pointer', marginLeft: 6 }} onClick={() => setFilterFloor('')}>×</span>
                            </span>
                          )}
                          <span style={{ fontSize: 11, color: 'var(--muted)', padding: '2px 0' }}>
                            {filteredRooms.length} of {availableRooms.length} rooms shown
                          </span>
                        </div>
                      )}
                    </div>

                    {/* No results state */}
                    {filteredRooms.length === 0 && (
                      <div className="text-center py-5" style={{ color: 'var(--muted)' }}>
                        <CsLineIcons icon="search" size="32" className="mb-3 d-block mx-auto" />
                        <div className="fw-semibold mb-1">No rooms match your filters</div>
                        <div style={{ fontSize: 13 }}>Try adjusting or clearing the filters above</div>
                        <Button variant="outline-secondary" size="sm" className="mt-3" style={{ borderRadius: 8 }}
                          onClick={() => { setRoomSearch(''); setFilterCategory(''); setFilterFloor(''); }}>
                          Clear Filters
                        </Button>
                      </div>
                    )}

                    <Row className="g-3">
                      {filteredRooms.map((room) => {
                        const selected = isRoomSelected(room._id);
                        const maxOccupancy = getCategoryMaxOccupancy(room.category_id);
                        return (
                          <Col key={room._id} xs={12} sm={6} xl={4}>
                            <div style={S.roomCard(selected)} className="p-3 h-100 d-flex flex-column">

                              {/* Room header */}
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                  <div className="fw-bold d-flex align-items-center gap-1" style={{ fontSize: 15 }}>
                                    <CsLineIcons icon="bed" size="14" />
                                    Room {room.room_number}
                                  </div>
                                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                                    Floor {room.floor} · {getCategoryName(room.category_id)}
                                  </div>
                                </div>
                                <Badge
                                  bg={selected ? 'primary' : 'success'}
                                  style={{ fontSize: 10, borderRadius: 6, padding: '4px 8px' }}
                                >
                                  {selected ? '✓ Selected' : 'Available'}
                                </Badge>
                              </div>

                              {/* Occupancy */}
                              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
                                <CsLineIcons icon="user" size="11" className="me-1" />
                                Max {maxOccupancy} guest{maxOccupancy > 1 ? 's' : ''}
                              </div>

                              {/* Guest distribution (when selected) */}
                              {selected && (
                                <div className="mb-3">
                                  <div style={S.sectionLabel}>Guests in this room</div>
                                  <InputGroup size="sm" style={{ maxWidth: 160 }}>
                                    <Button
                                      variant="outline-secondary"
                                      style={{ borderRadius: '8px 0 0 8px' }}
                                      onClick={() => handleGuestDistributionChange(room._id, (guestDistribution[room._id] || 1) - 1)}
                                      disabled={(guestDistribution[room._id] || 0) <= 0}
                                    >−</Button>
                                    <Form.Control
                                      type="number"
                                      value={guestDistribution[room._id] || 0}
                                      onChange={(e) => handleGuestDistributionChange(room._id, e.target.value)}
                                      min="0"
                                      max={maxOccupancy}
                                      className="text-center"
                                      style={{ borderRadius: 0 }}
                                    />
                                    <Button
                                      variant="outline-secondary"
                                      style={{ borderRadius: '0 8px 8px 0' }}
                                      onClick={() => handleGuestDistributionChange(room._id, (guestDistribution[room._id] || 0) + 1)}
                                      disabled={(guestDistribution[room._id] || 0) >= maxOccupancy}
                                    >+</Button>
                                  </InputGroup>
                                  {(guestDistribution[room._id] || 0) > maxOccupancy && (
                                    <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>
                                      Exceeds max occupancy ({maxOccupancy})
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Pricing */}
                              <div className="mt-auto pt-2 border-top d-flex justify-content-between align-items-end">
                                <div>
                                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Per night</div>
                                  <div style={{ fontSize: 15, fontWeight: 700 }}>{cur} {room.current_price}</div>
                                </div>
                                {room.nights && (
                                  <div className="text-end">
                                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{room.nights} night{room.nights > 1 ? 's' : ''}</div>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary)' }}>{cur} {room.estimatedTotal}</div>
                                  </div>
                                )}
                              </div>

                              {/* CTA */}
                              <Button
                                variant={selected ? 'danger' : 'primary'}
                                className="w-100 mt-3 d-inline-flex align-items-center justify-content-center gap-2"
                                style={{ borderRadius: 10, fontWeight: 600 }}
                                onClick={() => handleSelectRoom(room)}
                              >
                                <CsLineIcons icon={selected ? 'close' : 'check'} size="14" />
                                {selected ? 'Remove' : 'Select Room'}
                              </Button>
                            </div>
                          </Col>
                        );
                      })}
                    </Row>

                    {/* Continue button */}
                    {selectedRooms.length > 0 && (
                      <div className="d-flex justify-content-end mt-4">
                        <Button variant="primary" size="lg" onClick={handleContinueToGuestDetails} style={{ borderRadius: 12, fontWeight: 700 }}>
                          Continue with {selectedRooms.length} Room{selectedRooms.length > 1 ? 's' : ''} →
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card.Body>
            </Card>
          )}

          {/* ════════════════ STEP 2 ════════════════ */}
          {step === 2 && selectedRooms.length > 0 && (
            <Row className="g-4">
              {/* Left: selected rooms summary */}
              <Col xs={12} lg={4} className="order-lg-2">
                <Card style={{ borderRadius: 16, position: 'sticky', top: 80 }}>
                  <Card.Header className="bg-primary text-white" style={{ borderRadius: '16px 16px 0 0' }}>
                    <h6 className="mb-0 d-flex align-items-center gap-2">
                      <CsLineIcons icon="bed" size="16" />
                      {selectedRooms.length} Room{selectedRooms.length > 1 ? 's' : ''} Selected
                    </h6>
                  </Card.Header>
                  <Card.Body className="p-0">
                    {selectedRooms.map((room, i) => (
                      <div key={room._id} style={{ padding: '12px 16px', borderBottom: i < selectedRooms.length - 1 ? '1px solid var(--separator)' : 'none' }}>
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <div className="fw-semibold">Room {room.room_number}</div>
                            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                              {getCategoryName(room.category_id)} · {guestDistribution[room._id] || 0} guest{(guestDistribution[room._id] || 0) !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <div className="fw-bold" style={{ fontSize: 15 }}>{cur} {room.estimatedTotal}</div>
                        </div>
                      </div>
                    ))}
                    <div style={{ padding: '12px 16px', background: 'rgba(var(--primary-rgb),.05)', borderTop: '2px solid var(--primary)' }}>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="fw-bold">Total</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                            {getTotalGuestsDistributed()} guests · {selectedRooms[0]?.nights} nights
                          </div>
                        </div>
                        <div className="fw-bold text-primary" style={{ fontSize: 18 }}>{cur} {getTotalPrice().toFixed(2)}</div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              {/* Right: guest form */}
              <Col xs={12} lg={8} className="order-lg-1">
                <Card style={{ borderRadius: 16 }}>
                  <Card.Header className="border-bottom pb-3">
                    <h5 className="mb-0 d-flex align-items-center gap-2">
                      <CsLineIcons icon="user" size="18" />
                      Guest Information
                    </h5>
                  </Card.Header>
                  <Card.Body>
                    <Form onSubmit={(e) => { e.preventDefault(); setStep(3); }}>
                      <Row className="g-3">
                        <Col xs={12}>
                          <Form.Label style={S.sectionLabel}>Full Name</Form.Label>
                          <Form.Control type="text" name="customer_name" value={guestData.customer_name} onChange={handleGuestChange} required placeholder="John Doe" style={{ borderRadius: 10 }} />
                        </Col>
                        <Col xs={12} sm={6}>
                          <Form.Label style={S.sectionLabel}>Email Address</Form.Label>
                          <Form.Control type="email" name="customer_email" value={guestData.customer_email} onChange={handleGuestChange} required placeholder="john@example.com" style={{ borderRadius: 10 }} />
                        </Col>
                        <Col xs={12} sm={6}>
                          <Form.Label style={S.sectionLabel}>Phone Number</Form.Label>
                          <Form.Control type="tel" name="customer_phone" value={guestData.customer_phone} onChange={handleGuestChange} required placeholder="+1234567890" style={{ borderRadius: 10 }} />
                        </Col>
                        <Col xs={12} sm={6}>
                          <Form.Label style={S.sectionLabel}>Booking Source</Form.Label>
                          <Form.Select name="booking_source" value={guestData.booking_source} onChange={handleGuestChange} style={{ borderRadius: 10 }}>
                            <option value="direct">Direct</option>
                            <option value="booking.com">Booking.com</option>
                            <option value="makemytrip">MakeMyTrip</option>
                            <option value="walk_in">Walk-in</option>
                          </Form.Select>
                        </Col>
                        <Col xs={12} sm={6}>
                          <Form.Label style={S.sectionLabel}>Payment Method</Form.Label>
                          <Form.Select name="payment_method" value={guestData.payment_method} onChange={handleGuestChange} style={{ borderRadius: 10 }}>
                            <option value="">Not paid yet</option>
                            <option value="cash">Cash</option>
                            <option value="card">Card</option>
                            <option value="upi">UPI</option>
                            <option value="online">Online</option>
                          </Form.Select>
                        </Col>
                        <Col xs={12} sm={6}>
                          <Form.Label style={S.sectionLabel}>Discount ({cur})</Form.Label>
                          <Form.Control type="number" name="discount_amount" value={guestData.discount_amount} onChange={handleGuestChange} min="0" step="0.01" style={{ borderRadius: 10 }} />
                        </Col>
                        <Col xs={12} sm={6}>
                          <Form.Label style={S.sectionLabel}>Coupon Code</Form.Label>
                          <Form.Control type="text" name="coupon_code" value={guestData.coupon_code} onChange={handleGuestChange} placeholder="SUMMER2026" style={{ borderRadius: 10 }} />
                        </Col>
                        <Col xs={12}>
                          <Form.Label style={S.sectionLabel}>Special Requests</Form.Label>
                          <Form.Control as="textarea" rows={3} name="special_requests" value={guestData.special_requests} onChange={handleGuestChange} placeholder="Any special requirements…" style={{ borderRadius: 10 }} />
                        </Col>
                      </Row>

                      <div className="d-flex justify-content-between mt-4 gap-2">
                        <Button variant="outline-secondary" onClick={handleBack} style={{ borderRadius: 10 }}>
                          ← Back
                        </Button>
                        <Button type="submit" variant="primary" style={{ borderRadius: 10, fontWeight: 600 }}>
                          Continue to Confirmation →
                        </Button>
                      </div>
                    </Form>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}

          {/* ════════════════ STEP 3 ════════════════ */}
          {step === 3 && selectedRooms.length > 0 && (
            <Row className="g-4">

              {/* Billing summary (right on desktop, bottom on mobile) */}
              <Col xs={12} lg={4} className="order-lg-2">
                <Card style={{ borderRadius: 16, position: 'sticky', top: 80 }}>
                  <Card.Header style={{ borderRadius: '16px 16px 0 0' }}>
                    <h6 className="mb-0">Billing Summary</h6>
                  </Card.Header>
                  <Card.Body className="p-0">
                    {selectedRooms.map((room, i) => (
                      <div key={room._id} style={S.confirmRow(false)}>
                        <div className="d-flex justify-content-between align-items-center">
                          <div style={{ fontSize: 13 }}>
                            <div className="fw-semibold">Room {room.room_number}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{room.nights} nights × {cur} {room.current_price}</div>
                          </div>
                          <div className="fw-bold">{cur} {room.estimatedTotal}</div>
                        </div>
                      </div>
                    ))}
                    {parseFloat(guestData.discount_amount) > 0 && (
                      <div style={S.confirmRow(false)}>
                        <div className="d-flex justify-content-between">
                          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Discount</span>
                          <span className="text-danger fw-bold">−{cur} {guestData.discount_amount}</span>
                        </div>
                      </div>
                    )}
                    <div style={{ padding: '14px 16px', background: 'rgba(var(--primary-rgb),.05)', borderTop: '2px solid var(--primary)' }}>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="fw-bold">Total</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                            {selectedRooms.length} room{selectedRooms.length > 1 ? 's' : ''} · {searchData.guests_count} guest{searchData.guests_count > 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="fw-bold text-primary" style={{ fontSize: 20 }}>
                          {cur} {(getTotalPrice() - parseFloat(guestData.discount_amount || 0)).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              {/* Confirmation details */}
              <Col xs={12} lg={8} className="order-lg-1">
                <Row className="g-3">
                  {/* Rooms */}
                  <Col xs={12}>
                    <Card style={{ borderRadius: 16 }}>
                      <Card.Header>
                        <h6 className="mb-0 d-flex align-items-center gap-2">
                          <CsLineIcons icon="bed" size="16" />
                          Room Details
                        </h6>
                      </Card.Header>
                      <Card.Body className="p-0">
                        {selectedRooms.map((room, i) => (
                          <div key={room._id} style={{ padding: '12px 16px', borderBottom: i < selectedRooms.length - 1 ? '1px solid var(--separator)' : 'none' }}>
                            <Row className="align-items-center g-2">
                              <Col xs={5}>
                                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Room {i + 1}</div>
                                <div className="fw-semibold">Room {room.room_number}</div>
                                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{getCategoryName(room.category_id)} · Floor {room.floor}</div>
                              </Col>
                              <Col xs={3}>
                                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Guests</div>
                                <div className="fw-semibold">{guestDistribution[room._id] || 0}</div>
                              </Col>
                              <Col xs={4} className="text-end">
                                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Amount</div>
                                <div className="fw-bold">{cur} {room.estimatedTotal}</div>
                              </Col>
                            </Row>
                          </div>
                        ))}
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* Dates + Guest side by side */}
                  <Col xs={12} sm={6}>
                    <Card style={{ borderRadius: 16, height: '100%' }}>
                      <Card.Header>
                        <h6 className="mb-0 d-flex align-items-center gap-2">
                          <CsLineIcons icon="calendar" size="16" />
                          Dates
                        </h6>
                      </Card.Header>
                      <Card.Body>
                        {[
                          ['Check-In', new Date(searchData.check_in_date).toLocaleDateString()],
                          ['Check-Out', new Date(searchData.check_out_date).toLocaleDateString()],
                          ['Nights', selectedRooms[0]?.nights],
                          ['Total Guests', searchData.guests_count],
                        ].map(([label, val]) => (
                          <div key={label} className="mb-3">
                            <div style={S.sectionLabel}>{label}</div>
                            <div className="fw-semibold">{val}</div>
                          </div>
                        ))}
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col xs={12} sm={6}>
                    <Card style={{ borderRadius: 16, height: '100%' }}>
                      <Card.Header>
                        <h6 className="mb-0 d-flex align-items-center gap-2">
                          <CsLineIcons icon="user" size="16" />
                          Guest
                        </h6>
                      </Card.Header>
                      <Card.Body>
                        {[
                          ['Name', guestData.customer_name],
                          ['Email', guestData.customer_email],
                          ['Phone', guestData.customer_phone],
                          ['Source', guestData.booking_source],
                        ].map(([label, val]) => (
                          <div key={label} className="mb-3">
                            <div style={S.sectionLabel}>{label}</div>
                            <div className="fw-semibold">{val}</div>
                          </div>
                        ))}
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                <div className="d-flex justify-content-between mt-4 gap-2">
                  <Button variant="outline-secondary" onClick={handleBack} style={{ borderRadius: 10 }}>
                    ← Back
                  </Button>
                  <Button variant="primary" size="lg" onClick={handleConfirmBooking} disabled={loading} style={{ borderRadius: 12, fontWeight: 700, minWidth: 220 }}>
                    {loading
                      ? <><Spinner as="span" animation="border" size="sm" className="me-2" />Creating…</>
                      : `Confirm Booking (${selectedRooms.length} room${selectedRooms.length > 1 ? 's' : ''})`}
                  </Button>
                </div>
              </Col>
            </Row>
          )}

        </Col>
      </Row>
    </>
  );
};

export default NewBooking;