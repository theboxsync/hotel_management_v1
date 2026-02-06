import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { Card, Row, Col, Button, Form, Badge, Spinner, Alert, ProgressBar, InputGroup } from 'react-bootstrap';
import { bookingAPI, roomAPI, roomCategoryAPI } from 'services/api';
import { toast } from 'react-toastify';
import HtmlHead from 'components/html-head/HtmlHead';
import BreadcrumbList from 'components/breadcrumb-list/BreadcrumbList';
import CsLineIcons from 'cs-line-icons/CsLineIcons';

const NewBooking = () => {
  const history = useHistory();
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState([]); // Multiple rooms
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

  // Guest distribution per room
  const [guestDistribution, setGuestDistribution] = useState({});

  const title = 'New Booking';
  const description = 'Create a new room booking';

  const breadcrumbs = [
    { to: '/operations', text: 'Operations' },
    { to: '/operations/bookings', text: 'Bookings' },
    { to: '/operations/new-booking', text: 'New Booking' },
  ];

  const fetchCategories = async () => {
    try {
      const response = await roomCategoryAPI.getAll();
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to fetch room categories');
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSearchChange = (e) => {
    setSearchData({
      ...searchData,
      [e.target.name]: e.target.value,
    });
  };

  const handleGuestChange = (e) => {
    setGuestData({
      ...guestData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSearchRooms = async (e) => {
    e.preventDefault();

    if (!searchData.check_in_date || !searchData.check_out_date) {
      toast.error('Please select check-in and check-out dates');
      return;
    }

    setSearching(true);
    try {
      const response = await roomAPI.getAll({ status: 'available' });
      const rooms = response.data.data || [];

      const roomsWithAvailability = await Promise.all(
        rooms.map(async (room) => {
          try {
            const availResponse = await bookingAPI.checkAvailability({
              room_id: room._id,
              check_in_date: searchData.check_in_date,
              check_out_date: searchData.check_out_date,
            });
            return {
              ...room,
              available: availResponse.data.available,
              nights: availResponse.data.data?.nights,
              estimatedTotal: availResponse.data.data?.estimated_total,
            };
          } catch (error) {
            return { ...room, available: false };
          }
        })
      );

      const availRooms = roomsWithAvailability.filter((r) => r.available);
      setAvailableRooms(availRooms);

      if (availRooms.length === 0) {
        toast.warning('No rooms available for selected dates');
      } else {
        toast.success(`Found ${availRooms.length} available rooms`);
      }
    } catch (error) {
      console.error('Error searching rooms:', error);
      toast.error('Failed to search rooms');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectRoom = (room) => {
    const isSelected = selectedRooms.find(r => r._id === room._id);

    if (isSelected) {
      // Remove room
      setSelectedRooms(selectedRooms.filter(r => r._id !== room._id));
      const newDistribution = { ...guestDistribution };
      delete newDistribution[room._id];
      setGuestDistribution(newDistribution);
    } else {
      // Add room
      setSelectedRooms([...selectedRooms, room]);
      setGuestDistribution({
        ...guestDistribution,
        [room._id]: 1, // Default 1 guest per room
      });
    }
  };

  const handleGuestDistributionChange = (roomId, value) => {
    const newValue = Number(value) || 0;
    setGuestDistribution({
      ...guestDistribution,
      [roomId]: newValue,
    });
  };

  const getTotalGuestsDistributed = () => {
    return Object.values(guestDistribution).reduce((sum, count) => sum + count, 0);
  };

  const getTotalMaxOccupancy = () => {
    return selectedRooms.reduce((sum, room) => {
      const category = categories.find(c => c._id === room.category_id);
      return sum + (category?.max_occupancy || 2);
    }, 0);
  };

  const getTotalPrice = () => {
    return selectedRooms.reduce((sum, room) => sum + (room.estimatedTotal || 0), 0);
  };

  const handleContinueToGuestDetails = () => {
    if (selectedRooms.length === 0) {
      toast.error('Please select at least one room');
      return;
    }

    const totalDistributed = getTotalGuestsDistributed();
    const totalGuests = Number(searchData.guests_count);

    if (totalDistributed !== totalGuests) {
      toast.error(`Please distribute all ${totalGuests} guests across selected rooms (currently distributed: ${totalDistributed})`);
      return;
    }

    const maxOccupancy = getTotalMaxOccupancy();
    if (totalGuests > maxOccupancy) {
      toast.error(`Total guests (${totalGuests}) exceed maximum capacity (${maxOccupancy}). Please select more rooms.`);
      return;
    }

    setStep(2);
  };

  const handleGuestDetailsSubmit = (e) => {
    e.preventDefault();
    setStep(3);
  };

  const handleConfirmBooking = async () => {
    setLoading(true);

    const room_breakdown = selectedRooms.map(room => ({
      room_id: room._id,
      guests_in_room: guestDistribution[room._id] || 0,
    }));

    const bookingData = {
      room_ids: selectedRooms.map(r => r._id),
      room_breakdown,
      check_in_date: searchData.check_in_date,
      check_out_date: searchData.check_out_date,
      guests_count: parseInt(searchData.guests_count, 10),
      ...guestData,
      discount_amount: parseFloat(guestData.discount_amount) || 0,
    };

    try {
      await bookingAPI.create(bookingData);
      toast.success(`Booking created successfully for ${selectedRooms.length} room(s)!`);
      history.push('/operations/bookings');
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error(error.response?.data?.message || 'Failed to create booking');
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      history.push('/operations/bookings');
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find((c) => c._id === categoryId);
    return category?.category_name || 'Unknown';
  };

  const getCategoryMaxOccupancy = (categoryId) => {
    const category = categories.find((c) => c._id === categoryId);
    return category?.max_occupancy || 0;
  };

  const isRoomSelected = (roomId) => {
    return selectedRooms.find(r => r._id === roomId) !== undefined;
  };

  const steps = [
    { number: 1, label: 'Select Room(s)' },
    { number: 2, label: 'Guest Details' },
    { number: 3, label: 'Confirmation' },
  ];

  return (
    <>
      <HtmlHead title={title} description={description} />
      <Row>
        <Col>
          <div className="page-title-container mb-4">
            <Row className="align-items-center">
              <Col xs="12" md="7">
                <h1 className="mb-0 pb-0 display-4">{title}</h1>
                <BreadcrumbList items={breadcrumbs} />
              </Col>
              <Col xs="12" md="5" className="text-end">
                <Button variant="outline-secondary" onClick={handleBack}>
                  <CsLineIcons icon="arrow-left" className="me-2" />
                  Back
                </Button>
              </Col>
            </Row>
          </div>

          {/* Progress Steps */}
          <Card className="mb-4">
            <Card.Body>
              <div className="d-flex justify-content-around align-items-center mb-3">
                {steps.map((stepItem) => (
                  <div key={stepItem.number} className="d-flex flex-column align-items-center">
                    <div
                      className={`rounded-circle sh-4 sw-4 d-flex align-items-center justify-content-center mb-2 ${step >= stepItem.number ? 'bg-primary text-white' : 'bg-light text-muted'
                        }`}
                    >
                      {stepItem.number}
                    </div>
                    <span className={`text-small ${step >= stepItem.number ? 'text-primary' : 'text-muted'}`}>{stepItem.label}</span>
                  </div>
                ))}
              </div>
              <ProgressBar now={(step / 3) * 100} style={{ height: '4px' }} />
            </Card.Body>
          </Card>

          {/* Step 1: Room Selection */}
          {step === 1 && (
            <Card>
              <Card.Header>
                <h5 className="mb-0">Search Available Rooms</h5>
              </Card.Header>
              <Card.Body>
                <Form onSubmit={handleSearchRooms}>
                  <Row className="g-3 mb-4">
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Check-In Date</Form.Label>
                        <Form.Control
                          type="date"
                          name="check_in_date"
                          value={searchData.check_in_date}
                          onChange={handleSearchChange}
                          required
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Check-Out Date</Form.Label>
                        <Form.Control
                          type="date"
                          name="check_out_date"
                          value={searchData.check_out_date}
                          onChange={handleSearchChange}
                          required
                          min={searchData.check_in_date || new Date().toISOString().split('T')[0]}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Total Guests</Form.Label>
                        <Form.Control
                          type="number"
                          name="guests_count"
                          value={searchData.guests_count}
                          onChange={handleSearchChange}
                          required
                          min="1"
                        />
                        <Form.Text className="text-muted">
                          Select multiple rooms for large groups
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                  <div className="d-flex justify-content-end">
                    <Button type="submit" variant="primary" disabled={searching}>
                      {searching ? (
                        <>
                          <Spinner as="span" animation="border" size="sm" className="me-2" />
                          Searching...
                        </>
                      ) : (
                        'Search Rooms'
                      )}
                    </Button>
                  </div>
                </Form>

                {/* Selected Rooms Summary */}
                {selectedRooms.length > 0 && (
                  <Alert variant="info" className="mt-4">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <strong>
                        <CsLineIcons icon="check-circle" className="me-2" />
                        {selectedRooms.length} Room(s) Selected
                      </strong>
                      <Badge bg="primary">{getTotalGuestsDistributed()} / {searchData.guests_count} Guests Assigned</Badge>
                    </div>
                    <small className="text-muted">
                      Max capacity: {getTotalMaxOccupancy()} guests • Total: {process.env.REACT_APP_CURRENCY} {getTotalPrice().toFixed(2)}
                    </small>
                  </Alert>
                )}

                {availableRooms.length > 0 && (
                  <div className="mt-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="mb-0">Available Rooms ({availableRooms.length})</h5>
                      {selectedRooms.length > 0 && (
                        <Button variant="primary" onClick={handleContinueToGuestDetails}>
                          Continue with {selectedRooms.length} Room(s)
                        </Button>
                      )}
                    </div>
                    <Row className="g-3">
                      {availableRooms.map((room) => {
                        const selected = isRoomSelected(room._id);
                        const maxOccupancy = getCategoryMaxOccupancy(room.category_id);

                        return (
                          <Col key={room._id} md={6} lg={4}>
                            <Card className={`h-100 ${selected ? 'border-primary' : 'hover-border-primary'}`}>
                              <Card.Body>
                                <div className="d-flex justify-content-between align-items-start mb-3">
                                  <div>
                                    <h6 className="mb-1">
                                      <CsLineIcons icon="bed" className="me-2" />
                                      Room {room.room_number}
                                    </h6>
                                    <small className="text-muted">
                                      Floor {room.floor} • {getCategoryName(room.category_id)}
                                    </small>
                                    <div className="mt-1">
                                      <small className="text-muted">
                                        <CsLineIcons icon="user" size="12" className="me-1" />
                                        Max {maxOccupancy} guests
                                      </small>
                                    </div>
                                  </div>
                                  <Badge bg={selected ? 'primary' : 'success'} className="d-flex align-items-center">
                                    <CsLineIcons icon={selected ? 'check' : 'check-circle'} className="me-1" size="12" />
                                    {selected ? 'Selected' : 'Available'}
                                  </Badge>
                                </div>

                                {/* Guest Count Input for Selected Rooms */}
                                {selected && (
                                  <div className="mb-3">
                                    <Form.Label className="text-small">Guests in this room</Form.Label>
                                    <InputGroup size="sm">
                                      <Button
                                        variant="outline-secondary"
                                        onClick={() => handleGuestDistributionChange(room._id, (guestDistribution[room._id] || 1) - 1)}
                                        disabled={guestDistribution[room._id] <= 0}
                                      >
                                        -
                                      </Button>
                                      <Form.Control
                                        type="number"
                                        value={guestDistribution[room._id] || 0}
                                        onChange={(e) => handleGuestDistributionChange(room._id, e.target.value)}
                                        min="0"
                                        max={maxOccupancy}
                                        className="text-center"
                                      />
                                      <Button
                                        variant="outline-secondary"
                                        onClick={() => handleGuestDistributionChange(room._id, (guestDistribution[room._id] || 0) + 1)}
                                        disabled={guestDistribution[room._id] >= maxOccupancy}
                                      >
                                        +
                                      </Button>
                                    </InputGroup>
                                    {guestDistribution[room._id] > maxOccupancy && (
                                      <Form.Text className="text-danger">
                                        Exceeds max occupancy ({maxOccupancy})
                                      </Form.Text>
                                    )}
                                  </div>
                                )}

                                <div className="mb-3">
                                  <div className="d-flex justify-content-between mb-1">
                                    <small className="text-muted">Price per night</small>
                                    <small className="fw-bold">{process.env.REACT_APP_CURRENCY} {room.current_price}</small>
                                  </div>
                                  {room.nights && (
                                    <div className="d-flex justify-content-between">
                                      <small className="text-muted">
                                        Total ({room.nights} {room.nights === 1 ? 'night' : 'nights'})
                                      </small>
                                      <small className="fw-bold text-primary">{process.env.REACT_APP_CURRENCY} {room.estimatedTotal}</small>
                                    </div>
                                  )}
                                </div>
                                <Button
                                  variant={selected ? 'danger' : 'primary'}
                                  className="w-100"
                                  onClick={() => handleSelectRoom(room)}
                                >
                                  <CsLineIcons icon={selected ? 'close' : 'check'} className="me-2" />
                                  {selected ? 'Remove Room' : 'Select Room'}
                                </Button>
                              </Card.Body>
                            </Card>
                          </Col>
                        );
                      })}
                    </Row>
                  </div>
                )}
              </Card.Body>
            </Card>
          )}

          {/* Step 2: Guest Details - Same as before */}
          {step === 2 && selectedRooms.length > 0 && (
            <Card>
              <Card.Header>
                <h5 className="mb-0">Guest Information</h5>
              </Card.Header>
              <Card.Body>
                {/* Selected Rooms Summary */}
                <Card className="mb-4 border-primary">
                  <Card.Header className="bg-primary text-white">
                    <h6 className="mb-0">
                      <CsLineIcons icon="bed" className="me-2" />
                      {selectedRooms.length} Room(s) Selected
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    {selectedRooms.map((room, index) => (
                      <div key={room._id} className={`d-flex justify-content-between align-items-center ${index < selectedRooms.length - 1 ? 'mb-2 pb-2 border-bottom' : ''}`}>
                        <div>
                          <div className="fw-bold">Room {room.room_number}</div>
                          <small className="text-muted">
                            {getCategoryName(room.category_id)} • Floor {room.floor} • {guestDistribution[room._id] || 0} guests
                          </small>
                        </div>
                        <div className="text-end">
                          <div className="text-muted small">Price</div>
                          <div className="fw-bold">{process.env.REACT_APP_CURRENCY} {room.estimatedTotal}</div>
                        </div>
                      </div>
                    ))}
                    <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                      <div>
                        <strong>Total</strong>
                        <div className="text-small text-muted">{getTotalGuestsDistributed()} guests • {selectedRooms[0]?.nights} nights</div>
                      </div>
                      <h5 className="mb-0 text-primary">{process.env.REACT_APP_CURRENCY} {getTotalPrice().toFixed(2)}</h5>
                    </div>
                  </Card.Body>
                </Card>

                <Form onSubmit={handleGuestDetailsSubmit}>
                  <Row className="g-3">
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label>Full Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="customer_name"
                          value={guestData.customer_name}
                          onChange={handleGuestChange}
                          required
                          placeholder="John Doe"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Email Address</Form.Label>
                        <Form.Control
                          type="email"
                          name="customer_email"
                          value={guestData.customer_email}
                          onChange={handleGuestChange}
                          required
                          placeholder="john@example.com"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Phone Number</Form.Label>
                        <Form.Control
                          type="tel"
                          name="customer_phone"
                          value={guestData.customer_phone}
                          onChange={handleGuestChange}
                          required
                          placeholder="+1234567890"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Booking Source</Form.Label>
                        <Form.Select name="booking_source" value={guestData.booking_source} onChange={handleGuestChange}>
                          <option value="direct">Direct</option>
                          <option value="booking.com">Booking.com</option>
                          <option value="makemytrip">MakeMyTrip</option>
                          <option value="walk_in">Walk-in</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Payment Method</Form.Label>
                        <Form.Select name="payment_method" value={guestData.payment_method} onChange={handleGuestChange}>
                          <option value="">Not paid yet</option>
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="upi">UPI</option>
                          <option value="online">Online</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Discount Amount ({process.env.REACT_APP_CURRENCY})</Form.Label>
                        <Form.Control
                          type="number"
                          name="discount_amount"
                          value={guestData.discount_amount}
                          onChange={handleGuestChange}
                          min="0"
                          step="0.01"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Coupon Code</Form.Label>
                        <Form.Control
                          type="text"
                          name="coupon_code"
                          value={guestData.coupon_code}
                          onChange={handleGuestChange}
                          placeholder="SUMMER2026"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label>Special Requests</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          name="special_requests"
                          value={guestData.special_requests}
                          onChange={handleGuestChange}
                          placeholder="Any special requirements..."
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <div className="d-flex justify-content-between mt-4">
                    <Button variant="outline-secondary" onClick={handleBack}>
                      Back
                    </Button>
                    <Button type="submit" variant="primary">
                      Continue to Confirmation
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          )}

          {/* Step 3: Confirmation - Updated for multi-room */}
          {step === 3 && selectedRooms.length > 0 && (
            <Card>
              <Card.Header>
                <h5 className="mb-0">Confirm Booking</h5>
              </Card.Header>
              <Card.Body>
                <Row className="g-4">
                  <Col md={12}>
                    <Card>
                      <Card.Header>
                        <h6 className="mb-0">Room Details ({selectedRooms.length} rooms)</h6>
                      </Card.Header>
                      <Card.Body>
                        {selectedRooms.map((room, index) => (
                          <div key={room._id} className={`${index < selectedRooms.length - 1 ? 'mb-3 pb-3 border-bottom' : ''}`}>
                            <Row>
                              <Col md={6}>
                                <small className="text-muted d-block">Room {index + 1}</small>
                                <div className="fw-bold">Room {room.room_number}</div>
                                <div className="text-small">{getCategoryName(room.category_id)} • Floor {room.floor}</div>
                              </Col>
                              <Col md={3}>
                                <small className="text-muted d-block">Guests</small>
                                <div>{guestDistribution[room._id] || 0}</div>
                              </Col>
                              <Col md={3}>
                                <small className="text-muted d-block">Price</small>
                                <div className="fw-bold">{process.env.REACT_APP_CURRENCY} {room.estimatedTotal}</div>
                              </Col>
                            </Row>
                          </div>
                        ))}
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col md={6}>
                    <Card>
                      <Card.Header>
                        <h6 className="mb-0">Booking Dates</h6>
                      </Card.Header>
                      <Card.Body>
                        <div className="mb-3">
                          <small className="text-muted d-block">Check-In</small>
                          <div className="fw-bold">{new Date(searchData.check_in_date).toLocaleDateString()}</div>
                        </div>
                        <div className="mb-3">
                          <small className="text-muted d-block">Check-Out</small>
                          <div className="fw-bold">{new Date(searchData.check_out_date).toLocaleDateString()}</div>
                        </div>
                        <div className="mb-3">
                          <small className="text-muted d-block">Nights</small>
                          <div>{selectedRooms[0]?.nights}</div>
                        </div>
                        <div>
                          <small className="text-muted d-block">Total Guests</small>
                          <div>{searchData.guests_count}</div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col md={6}>
                    <Card>
                      <Card.Header>
                        <h6 className="mb-0">Guest Information</h6>
                      </Card.Header>
                      <Card.Body>
                        <div className="mb-3">
                          <small className="text-muted d-block">Name</small>
                          <div className="fw-bold">{guestData.customer_name}</div>
                        </div>
                        <div className="mb-3">
                          <small className="text-muted d-block">Email</small>
                          <div>{guestData.customer_email}</div>
                        </div>
                        <div className="mb-3">
                          <small className="text-muted d-block">Phone</small>
                          <div>{guestData.customer_phone}</div>
                        </div>
                        <div>
                          <small className="text-muted d-block">Source</small>
                          <div>{guestData.booking_source}</div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col md={12}>
                    <Card className="border-primary">
                      <Card.Header>
                        <h6 className="mb-0">Billing Summary</h6>
                      </Card.Header>
                      <Card.Body>
                        <div className="border rounded">
                          {selectedRooms.map((room, index) => (
                            <div key={room._id} className="p-3 border-bottom">
                              <Row className="g-0">
                                <Col>
                                  <small className="text-muted">
                                    Room {room.room_number} ({room.nights} nights × {process.env.REACT_APP_CURRENCY} {room.current_price})
                                  </small>
                                </Col>
                                <Col xs="auto" className="fw-bold">
                                  {process.env.REACT_APP_CURRENCY} {room.estimatedTotal}
                                </Col>
                              </Row>
                            </div>
                          ))}

                          {parseFloat(guestData.discount_amount) > 0 && (
                            <div className="p-3 border-bottom">
                              <Row className="g-0">
                                <Col>
                                  <small className="text-muted">Discount</small>
                                </Col>
                                <Col xs="auto" className="text-danger fw-bold">
                                  -{process.env.REACT_APP_CURRENCY} {guestData.discount_amount}
                                </Col>
                              </Row>
                            </div>
                          )}

                          <div className="p-3 bg-light">
                            <Row className="g-0">
                              <Col>
                                <h6 className="mb-0">Total Amount</h6>
                                <small className="text-muted">{selectedRooms.length} room(s) • {searchData.guests_count} guest(s)</small>
                              </Col>
                              <Col xs="auto">
                                <h6 className="mb-0 text-primary">
                                  {process.env.REACT_APP_CURRENCY} {(getTotalPrice() - parseFloat(guestData.discount_amount || 0)).toFixed(2)}
                                </h6>
                              </Col>
                            </Row>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                <div className="d-flex justify-content-between mt-4">
                  <Button variant="outline-secondary" onClick={handleBack}>
                    Back
                  </Button>
                  <Button variant="primary" size="lg" onClick={handleConfirmBooking} disabled={loading}>
                    {loading ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" className="me-2" />
                        Creating...
                      </>
                    ) : (
                      `Confirm Booking (${selectedRooms.length} room${selectedRooms.length > 1 ? 's' : ''})`
                    )}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </>
  );
};

export default NewBooking;