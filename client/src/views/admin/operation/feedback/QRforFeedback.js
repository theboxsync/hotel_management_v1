import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from 'contexts/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { Button, Card, Row, Col, Alert, Spinner } from 'react-bootstrap';
import CsLineIcons from 'cs-line-icons/CsLineIcons';
import { toast } from 'react-toastify';
import HtmlHead from 'components/html-head/HtmlHead';
import BreadcrumbList from 'components/breadcrumb-list/BreadcrumbList';

const QRforFeedback = () => {
  const title = 'Feedback QR Code';
  const description = 'Generate and print feedback QR code';
  const breadcrumbs = [
    { to: '', text: 'Home' },
    { to: 'operations/feedback', text: 'Feedback' },
    { to: 'operations/qr-for-feedback', text: 'Feedback QR Code' },
  ];

  const [feedbackToken, setFeedbackToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copying, setCopying] = useState(false);
  const qrCodeRef = useRef(null);

  const { currentUser, userSubscriptions, activePlans } = useAuth();

  useEffect(() => {
    if (currentUser.feedbackToken) {
      setFeedbackToken(currentUser.feedbackToken);
    }
  }, [currentUser]);

  const generateFeedbackQR = async () => {
    // if (!activePlans.includes('Feedback')) {
    //   alert('You need to buy or renew to Feedback plan to access this page.');
    //   return;
    // }

    setGenerating(true);
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API}/feedback/generate-token`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setFeedbackToken(response.data.feedbackToken);
      toast.success('QR Code generated successfully!');
    } catch (error) {
      console.error('Error generating feedback token:', error);
      toast.error('Failed to generate feedback token. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const printQRCode = () => {
    const printContent = qrCodeRef.current.innerHTML;
    const newWindow = window.open('', '_blank');
    newWindow.document.write(`
          <html>
          <head>
            <title>Print QR Code</title>
            <style>
              body { text-align: center; font-family: Arial, sans-serif; }
              .qr-container { padding: 20px; }
              .qr-container h2 { font-size: 18px; margin-bottom: 10px; }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <h2 style="margin-bottom: 25px;">Scan the QR Code to Give Feedback</h2>
              ${printContent}
            </div>
          </body>
          </html>
        `);
    newWindow.document.close();
    newWindow.print();
    newWindow.close();
  };

  const copyToClipboard = async () => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(`${process.env.REACT_APP_HOME_URL}/feedback/${feedbackToken}`);
      toast.success('URL copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy URL');
    } finally {
      setTimeout(() => setCopying(false), 500);
    }
  };

  // Show loading state while checking user data
  if (loading) {
    return (
      <Row className="justify-content-center align-items-center min-vh-100">
        <Col xs={12} className="text-center">
          <Spinner animation="border" variant="primary" className="mb-3" />
          <h5>Loading QR Code Generator...</h5>
        </Col>
      </Row>
    );
  }

  // if (!activePlans.includes('Feedback')) {
  //   return (
  //     <Card className="mb-5">
  //       <Card.Body className="text-center">
  //         <CsLineIcons icon="blocked" className="text-danger" size={48} />
  //         <h4 className="mt-3">Feedback Plan Required</h4>
  //         <p className="text-muted">You need to purchase or renew the Feedback plan to access this feature.</p>
  //       </Card.Body>
  //     </Card>
  //   );
  // }

  return (
    <div className="workstation-container pb-5">
      <div className="container-fluid ps-lg-4 pe-lg-5">
        <HtmlHead title={title} description={description} />

        {/* Page title header */}
        <div className="page-title-container mb-4 mt-2 mt-lg-0">
          <Row className="g-3 align-items-center">
            <Col xs="12" md="7">
              <h1 className="mb-0 pb-0 display-4 fw-bold" style={{ color: '#23b3f4' }}>{title}</h1>
              <BreadcrumbList items={breadcrumbs} />
            </Col>
          </Row>
        </div>

        {/* Outer Card Wrapper */}
        <Card className="workstation-card border-0 mb-4 shadow-sm">
          <Card.Body className="p-4 text-center">
            {feedbackToken ? (
              <>
                <div className="mb-4">
                  <p className="text-muted mb-2">Scan the QR code to provide feedback:</p>
                  <div ref={qrCodeRef} className="mb-3 d-flex justify-content-center">
                    <QRCodeSVG size={250} value={`${process.env.REACT_APP_HOME_URL}/feedback/${feedbackToken}`} className="border rounded p-2 bg-white" />
                  </div>
                  <div className="small text-muted mb-3">Feedback URL: {`${process.env.REACT_APP_HOME_URL}/feedback/${feedbackToken}`}</div>
                </div>

                <div className="d-flex justify-content-center gap-2 mb-4">
                  <Button
                    className="btn-capsule btn-capsule-sm d-flex align-items-center gap-2"
                    onClick={printQRCode}
                    disabled={generating}
                  >
                    <CsLineIcons icon="print" size="18" />
                    Print QR Code
                  </Button>

                  <Button
                    className="btn-capsule btn-capsule-sm d-flex align-items-center gap-2"
                    onClick={copyToClipboard}
                    disabled={copying || generating}
                  >
                    {copying ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        Copying...
                      </>
                    ) : (
                      <>
                        <CsLineIcons icon="copy" size="18" />
                        Copy URL
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <Alert variant="info" className="mb-4">
                <CsLineIcons icon="info" className="me-2" />
                No feedback QR code generated yet. Click the button below to create one.
              </Alert>
            )}

            <p className="text-muted my-4">Generate a QR code that customers can scan to provide feedback about your service.</p>

            <Button
              onClick={generateFeedbackQR}
              disabled={generating}
              className="btn-capsule mb-4 px-5"
              style={{ minWidth: '220px', height: '48px' }}
            >
              {generating ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Generating QR Code...
                </>
              ) : (
                <>
                  <CsLineIcons icon="qr-code" className="me-2" />
                  {feedbackToken ? 'Generate New QR Code' : 'Create Feedback QR Code'}
                </>
              )}
            </Button>

            {/* Additional loading indicator for any async operations */}
            {generating && (
              <div className="mt-3">
                <Alert variant="light" className="d-inline-flex align-items-center">
                  <Spinner animation="border" size="sm" className="me-2" />
                  <small>Please wait while we generate your QR code...</small>
                </Alert>
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

export default QRforFeedback;