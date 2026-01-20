import React, { useState } from 'react';
import { useHistory, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from 'contexts/AuthContext';
import LayoutFullpage from 'layout/LayoutFullpage';
import HtmlHead from 'components/html-head/HtmlHead';

const Register = () => {
  const title = 'Register';
  const description = 'Register Page';

  const [step, setStep] = useState(1); // 1: Register, 2: Verify
  const [formData, setFormData] = useState({
    hotel_name: '',
    owner_name: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirm_password: '',
  });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, verifyEmail } = useAuth();
  const history = useHistory();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // Validation
    if (formData.password !== formData.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const result = await register(formData);

      if (result.success) {
        toast.success('Registration successful! Please check your email for OTP');
        setStep(2);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await verifyEmail(formData.email, otp);

      if (result.success) {
        toast.success('Email verified successfully! Please login');
        history.push('/login');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('An error occurred during verification');
    } finally {
      setLoading(false);
    }
  };

  const leftSide = (
    <div className="min-h-100 d-flex align-items-center">
      <div className="w-100 w-lg-75 w-xxl-50">
        {/* <div>
          <div className="mb-5">
            <h1 className="display-3 text-white">Multiple Niches</h1>
            <h1 className="display-3 text-white">Ready for Your Project</h1>
          </div>
          <p className="h6 text-white lh-1-5 mb-5">
            Dynamically target high-payoff intellectual capital for customized technologies. Objectively integrate emerging core competencies before
            process-centric communities...
          </p>
          <div className="mb-5">
            <Button size="lg" variant="outline-white" href="/">
              Learn More
            </Button>
          </div>
        </div> */}
      </div>
    </div>
  );

  const rightSide = (
    <div className="sw-lg-70 min-h-100 bg-foreground d-flex justify-content-center align-items-center shadow-deep py-5 full-page-content-right-border">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Hotel Management System</h1>
            <h2>{step === 1 ? 'Register Your Hotel' : 'Verify Email'}</h2>
          </div>

          {step === 1 ? (
            <form onSubmit={handleRegister} className="auth-form">
              <div className="form-group">
                <label htmlFor="hotel_name">Hotel Name *</label>
                <input
                  type="text"
                  id="hotel_name"
                  name="hotel_name"
                  value={formData.hotel_name}
                  onChange={handleChange}
                  required
                  placeholder="Enter hotel name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="owner_name">Owner Name *</label>
                <input
                  type="text"
                  id="owner_name"
                  name="owner_name"
                  value={formData.owner_name}
                  onChange={handleChange}
                  required
                  placeholder="Enter owner name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address *</label>
                <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required placeholder="Enter email address" />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number *</label>
                <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} required placeholder="+1234567890" />
              </div>

              <div className="form-group">
                <label htmlFor="address">Hotel Address *</label>
                <textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  placeholder="Enter complete hotel address"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password *</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Minimum 8 characters"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirm_password">Confirm Password *</label>
                <input
                  type="password"
                  id="confirm_password"
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  required
                  placeholder="Re-enter password"
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Registering...' : 'Register'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="auth-form">
              <div className="verification-info">
                <p>We've sent a 6-digit OTP to:</p>
                <p className="email-display">{formData.email}</p>
                <p className="note">Note: Check your console for OTP (email not configured)</p>
              </div>

              <div className="form-group">
                <label htmlFor="otp">Enter OTP *</label>
                <input
                  type="text"
                  id="otp"
                  name="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  placeholder="Enter 6-digit OTP"
                  maxLength="6"
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify Email'}
              </button>

              <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                Back to Registration
              </button>
            </form>
          )}

          <div className="auth-footer">
            <p>
              Already have an account? <Link to="/login">Login here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <HtmlHead title={title} description={description} />
      <LayoutFullpage left={leftSide} right={rightSide} />
    </>
  );
};

export default Register;
