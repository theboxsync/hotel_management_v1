import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { Card, Row, Col, Button, Form, Badge, Modal, Spinner, Alert, ProgressBar } from 'react-bootstrap';
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
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [guestDistribution, setGuestDistribution] = useState({});

  const [searchData, setSearchData] = useState({
    check_in_date: '',
    check_out_date: '',
    total_guests: 1,
    rooms_count: 1,
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
              max_occupancy: categories.find(c => c._id === room.category_id)?.max_occupancy || 2,
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
    // Check if room is already selected
    const isAlreadySelected = selectedRooms.some(r => r._id === room._id);

    if (isAlreadySelected) {
      // Remove room if already selected
      setSelectedRooms(selectedRooms.filter(r => r._id !== room._id));
    } else {
      // Check if we need more rooms
      if (selectedRooms.length >= searchData.rooms_count) {
        toast.warning(`You selected to book ${searchData.rooms_count} room(s). Remove a room first or increase room count.`);
        return;
      }

      // Add room to selection
      setSelectedRooms([...selectedRooms, room]);
      toast.success(`Room ${room.room_number} added`);
    }
  };

  const handleGuestDistributionChange = (roomId, guestCount) => {
    setGuestDistribution({
      ...guestDistribution,
      [roomId]: parseInt(guestCount, 10) || 0,
    });
  };

  const handleGuestDetailsSubmit = (e) => {
    e.preventDefault();
    setStep(3);
  };

  const handleConfirmBooking = async () => {
    setLoading(true);

    // Calculate total guests from distribution
    const distributedGuests = Object.values(guestDistribution).reduce((sum, count) => sum + count, 0);

    if (distributedGuests !== parseInt(searchData.total_guests, 10)) {
      toast.error(`Guest distribution mismatch. Total: ${distributedGuests}, Required: ${searchData.total_guests}`);
      setLoading(false);
      return;
    }

    const bookingData = {
      room_ids: selectedRooms.map(room => room._id),
      ...searchData,
      guests_count: parseInt(searchData.total_guests, 10),
      ...guestData,
      discount_amount: parseFloat(guestData.discount_amount) || 0,
      split_guests: guestDistribution, // Send guest distribution
    };

    try {
      await bookingAPI.create(bookingData);
      toast.success('Booking created successfully!');
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

  const steps = [
    { number: 1, label: 'Select Room' },
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
                    <Col md={3}>
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
                    <Col md={3}>
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
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>Total Guests</Form.Label>
                        <Form.Control
                          type="number"
                          name="total_guests"
                          value={searchData.total_guests}
                          onChange={handleSearchChange}
                          required
                          min="1"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>Number of Rooms Needed</Form.Label>
                        <Form.Control
                          type="number"
                          name="rooms_count"
                          value={searchData.rooms_count}
                          onChange={handleSearchChange}
                          required
                          min="1"
                          max="10"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <div className="d-flex justify-content-between align-items-center">
                    {selectedRooms.length > 0 && (
                      <div className="text-primary">
                        <CsLineIcons icon="check-circle" className="me-2" />
                        {selectedRooms.length} room(s) selected
                      </div>
                    )}
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

                {selectedRooms.length > 0 && (
                  <Card className="mt-4 border-primary">
                    <Card.Header className="bg-primary text-white">
                      <h6 className="mb-0">Selected Rooms ({selectedRooms.length})</h6>
                    </Card.Header>
                    <Card.Body>
                      <Row className="g-2">
                        {selectedRooms.map((room) => (
                          <Col key={room._id} md={6}>
                            <div className="d-flex justify-content-between align-items-center p-2 border rounded">
                              <div>
                                <strong>Room {room.room_number}</strong>
                                <div className="text-muted small">
                                  {getCategoryName(room.category_id)} • Floor {room.floor}
                                </div>
                              </div>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleSelectRoom(room)}
                              >
                                <CsLineIcons icon="trash" />
                              </Button>
                            </div>
                          </Col>
                        ))}
                      </Row>
                    </Card.Body>
                  </Card>
                )}

                {availableRooms.length > 0 && (
                  <div className="mt-4">
                    <h5 className="mb-3">Available Rooms ({availableRooms.length})</h5>
                    <Alert variant="info" className="mb-3">
                      Select up to {searchData.rooms_count} room(s) for {searchData.total_guests} guest(s)
                    </Alert>
                    <Row className="g-3">
                      {availableRooms.map((room) => {
                        const isSelected = selectedRooms.some(r => r._id === room._id);
                        return (
                          <Col key={room._id} md={6} lg={4}>
                            <Card className={`h-100 ${isSelected ? 'border-primary border-2' : 'hover-border-primary'}`}>
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
                                  </div>
                                  <div>
                                    {isSelected ? (
                                      <Badge bg="primary" className="d-flex align-items-center">
                                        <CsLineIcons icon="check" className="me-1" size="12" />
                                        Selected
                                      </Badge>
                                    ) : (
                                      <Badge bg="success" className="d-flex align-items-center">
                                        <CsLineIcons icon="check" className="me-1" size="12" />
                                        Available
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="mb-3">
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <small className="text-muted">Max Occupancy</small>
                                    <small className="font-weight-bold">{room.max_occupancy} guests</small>
                                  </div>
                                  <div className="d-flex justify-content-between mb-1">
                                    <small className="text-muted">Price per night</small>
                                    <small className="font-weight-bold">{process.env.REACT_APP_CURRENCY} {room.current_price}</small>
                                  </div>
                                  {room.nights && (
                                    <div className="d-flex justify-content-between">
                                      <small className="text-muted">
                                        Total ({room.nights} {room.nights === 1 ? 'night' : 'nights'})
                                      </small>
                                      <small className="font-weight-bold text-primary">{process.env.REACT_APP_CURRENCY} {room.estimatedTotal}</small>
                                    </div>
                                  )}
                                </div>
                                <Button
                                  variant={isSelected ? "outline-primary" : "primary"}
                                  className="w-100"
                                  onClick={() => handleSelectRoom(room)}
                                  disabled={!isSelected && selectedRooms.length >= searchData.rooms_count}
                                >
                                  <CsLineIcons icon={isSelected ? "trash" : "check"} className="me-2" />
                                  {isSelected ? 'Remove' : 'Select Room'}
                                </Button>
                              </Card.Body>
                            </Card>
                          </Col>
                        );
                      })}
                    </Row>
                  </div>
                )}

                {selectedRooms.length > 0 && (
                  <div className="d-flex justify-content-end mt-4">
                    <Button
                      variant="primary"
                      onClick={() => setStep(2)}
                      disabled={selectedRooms.length !== parseInt(searchData.rooms_count, 10)}
                    >
                      Continue with {selectedRooms.length} Room(s)
                      <CsLineIcons icon="arrow-right" className="ms-2" />
                    </Button>
                  </div>
                )}
              </Card.Body>
            </Card>
          )}

          {/* Step 2: Guest Details */}
          {step === 2 && selectedRooms && (
            <Card>
              <Card.Header>
                <h5 className="mb-0">Guest Information</h5>
              </Card.Header>
              <Card.Body>
                <Card className="mb-4">
                  <Card.Body>
                    <h6 className="mb-3">Selected Rooms ({selectedRooms.length})</h6>
                    <Row className="g-3">
                      {selectedRooms.map((room) => (
                        <Col key={room._id} md={6}>
                          <div className="border rounded p-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <div>
                                <strong>Room {room.room_number}</strong>
                                <div className="text-muted small">
                                  {getCategoryName(room.category_id)} • Floor {room.floor}
                                </div>
                              </div>
                              <div className="text-end">
                                <div className="font-weight-bold">{process.env.REACT_APP_CURRENCY} {room.current_price}/night</div>
                                <div className="text-primary small">{process.env.REACT_APP_CURRENCY} {room.estimatedTotal} total</div>
                              </div>
                            </div>
                            <Form.Group>
                              <Form.Label>Guests in this room</Form.Label>
                              <Form.Control
                                type="number"
                                min="1"
                                max={room.max_occupancy}
                                value={guestDistribution[room._id] || 1}
                                onChange={(e) => handleGuestDistributionChange(room._id, e.target.value)}
                                placeholder={`Max: ${room.max_occupancy}`}
                              />
                            </Form.Group>
                          </div>
                        </Col>
                      ))}
                    </Row>
                    <div className="mt-3 text-end">
                      <small className="text-muted">
                        Total guests: {Object.values(guestDistribution).reduce((sum, count) => sum + count, 0)} / {searchData.total_guests}
                      </small>
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
                        <Form.Label>Discount Amount ({process.env.REACT_APP_CURRENCY} )</Form.Label>
                        <Form.Control type="number" name="discount_amount" value={guestData.discount_amount} onChange={handleGuestChange} min="0" step="0.01" />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Coupon Code</Form.Label>
                        <Form.Control type="text" name="coupon_code" value={guestData.coupon_code} onChange={handleGuestChange} placeholder="SUMMER2026" />
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
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={Object.values(guestDistribution).reduce((sum, count) => sum + count, 0) !== parseInt(searchData.total_guests, 10)}
                    >
                      Continue to Confirmation
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          )}

          {/* Step 3: Confirmation */}
          {/* Step 3: Confirmation */}
          {step === 3 && selectedRooms.length > 0 && (
            <Card>
              <Card.Header>
                <h5 className="mb-0">Confirm Booking</h5>
              </Card.Header>
              <Card.Body>
                <Alert variant="info" className="mb-4">
                  <CsLineIcons icon="info" className="me-2" />
                  Please review all booking details before confirming. This booking includes {selectedRooms.length} room(s) for {searchData.total_guests} guest(s).
                </Alert>

                <Row className="g-4">
                  {/* Rooms Summary Card */}
                  <Col md={12}>
                    <Card className="mb-4">
                      <Card.Header>
                        <h6 className="mb-0">Selected Rooms ({selectedRooms.length})</h6>
                      </Card.Header>
                      <Card.Body>
                        <Row className="g-3">
                          {selectedRooms.map((room, index) => (
                            <Col key={room._id} md={selectedRooms.length === 1 ? 12 : 6} lg={selectedRooms.length === 1 ? 12 : 4}>
                              <Card className="h-100 border">
                                <Card.Body>
                                  <div className="d-flex align-items-center mb-3">
                                    <div className="bg-gradient-primary sh-4 sw-4 rounded-xl d-flex justify-content-center align-items-center me-3">
                                      <span className="text-white small font-weight-bold">{index + 1}</span>
                                    </div>
                                    <div>
                                      <h6 className="mb-0">Room {room.room_number}</h6>
                                      <small className="text-muted">{getCategoryName(room.category_id)}</small>
                                    </div>
                                  </div>

                                  <div className="d-flex justify-content-between mb-2">
                                    <small className="text-muted">Floor</small>
                                    <small>{room.floor}</small>
                                  </div>

                                  <div className="d-flex justify-content-between mb-2">
                                    <small className="text-muted">Guests in this room</small>
                                    <small className="font-weight-bold">{guestDistribution[room._id] || 1} guest(s)</small>
                                  </div>

                                  <div className="d-flex justify-content-between mb-2">
                                    <small className="text-muted">Max occupancy</small>
                                    <small>{room.max_occupancy} guest(s)</small>
                                  </div>

                                  <div className="d-flex justify-content-between mb-2">
                                    <small className="text-muted">Price per night</small>
                                    <small>{process.env.REACT_APP_CURRENCY} {room.current_price.toFixed(2)}</small>
                                  </div>

                                  <div className="d-flex justify-content-between mt-3 pt-3 border-top">
                                    <small className="text-muted">Room total ({room.nights} nights)</small>
                                    <small className="font-weight-bold text-primary">
                                      {process.env.REACT_APP_CURRENCY} {room.estimatedTotal.toFixed(2)}
                                    </small>
                                  </div>
                                </Card.Body>
                              </Card>
                            </Col>
                          ))}
                        </Row>
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* Booking Dates Card */}
                  <Col md={6}>
                    <Card>
                      <Card.Header>
                        <h6 className="mb-0">Booking Dates</h6>
                      </Card.Header>
                      <Card.Body>
                        <div className="d-flex align-items-center mb-3">
                          <div className="bg-light rounded p-2 me-3">
                            <CsLineIcons icon="calendar" className="text-primary" />
                          </div>
                          <div>
                            <small className="text-muted d-block">Check-In</small>
                            <div className="font-weight-bold">{new Date(searchData.check_in_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</div>
                          </div>
                        </div>

                        <div className="d-flex align-items-center mb-3">
                          <div className="bg-light rounded p-2 me-3">
                            <CsLineIcons icon="calendar" className="text-primary" />
                          </div>
                          <div>
                            <small className="text-muted d-block">Check-Out</small>
                            <div className="font-weight-bold">{new Date(searchData.check_out_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</div>
                          </div>
                        </div>

                        <div className="d-flex justify-content-between">
                          <div>
                            <small className="text-muted d-block">Nights</small>
                            <div className="font-weight-bold">{selectedRooms[0]?.nights || 1}</div>
                          </div>
                          <div>
                            <small className="text-muted d-block">Total Guests</small>
                            <div className="font-weight-bold">{searchData.total_guests}</div>
                          </div>
                          <div>
                            <small className="text-muted d-block">Total Rooms</small>
                            <div className="font-weight-bold">{selectedRooms.length}</div>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* Guest Information Card */}
                  <Col md={6}>
                    <Card>
                      <Card.Header>
                        <h6 className="mb-0">Guest Information</h6>
                      </Card.Header>
                      <Card.Body>
                        <div className="mb-3">
                          <small className="text-muted d-block">Full Name</small>
                          <div className="font-weight-bold">{guestData.customer_name}</div>
                        </div>

                        <div className="row mb-3">
                          <div className="col-6">
                            <small className="text-muted d-block">Email</small>
                            <div>{guestData.customer_email}</div>
                          </div>
                          <div className="col-6">
                            <small className="text-muted d-block">Phone</small>
                            <div>{guestData.customer_phone}</div>
                          </div>
                        </div>

                        <div className="row mb-3">
                          <div className="col-6">
                            <small className="text-muted d-block">Booking Source</small>
                            <div>
                              <Badge bg="secondary" className="text-capitalize">
                                {guestData.booking_source.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                          <div className="col-6">
                            <small className="text-muted d-block">Payment Status</small>
                            <div>
                              {guestData.payment_method ? (
                                <Badge bg="success" className="text-capitalize">
                                  Paid ({guestData.payment_method})
                                </Badge>
                              ) : (
                                <Badge bg="warning" className="text-capitalize">
                                  Pending Payment
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {guestData.special_requests && (
                          <div>
                            <small className="text-muted d-block">Special Requests</small>
                            <div className="border rounded p-2 bg-light mt-1">
                              {guestData.special_requests}
                            </div>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* Billing Summary Card */}
                  <Col md={12}>
                    <Card className="border-primary">
                      <Card.Header className="bg-primary text-white">
                        <h6 className="mb-0">Billing Summary</h6>
                      </Card.Header>
                      <Card.Body>
                        <div className="border rounded">
                          {/* Room Charges */}
                          {selectedRooms.map((room, index) => (
                            <div key={room._id} className="p-3 border-bottom">
                              <Row className="g-0 align-items-center">
                                <Col>
                                  <div className="d-flex align-items-center">
                                    <span className="me-2">•</span>
                                    <div>
                                      <small className="text-muted">Room {room.room_number}</small>
                                      <div className="small">
                                        {room.nights} nights × {process.env.REACT_APP_CURRENCY} {room.current_price.toFixed(2)}
                                      </div>
                                    </div>
                                  </div>
                                </Col>
                                <Col xs="auto" className="font-weight-bold">
                                  {process.env.REACT_APP_CURRENCY} {room.estimatedTotal.toFixed(2)}
                                </Col>
                              </Row>
                            </div>
                          ))}

                          {/* Subtotal */}
                          <div className="p-3 border-bottom">
                            <Row className="g-0">
                              <Col>
                                <small className="text-muted">Subtotal ({selectedRooms.length} room(s))</small>
                              </Col>
                              <Col xs="auto" className="font-weight-bold">
                                {process.env.REACT_APP_CURRENCY} {selectedRooms.reduce((sum, room) => sum + room.estimatedTotal, 0).toFixed(2)}
                              </Col>
                            </Row>
                          </div>

                          {/* Discount */}
                          {parseFloat(guestData.discount_amount) > 0 && (
                            <div className="p-3 border-bottom">
                              <Row className="g-0">
                                <Col>
                                  <small className="text-muted">Discount</small>
                                  {guestData.coupon_code && (
                                    <div className="small">Coupon: {guestData.coupon_code}</div>
                                  )}
                                </Col>
                                <Col xs="auto" className="text-danger font-weight-bold">
                                  -{process.env.REACT_APP_CURRENCY} {parseFloat(guestData.discount_amount).toFixed(2)}
                                </Col>
                              </Row>
                            </div>
                          )}

                          {/* Total */}
                          <div className="p-3 bg-light">
                            <Row className="g-0 align-items-center">
                              <Col>
                                <h5 className="mb-0">Total Amount</h5>
                                <small className="text-muted">Inclusive of all charges</small>
                              </Col>
                              <Col xs="auto">
                                <h4 className="mb-0 text-primary">
                                  {process.env.REACT_APP_CURRENCY} {(selectedRooms.reduce((sum, room) => sum + room.estimatedTotal, 0) - parseFloat(guestData.discount_amount || 0)).toFixed(2)}
                                </h4>
                              </Col>
                            </Row>
                          </div>
                        </div>

                        {/* Additional Notes */}
                        <div className="mt-3">
                          <small className="text-muted">
                            <CsLineIcons icon="info" className="me-1" size="12" />
                            Payment is due at check-in unless otherwise arranged. Cancellation policy applies.
                          </small>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                {/* Action Buttons */}
                <div className="d-flex justify-content-between mt-4">
                  <Button variant="outline-secondary" onClick={handleBack}>
                    <CsLineIcons icon="arrow-left" className="me-2" />
                    Back to Guest Details
                  </Button>

                  <div className="d-flex gap-2">
                    <Button
                      variant="outline-primary"
                      onClick={() => window.print()}
                    >
                      <CsLineIcons icon="print" className="me-2" />
                      Print Summary
                    </Button>

                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleConfirmBooking}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Spinner as="span" animation="border" size="sm" className="me-2" />
                          Creating Booking...
                        </>
                      ) : (
                        <>
                          <CsLineIcons icon="check" className="me-2" />
                          Confirm & Create Booking
                        </>
                      )}
                    </Button>
                  </div>
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
